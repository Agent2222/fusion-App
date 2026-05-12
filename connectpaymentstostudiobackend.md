# Connect Payments To Studio Backend

This handoff documents the member-facing Programs Payments implementation so a later Studio backend pass can add Staff/Admin payment management without rediscovering the data model.

## Current Member Payment Flow

- Settings Profile → Programs → Payments appears only for accepted program applicants.
- Approved users can pay a fixed deposit, make a recommended full payment, make manual payments toward the remaining balance, or start/cancel a Stripe-backed monthly payment plan.
- Deposit and full-payment confirmation cancel the existing platform membership subscription immediately through the integration API and mark the user as membership exempt.
- The frontend reads member payment state from `getMyProgramPaymentsJson()` and merges it with program records from `getPrograms()`.

## Backend Records

The Motoko backend stores three payment record groups:

- `ProgramPaymentSummary`: one row per `principal|programId`, including application id, deposit status, total due, paid total, outstanding balance, refunded total, active plan id, and update timestamp.
- `ProgramPaymentLedgerRow`: one row per verified Stripe payment intent, including principal, program id, application id, payment type, amount cents, currency, Stripe payment intent, Stripe charge, receipt URL, status, created date, and optional due date.
- `ProgramPaymentPlan`: one row per Stripe-backed payment plan, including principal, program id, application id, Stripe subscription/schedule ids, installment count, installment amount, currency, status, start/end dates, and timestamps.

Relevant backend APIs:

- `getMyProgramPaymentsJson()`: member-facing JSON state for approved program payments.
- `integrationRecordProgramPayment(...)`: integration-only ledger write after Stripe verification.
- `integrationMarkProgramDepositAccepted(...)`: integration-only exemption/deposit-state update after deposit or full payment.
- `integrationActivateProgramPaymentPlan(...)`: integration-only active plan write.
- `integrationCancelProgramPaymentPlan(...)`: integration-only plan cancellation update.

## Integration API Endpoints

The integration API owns Stripe verification and should remain the only off-chain writer for payment state:

- `POST /stripe/program-payment-intent`: creates one-time PaymentIntents for `deposit`, `full_payment`, and `manual`.
- `POST /stripe/program-payment-confirmed`: verifies a succeeded PaymentIntent, writes the canister ledger, and handles deposit/full-payment exemption logic.
- `POST /stripe/program-payment-plan`: creates a Stripe subscription for monthly installments and returns the first invoice PaymentIntent client secret.
- `POST /stripe/program-payment-plan-cancel`: cancels the Stripe subscription and updates backend plan state.
- `POST /stripe/program-payment-receipts`: resolves Stripe receipt URLs for payment intents.

## Future Studio Surfaces

Recommended Staff/Admin screens:

- Applicants table: add payment status badges for accepted applicants (`Deposit due`, `Deposit paid`, `Plan active`, `Paid in full`, `Past due` when supported).
- Finance section: replace the current placeholder with a confirmed program users list grouped by program and payment state.
- Payment detail drawer: show applicant identity, program, Stripe customer/payment links, summary totals, ledger rows, plan details, upcoming installments, and staff notes.
- Program manage modal: add structured finance fields so payments stop depending on parsing `depositAmountDisplay`.
- User manage modal: show program-payment exemption source and linked program payment records next to membership status.

## Finance Data Staff Need

Each Staff/Admin view should expose:

- principal, applicant id, applicant name/email, program id/name,
- deposit amount, total program fee, total paid, outstanding balance, refunded total,
- active plan id, Stripe subscription/schedule id, installment count, installment amount,
- ledger rows with payment type, status, amount, created date, Stripe payment intent id, charge id, and receipt URL,
- membership exemption state and whether platform subscription cancellation succeeded,
- immutable audit timestamps and staff-visible reconciliation notes.

## Follow-Up Requirements

- Add structured program finance fields in Studio Programs: `depositAmountCents`, `totalProgramFeeCents`, `currency`, `paymentDueDate`, and refund/deposit policy text.
- Add admin query APIs for all program payment summaries and ledgers, filtered by program/status.
- Add staff notes/audit trail separately from immutable Stripe ledger rows.
- Decide whether refunds remain display-only or become Staff/Admin actions.
- Add reconciliation export, likely CSV first, for finance review.
