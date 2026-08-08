/**
 * Program Draw ($50) payment confirmation — applicant + CC info@fusionart.world.
 * Sent on successful PayPal capture (before II / enter) so guests still get a receipt.
 */

const INFO_CC = 'info@fusionart.world';

/**
 * @param {unknown} value
 * @param {number} [max]
 */
function clip(value, max = 500) {
    return String(value ?? '')
        .trim()
        .slice(0, max);
}

/**
 * @param {unknown} value
 */
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {number} cents
 */
function formatUsd(cents) {
    const n = Math.max(0, Math.round(Number(cents) || 0)) / 100;
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/**
 * @param {string} programId
 */
function programLabelFromId(programId) {
    const id = clip(programId, 120);
    if (!id) return 'Program Draw';
    if (/^fusion/i.test(id)) {
        return id.replace(/^fusion/i, 'FUSION ').replace(/([a-z])([A-Z])/g, '$1 $2');
    }
    return id;
}

/**
 * @param {unknown} payloadJson
 * @returns {Record<string, string>}
 */
export function parseAwardPayloadFields(payloadJson) {
    /** @type {Record<string, string>} */
    const out = {
        firstName: '',
        lastName: '',
        email: '',
        country: '',
        stateProvince: '',
        city: '',
        website: '',
        bioStatement: '',
    };
    let raw = payloadJson;
    if (typeof raw === 'string' && raw.trim()) {
        try {
            raw = JSON.parse(raw);
        } catch {
            return out;
        }
    }
    if (!raw || typeof raw !== 'object') return out;
    const o = /** @type {Record<string, unknown>} */ (raw);
    for (const key of Object.keys(out)) {
        out[key] = clip(o[key], key === 'bioStatement' ? 4000 : 500);
    }
    return out;
}

/**
 * @param {Record<string, string>} merged pending + override meta
 */
export function isProgramAwardEntryMeta(merged) {
    const paymentType = clip(merged?.paymentType, 80);
    const purpose = clip(merged?.purpose, 80);
    const applicationId = clip(merged?.applicationId, 240);
    return (
        paymentType === 'program_award_entry' ||
        purpose === 'program_award_entry' ||
        applicationId.startsWith('award:')
    );
}

/**
 * @param {{
 *   programId?: string,
 *   programName?: string,
 *   orderId?: string,
 *   amountCents?: number,
 *   paidAt?: string,
 *   fields?: Record<string, string>,
 *   awaitingAccountLink?: boolean,
 * }} details
 */
export function buildProgramAwardPaymentConfirmationContent(details) {
    const fields = details.fields || {};
    const firstName = clip(fields.firstName, 80) || 'there';
    const lastName = clip(fields.lastName, 80);
    const fullName = `${clip(fields.firstName)} ${lastName}`.trim() || '—';
    const email = clip(fields.email, 320) || '—';
    const programId = clip(details.programId, 120);
    const programName =
        clip(details.programName, 160) || programLabelFromId(programId) || 'Program Draw';
    const orderId = clip(details.orderId, 120) || '—';
    const paidAt = clip(details.paidAt, 40) || new Date().toISOString();
    const amount = formatUsd(details.amountCents ?? 5000);
    const location = [clip(fields.city), clip(fields.stateProvince), clip(fields.country)]
        .filter(Boolean)
        .join(', ');
    const website = clip(fields.website, 500) || '—';
    const bio = clip(fields.bioStatement, 4000) || '—';
    const accountNote = details.awaitingAccountLink
        ? 'If you still need to finish creating or linking your Fusion account (Internet Identity), please complete that step when prompted so we can attach this payment to your entry.'
        : 'Your payment is recorded for this Program Draw entry. Keep this email for your records.';

    const subject = `Program Draw payment received — ${programName}`;

    const text = [
        `Hi ${firstName},`,
        '',
        `Thank you — we received your ${amount} Program Draw payment for ${programName}.`,
        '',
        'Your payment confirms your place in the Program Draw for this round. In some cases the draw will be processed within the day it is submitted.',
        '',
        accountNote,
        '',
        'Payment details',
        `Program: ${programName}${programId ? ` (${programId})` : ''}`,
        `Amount: ${amount}`,
        `PayPal order: ${orderId}`,
        `Paid at: ${paidAt}`,
        '',
        'Application information',
        `Name: ${fullName}`,
        `Email: ${email}`,
        `Location: ${location || '—'}`,
        `Website: ${website}`,
        `Bio / statement:`,
        bio,
        '',
        'Questions? Reply to this email or contact info@fusionart.world.',
        '',
        '— Fusion Team',
    ].join('\n');

    const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 28px 44px;background:#fff;color:#111;line-height:1.5">
<div style="text-align:center;margin:0 0 32px;padding:0 0 8px">
<img src="https://fusionart.world/email/Fusion-X-logo-02.png" alt="Fusion" width="220" height="auto" style="display:inline-block;max-width:100%;height:auto;border:0" />
</div>
<div style="margin:0 0 34px;padding:0">
<h1 style="font-size:22px;line-height:1.18;margin:0 0 14px">Program Draw payment received</h1>
<p style="margin:0 0 14px">Hi ${escapeHtml(firstName)},</p>
<p style="margin:0 0 14px">Thank you — we received your <strong>${escapeHtml(amount)}</strong> Program Draw payment for <strong>${escapeHtml(programName)}</strong>.</p>
<p style="margin:0 0 14px">Your payment confirms your place in the Program Draw for this round. <strong>In some cases the draw will be processed within the day it is submitted.</strong></p>
<p style="margin:0 0 18px">${escapeHtml(accountNote)}</p>
<div style="margin:18px 0;padding:16px;border:1px solid #e5e2df;border-radius:10px;background:#fafafa">
  <p style="margin:0 0 8px"><strong>Payment details</strong></p>
  <p style="margin:0 0 6px"><strong>Program:</strong> ${escapeHtml(programName)}${programId ? ` (${escapeHtml(programId)})` : ''}</p>
  <p style="margin:0 0 6px"><strong>Amount:</strong> ${escapeHtml(amount)}</p>
  <p style="margin:0 0 6px"><strong>PayPal order:</strong> ${escapeHtml(orderId)}</p>
  <p style="margin:0"><strong>Paid at:</strong> ${escapeHtml(paidAt)}</p>
</div>
<div style="margin:18px 0;padding:16px;border:1px solid #e5e2df;border-radius:10px;background:#fafafa">
  <p style="margin:0 0 8px"><strong>Application information</strong></p>
  <p style="margin:0 0 6px"><strong>Name:</strong> ${escapeHtml(fullName)}</p>
  <p style="margin:0 0 6px"><strong>Email:</strong> ${escapeHtml(email)}</p>
  <p style="margin:0 0 6px"><strong>Location:</strong> ${escapeHtml(location || '—')}</p>
  <p style="margin:0 0 6px"><strong>Website:</strong> ${escapeHtml(website)}</p>
  <p style="margin:0 0 6px"><strong>Bio / statement:</strong></p>
  <p style="margin:0;white-space:pre-wrap">${escapeHtml(bio)}</p>
</div>
<p style="margin:0">Questions? Reply to this email or contact <a href="mailto:info@fusionart.world" style="color:#000">info@fusionart.world</a>.</p>
</div>
<div style="margin:0;padding:32px 0 0;border-top:1px solid #e5e2df;color:#111">
<p style="margin:0">— Fusion Team</p>
</div>
</div>`;

    return { subject, text, html, applicantEmail: email.includes('@') ? email : '' };
}

/**
 * @param {object} details
 * @param {{ resend: import('resend').Resend | null, from: string, logoRewrite?: (html: string) => string }} deps
 * @returns {Promise<{ ok: boolean, reason?: string, id?: string }>}
 */
export async function sendProgramAwardPaymentConfirmationEmails(details, deps) {
    const { resend, from, logoRewrite } = deps;
    if (!resend) return { ok: false, reason: 'resend_not_configured' };
    if (!from) return { ok: false, reason: 'missing_from' };

    const content = buildProgramAwardPaymentConfirmationContent(details);
    const to = clip(details.applicantEmail || content.applicantEmail, 320);
    if (!to.includes('@')) return { ok: false, reason: 'missing_applicant_email' };

    const html = typeof logoRewrite === 'function' ? logoRewrite(content.html) : content.html;
    const cc = to.toLowerCase() === INFO_CC ? undefined : [INFO_CC];

    const { data, error } = await resend.emails.send({
        from,
        to: [to],
        ...(cc ? { cc } : {}),
        subject: clip(content.subject, 998),
        html,
        text: content.text,
    });
    if (error) {
        return { ok: false, reason: error.message || 'resend_error' };
    }
    return { ok: true, id: data?.id || '' };
}

/**
 * Send once per pending payment ref (dedupe via awardPaymentEmailSent).
 * Best-effort: never throws.
 *
 * @param {{
 *   metaRef?: string,
 *   merged: Record<string, string>,
 *   orderId: string,
 *   amountCents?: number,
 *   captureId?: string,
 *   awaitingAccountLink?: boolean,
 *   patchPending?: (ref: string, patch: Record<string, string>) => Promise<void>,
 *   resend: import('resend').Resend | null,
 *   from: string,
 *   logoRewrite?: (html: string) => string,
 * }} opts
 * @returns {Promise<{ awardPaymentEmailSent: boolean, skipped?: boolean, reason?: string }>}
 */
export async function maybeSendProgramAwardPaymentConfirmationAfterCapture(opts) {
    const merged = opts.merged && typeof opts.merged === 'object' ? opts.merged : {};
    if (!isProgramAwardEntryMeta(merged)) {
        return { awardPaymentEmailSent: false, skipped: true, reason: 'not_award_entry' };
    }
    if (String(merged.awardPaymentEmailSent || '').toLowerCase() === 'true') {
        return { awardPaymentEmailSent: true, skipped: true, reason: 'already_sent' };
    }

    const fields = parseAwardPayloadFields(merged.payloadJson);
    const applicantEmail =
        clip(merged.applicantEmail, 320) ||
        clip(fields.email, 320) ||
        '';
    if (fields.email && !fields.email.includes('@') && applicantEmail.includes('@')) {
        fields.email = applicantEmail;
    }
    if (!fields.firstName && merged.applicantName) {
        const parts = clip(merged.applicantName, 160).split(/\s+/);
        fields.firstName = parts[0] || '';
        fields.lastName = parts.slice(1).join(' ');
    }

    const amountCents = Math.max(
        0,
        Math.round(Number(opts.amountCents ?? merged.amountCents ?? 5000) || 5000),
    );
    const paidAt = clip(merged.capturedAt, 40) || new Date().toISOString();

    try {
        const result = await sendProgramAwardPaymentConfirmationEmails(
            {
                applicantEmail,
                programId: clip(merged.programId, 120),
                orderId: clip(opts.orderId, 120),
                amountCents,
                paidAt,
                fields,
                awaitingAccountLink: Boolean(opts.awaitingAccountLink),
            },
            {
                resend: opts.resend,
                from: opts.from,
                logoRewrite: opts.logoRewrite,
            },
        );
        if (!result.ok) {
            console.warn(
                '[paypal] program award payment confirmation email skipped:',
                result.reason,
                opts.orderId,
            );
            return { awardPaymentEmailSent: false, reason: result.reason };
        }

        if (opts.metaRef && typeof opts.patchPending === 'function') {
            try {
                await opts.patchPending(opts.metaRef, {
                    ...merged,
                    awardPaymentEmailSent: 'true',
                    awardPaymentEmailSentAt: new Date().toISOString(),
                    ...(opts.captureId
                        ? { captureId: clip(opts.captureId, 120) }
                        : {}),
                });
            } catch (e) {
                console.warn(
                    '[paypal] failed to mark awardPaymentEmailSent on pending:',
                    e instanceof Error ? e.message : e,
                );
            }
        }
        return { awardPaymentEmailSent: true };
    } catch (e) {
        console.warn(
            '[paypal] program award payment confirmation email failed:',
            e instanceof Error ? e.message : e,
        );
        return {
            awardPaymentEmailSent: false,
            reason: e instanceof Error ? e.message : String(e),
        };
    }
}
