/** Minimal Candid interface for fusion-app-backend (integration service only). */
export const idlFactory = ({ IDL }) => {
    const MembershipAccessResult = IDL.Variant({
        noAccount: IDL.Null,
        exempt: IDL.Null,
        ok: IDL.Null,
        needsSubscription: IDL.Null,
    });
    const ProgramPaymentLedgerRow = IDL.Record({
        id: IDL.Text,
        principal: IDL.Principal,
        programId: IDL.Text,
        applicationId: IDL.Text,
        paymentType: IDL.Text,
        amountCents: IDL.Nat,
        currency: IDL.Text,
        stripePaymentIntentId: IDL.Text,
        stripeChargeId: IDL.Text,
        stripeReceiptUrl: IDL.Text,
        status: IDL.Text,
        createdAt: IDL.Text,
        dueAt: IDL.Opt(IDL.Text),
    });
    const ProgramPaymentPlan = IDL.Record({
        id: IDL.Text,
        principal: IDL.Principal,
        programId: IDL.Text,
        applicationId: IDL.Text,
        stripeSubscriptionId: IDL.Text,
        stripeScheduleId: IDL.Text,
        installmentCount: IDL.Nat,
        installmentAmountCents: IDL.Nat,
        currency: IDL.Text,
        status: IDL.Text,
        startAt: IDL.Text,
        endAt: IDL.Text,
        createdAt: IDL.Text,
        updatedAt: IDL.Text,
    });
    const ProgramRecord = IDL.Record({
        id: IDL.Text,
        routeLink: IDL.Text,
        featuredOrder: IDL.Nat,
        visibility: IDL.Text,
        studioStatus: IDL.Text,
        updatedAt: IDL.Text,
        depositAmountDisplay: IDL.Text,
        localesJson: IDL.Text,
    });
    return IDL.Service({
        integrationGetMembershipAccessForPrincipal: IDL.Func(
            [IDL.Principal],
            [MembershipAccessResult],
            ['query'],
        ),
        integrationRecordStripeSubscription: IDL.Func(
            [IDL.Principal, IDL.Opt(IDL.Text), IDL.Opt(IDL.Text), IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)],
            [],
            [],
        ),
        integrationGetProgram: IDL.Func(
            [IDL.Text],
            [IDL.Opt(ProgramRecord)],
            ['query'],
        ),
        integrationGetArtistConfirmationName: IDL.Func(
            [IDL.Principal],
            [IDL.Opt(IDL.Text)],
            ['query'],
        ),
        integrationSetProgramLocalesJson: IDL.Func(
            [IDL.Text, IDL.Text, IDL.Text],
            [],
            [],
        ),
        integrationRecordProgramPayment: IDL.Func(
            [ProgramPaymentLedgerRow, IDL.Nat, IDL.Nat, IDL.Nat, IDL.Bool, IDL.Nat],
            [],
            [],
        ),
        integrationMarkProgramDepositAccepted: IDL.Func(
            [IDL.Principal, IDL.Text, IDL.Text, IDL.Text, IDL.Text],
            [],
            [],
        ),
        integrationActivateProgramPaymentPlan: IDL.Func(
            [ProgramPaymentPlan, IDL.Nat, IDL.Nat],
            [],
            [],
        ),
        integrationCancelProgramPaymentPlan: IDL.Func(
            [IDL.Text, IDL.Text, IDL.Text],
            [],
            [],
        ),
    });
};
