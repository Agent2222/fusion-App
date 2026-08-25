/**
 * Studio — email to a program applicant (Integration API + LLM + templates in localStorage).
 */
import { getPublicSiteOrigin } from '../../config.js';
import { getDataSource, getPrograms, studioReinterpretWithPrompt, appendApplicantEmailOutreachStudio, getApplicantEmailOutreachForStudio, applicantEmailOutreachApiAvailable, clearApplicantEmailOutreachStudio, staffGetApplicantFlightBooking } from '../../utils/database.js';
import { openStudioModal } from '../../utils/studioModal.js';
import { getIntegrationBaseUrl, sendEmail } from '../../utils/integrationApi.js';
import { wrapEmailHtml } from '../../utils/emailCampaignTemplates.js';
import { buildProgramRunSidebarDateLines } from '../../utils/programSidebarRunDates.js';
import { formatStudioDateWithTitle } from '../../utils/studioDateFormat.js';
import { formatUsdFromCents } from '../../utils/programPaymentMoney.js';
import {
    buildStudioEmailCcList,
    populateStudioEmailCcSelect,
    readStudioEmailCcTeamEmail,
    recordStudioEmailOutbound,
    studioEmailCcSelectHtml,
} from '../../utils/studioEmailCc.js';

const LLM_COMBINED_MAX = 12000;

const LS_TEMPLATES = 'fusion-studio-applicant-email-templates';
const DRAFT_PREFIX = 'fusion-studio-applicant-email-draft:';
const APPROVED_TEMPLATE_ID = 'tpl-applicant-approved-invitation';
const SLOT_NUDGE_TEMPLATE_ID = 'tpl-applicant-secure-slot-nudge';
const REMAINING_BALANCE_TEMPLATE_ID = 'tpl-applicant-remaining-balance';
const FLIGHT_INFO_TEMPLATE_ID = 'tpl-applicant-flight-info';

/**
 * @param {string} displayName
 * @param {string} [roleLine]
 * @returns {string}
 */
function buildApplicantSignatureHtml(displayName, roleLine) {
    const roleBlock = roleLine
        ? `\n<p style="margin:0;color:#333">${roleLine}</p>\n`
        : '\n';
    return `<div style="padding-top:22px;">

<p style="margin:0 0 6px">Best Regards,</p>
<p style="margin:0 0 4px;font-weight:700">${displayName}</p>${roleBlock}
    <img src="https://fusionart.world/email/Fusion-Logo-Sig-1.png" alt="Fusion" width="110" style="display:block;margin-bottom:16px;border:0">

    <p style="margin:0 0 8px;font-size:13px;">
      <a href="https://www.fusionart.world" style="color:#000000;text-decoration:none;border-bottom:1px solid #000000;">
        fusionart.world
      </a>
    </p>

    <p style="margin:0;font-size:12px;color:#4a4a4a;letter-spacing:0.05em;">
      IG: @fusion_intl &nbsp;/&nbsp; TT: @fusion_intl &nbsp;/&nbsp; YT: @fusionartworld
    </p>

  </div>`;
}

const APPLICANT_DEFAULT_SIGNATURE_HTML = buildApplicantSignatureHtml(
    'Zoia Amadi',
    'Communications Director at Fusion Intl.',
);
const ZOIA_APPROVAL_SIGNATURE_HTML = APPLICANT_DEFAULT_SIGNATURE_HTML;
const FUSION_TEAM_SIGNATURE_HTML = buildApplicantSignatureHtml('Fusion Team');
const AKARI_SIGNATURE_HTML = buildApplicantSignatureHtml(
    'Akari Koizumi',
    'Events Coordinator / Interpreter',
);
const STARR_SIGNATURE_HTML = buildApplicantSignatureHtml('Starr Oge', 'Founding Director');
const APPLICANT_SIGNATURES = [
    { id: 'zoia', label: 'Zoia Amadi', html: APPLICANT_DEFAULT_SIGNATURE_HTML },
    { id: 'fusion-team', label: 'Fusion Team', html: FUSION_TEAM_SIGNATURE_HTML },
    { id: 'akari', label: 'Akari Koizumi', html: AKARI_SIGNATURE_HTML },
    { id: 'starr', label: 'Starr Oge', html: STARR_SIGNATURE_HTML },
];

/**
 * @param {string} applicantId
 * @returns {string}
 */
export function applicantEmailDraftKey(applicantId) {
    return DRAFT_PREFIX + String(applicantId || '').trim();
}

/**
 * @param {string} s
 */
function escapeHtmlText(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {string} plain
 */
function plainBodyToEmailHtml(plain) {
    const esc = escapeHtmlText(plain);
    return `<div style="font-size:15px;line-height:1.55;color:#0f172a;white-space:pre-wrap;word-wrap:break-word">${esc}</div>`;
}

/**
 * @param {Record<string, string>} vars
 * @param {string} t
 */
function applyTemplateVars(t, vars) {
    let out = String(t ?? '');
    for (const [k, v] of Object.entries(vars)) {
        out = out.split(`{{${k}}}`).join(v);
    }
    return out;
}

/**
 * @param {string} name
 */
function applicantFirstName(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed || trimmed.toLowerCase() === 'there') return 'there';
    return trimmed.split(/\s+/).filter(Boolean)[0] || trimmed;
}

function profileProgramsUrl() {
    return `${getPublicSiteOrigin()}/settings/profile`;
}

/**
 * @param {{ sentAt?: string, subject?: string, templateId?: string, templateName?: string }[]} entries
 * @param {{ unavailable?: boolean }} [opts]
 * @returns {string}
 */
function renderOutreachHistoryHtml(entries, opts = {}) {
    if (opts.unavailable) {
        return '<p class="studio-applicant-email-composer__hint">Correspondence log is unavailable until the backend is deployed and <code class="studio-code-inline">dfx generate fusion-app-backend</code> is run.</p>';
    }
    const sorted = [...(entries || [])].sort((a, b) =>
        String(a.sentAt || '').localeCompare(String(b.sentAt || '')),
    );
    if (!sorted.length) {
        return '<p class="studio-applicant-email-composer__hint">No emails logged yet.</p>';
    }
    return `<ol class="studio-applicant-email-composer__outreach-list">${sorted
        .map((e) => {
            const { label, title } = formatStudioDateWithTitle(e.sentAt);
            const tpl = escapeHtmlText(e.templateName || 'Manual');
            const subj = escapeHtmlText(e.subject || '—');
            return `<li><span class="studio-applicant-email-composer__outreach-date" title="${escapeHtmlText(title)}">${escapeHtmlText(label)}</span> <strong>${tpl}</strong> <span class="studio-applicant-email-composer__outreach-subject">${subj}</span></li>`;
        })
        .join('')}</ol>`;
}

/**
 * @returns {{ id: string, name: string, subject: string, body: string, signatureHtml?: string, signatureKey?: string, builtIn?: boolean }[]}
 */
function builtInApplicantTemplates() {
    return [
        {
            id: APPROVED_TEMPLATE_ID,
            name: 'Approved applicant invitation',
            subject: 'Fusion {{programLocation}} Program invitation',
            signatureHtml: ZOIA_APPROVAL_SIGNATURE_HTML,
            signatureKey: 'zoia',
            builtIn: true,
            body: `Hi {{firstName}},

It was a pleasure meeting you and hearing more about your work and the inspiration behind it. We reviewed your application and are thrilled to extend an invitation for the upcoming Fusion {{programLocation}} Program from {{programStartDate}} to {{programEndDate}}.

Please see below for next steps. Spots are first come, first served, so submit your deposit or full payment to secure your spot in the program.

Next steps:
1. Sign in to Fusion.
2. Visit your Settings Profile page: {{profileProgramsUrl}}
3. Open Programs, then select the Payments tab.
4. Select the accepted {{programLocation}} program.
5. Submit your deposit or full payment to secure your position.

After your payment is submitted, we will follow up with confirmation and future onboarding details.`,
        },
        {
            id: SLOT_NUDGE_TEMPLATE_ID,
            name: 'Secure your Fusion program slot',
            subject: 'Secure your Fusion {{programLocation}} Program slot',
            signatureHtml: FUSION_TEAM_SIGNATURE_HTML,
            signatureKey: 'fusion-team',
            builtIn: true,
            body: `Hi {{firstName}},

We are excited to move forward with your invitation to the Fusion {{programLocation}} Program from {{programStartDate}} to {{programEndDate}}.

Your application has been approved, and the final step to secure your spot is submitting your deposit or full payment. Spots are first come, first served, so we recommend completing this as soon as possible.

Next steps:
1. Sign in to Fusion.
2. Visit your Settings Profile page: {{profileProgramsUrl}}
3. Open Programs, then select the Payments tab.
4. Select the accepted {{programLocation}} program.
5. Submit your deposit or full payment to secure your position.

Once your payment is submitted, our team will follow up with confirmation and onboarding details.`,
        },
        {
            id: REMAINING_BALANCE_TEMPLATE_ID,
            name: 'Remaining balance reminder',
            subject: 'Fusion {{programLocation}} Program — remaining balance',
            signatureHtml: FUSION_TEAM_SIGNATURE_HTML,
            signatureKey: 'fusion-team',
            builtIn: true,
            body: `Hi {{firstName}},

This is a friendly reminder about your remaining balance for the Fusion {{programLocation}} Program ({{programStartDate}} – {{programEndDate}}).

Program balance: {{programBalance}}
Total paid to date: {{totalPaid}}
Remaining balance: {{remainingBalance}}

Please sign in and complete your payment when you are ready:

1. Sign in to Fusion.
2. Visit your Settings Profile page: {{profileProgramsUrl}}
3. Open Programs, then select the Payments tab.
4. Select the {{programLocation}} program and submit your remaining balance.

If you have questions about your balance or payment plan, reply to this email and our team will help.`,
        },
        {
            id: FLIGHT_INFO_TEMPLATE_ID,
            name: 'Flight information',
            subject: 'Fusion {{programLocation}} Program — your flight information',
            signatureHtml: FUSION_TEAM_SIGNATURE_HTML,
            signatureKey: 'fusion-team',
            builtIn: true,
            body: `Hi {{firstName}},

We are writing to share your flight details for the Fusion {{programLocation}} Program ({{programStartDate}} – {{programEndDate}}).

Flight details:
Airline: {{flightAirline}}
Confirmation number: {{flightConfirmation}}
Manage your booking: {{flightAirlineUrl}}

Please review your flight details above. You can manage your booking directly through your airline's website using the confirmation number provided.

You can also view your flight information anytime by signing in to Fusion, visiting your Settings Profile page, opening the Programs section, and selecting the Travel tab.

One thing we need from you: please add your estimated arrival date and time in the Travel tab so that our team can coordinate and stay up to date with your arrival in case anything changes.

If anything looks incorrect or you have questions about your travel, reply to this email and our team will assist you.

We look forward to seeing you in {{programLocation}}.`,
        },
        {
            id: 'tpl-default-schedule',
            name: 'Schedule meeting',
            subject: '[Fusion] Program application — {{programId}}',
            signatureKey: 'zoia',
            builtIn: true,
            body: `Hello {{fullName}},

We would like to schedule a meeting to discuss your application for program {{programId}}.

Please select a meeting slot through the link below.
https://calendly.com/fusionart/30min`,
        },
        {
            id: 'tpl-default-confirmation',
            name: 'Application received',
            subject: '[Fusion] Program application — {{programId}}',
            signatureKey: 'zoia',
            builtIn: true,
            body: `Hello {{fullName}},

This confirms we have received your application for program {{programId}}.

We will be in touch with next steps.`,
        },
    ];
}

function readTemplates() {
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = localStorage.getItem(LS_TEMPLATES);
        if (!raw) {
            return [];
        }
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return [];
        return arr
            .filter((x) => x && typeof x === 'object' && x.id && x.name)
            .map((x) => ({
                id: String(x.id),
                name: String(x.name),
                subject: String(x.subject ?? ''),
                body: String(x.body ?? ''),
                signatureHtml: typeof x.signatureHtml === 'string' ? x.signatureHtml : undefined,
                builtIn: false,
            }));
    } catch {
        return [];
    }
}

/**
 * @returns {{ id: string, name: string, subject: string, body: string, signatureHtml?: string, signatureKey?: string, builtIn?: boolean }[]}
 */
function seedDefaultTemplates() {
    return builtInApplicantTemplates();
}

/**
 * @param {{ id: string, name: string, subject: string, body: string }[]} list
 */
function writeTemplates(list) {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(LS_TEMPLATES, JSON.stringify(list));
    } catch {
        /* ignore */
    }
}

/**
 * @param {string} programId
 */
function programFallbackTitle(programId) {
    return String(programId || 'upcoming program').trim() || 'upcoming program';
}

function nonEmptyString(...values) {
    for (const value of values) {
        const text = String(value ?? '').trim();
        if (text) return text;
    }
    return '';
}

/**
 * @param {Record<string, unknown>} program
 */
function extractProgramTemplateInfo(program) {
    const en = program?.enCard && typeof program.enCard === 'object' ? program.enCard : {};
    const pp =
        en.programPage && typeof en.programPage === 'object'
            ? /** @type {Record<string, unknown>} */ (en.programPage)
            : {};
    const programLocation = String(en.location || en.place || pp.location || en.headline || en.focus || '').trim();
    const run = {
        ...en,
        startDate: nonEmptyString(en.startDate, en.start, en.programStart, pp.startDate),
        endDate: nonEmptyString(en.endDate, en.end, en.programEnd, pp.endDate),
        year: nonEmptyString(en.year, pp.year),
    };
    const dateLines = buildProgramRunSidebarDateLines(run, 'en');
    const programStartDate = nonEmptyString(dateLines?.start, run.startDate);
    const programEndDate = nonEmptyString(dateLines?.end, run.endDate);
    const programDate =
        programStartDate && programEndDate
            ? `${programStartDate} to ${programEndDate}`
            : nonEmptyString(programStartDate, programEndDate, pp.runDates, en.runDates, en.year);
    return {
        programLocation,
        programDate,
        programStartDate: programStartDate || programDate,
        programEndDate: programEndDate || programDate,
    };
}

/**
 * @param {object} row — applicant row
 * @param {{ onSent?: () => void | Promise<void>, canClearCorrespondence?: boolean, financeContext?: object, preferTemplateId?: string }} [opts]
 */
export async function openApplicantEmailModal(row, opts = {}) {
    const { onSent, canClearCorrespondence = false, financeContext, preferTemplateId } = opts;
    const applicantId = String(row?.id ?? '').trim();
    const toEmail = String(row?.email ?? '').trim();
    const toValid = toEmail.toLowerCase().includes('@');
    const fullName = String(row?.fullName || 'there').trim() || 'there';
    const firstName = applicantFirstName(fullName);
    const programId = String(row?.programId || '').trim();
    const isAccepted = String(row?.status || '').toLowerCase() === 'accepted';
    let programLocation = programFallbackTitle(programId);
    let programDate = 'upcoming program date';
    let programStartDate = 'upcoming program date';
    let programEndDate = 'upcoming program date';
    try {
        const programs = await getPrograms();
        const program = (programs || []).find((p) => String(p?.id || '') === programId);
        if (program) {
            const info = extractProgramTemplateInfo(/** @type {Record<string, unknown>} */ (program));
            programLocation = info.programLocation || programLocation;
            programDate = info.programDate || programDate;
            programStartDate = info.programStartDate || programStartDate;
            programEndDate = info.programEndDate || programEndDate;
        }
    } catch {
        /* keep fallbacks */
    }
    let flightAirline = '';
    let flightConfirmation = '';
    let flightAirlineUrl = '';
    try {
        const booking = await staffGetApplicantFlightBooking(applicantId);
        if (booking) {
            flightAirline = String(booking.airline || '').trim();
            flightConfirmation = String(booking.confirmationNumber || '').trim();
            flightAirlineUrl = String(booking.airlineWebsite || '').trim();
        }
    } catch { /* keep empty defaults */ }

    const vars = {
        firstName,
        fullName,
        programId,
        programLocation,
        programDate,
        programStartDate,
        programEndDate,
        profileProgramsUrl: profileProgramsUrl(),
        email: toEmail,
        remainingBalance: formatUsdFromCents(financeContext?.remainingBalanceCents ?? 0),
        totalPaid: formatUsdFromCents(financeContext?.totalPaymentsCents ?? 0),
        programBalance: formatUsdFromCents(financeContext?.priceCategoryCents ?? 0),
        flightAirline: flightAirline || '(not yet entered)',
        flightConfirmation: flightConfirmation || '(not yet entered)',
        flightAirlineUrl: flightAirlineUrl || '(not yet entered)',
    };

    const financeMeta =
        financeContext && typeof financeContext === 'object'
            ? `<div><dt>Remaining balance</dt><dd>${escapeHtmlText(vars.remainingBalance)}</dd></div>
          <div><dt>Total paid</dt><dd>${escapeHtmlText(vars.totalPaid)}</dd></div>`
            : '';

    const title = 'Email applicant';
    const initialOutreach = Array.isArray(row?.emailOutreach) ? row.emailOutreach : [];

    const inner = `
<div class="studio-applicant-email-composer">
  <div class="studio-applicant-email-composer__layout" role="group" aria-label="Applicant email composer">
    <aside class="studio-applicant-email-composer__rail" aria-label="Applicant and templates">
      <section class="studio-applicant-email-composer__card studio-applicant-email-composer__applicant-card">
        <p class="studio-applicant-email-composer__eyebrow">Applicant</p>
        <h3>${escapeHtmlText(fullName)}</h3>
        <p class="studio-individual-email__to">To: ${toValid ? escapeHtmlText(toEmail) : 'No email on file'}</p>
        <dl class="studio-applicant-email-composer__meta">
          <div><dt>Program</dt><dd>${escapeHtmlText(programLocation)}</dd></div>
          <div><dt>Date</dt><dd>${escapeHtmlText(programDate)}</dd></div>
          <div><dt>Status</dt><dd>${escapeHtmlText(String(row?.status || 'pending'))}</dd></div>
          ${financeMeta}
        </dl>
      </section>
      <section class="studio-applicant-email-composer__card studio-applicant-email-composer__outreach-card">
        <div class="studio-applicant-email-composer__outreach-head">
          <p class="studio-applicant-email-composer__eyebrow">Correspondence</p>
          <button type="button" class="studio-btn-ghost" id="studio-ae-clear-correspondence" hidden>Clear correspondence</button>
        </div>
        <div id="studio-ae-outreach-list">${renderOutreachHistoryHtml(initialOutreach)}</div>
      </section>
      <section class="studio-applicant-email-composer__card">
        <p class="studio-applicant-email-composer__eyebrow">Built-in templates</p>
        <label class="studio-field studio-applicant-email-composer__field">
          <span>Choose template</span>
          <select class="studio-select" id="studio-ae-template-builtin"></select>
        </label>
        <div class="studio-applicant-email-composer__button-grid">
          <button type="button" class="studio-btn-secondary" id="studio-ae-tpl-builtin-apply">Apply</button>
        </div>
      </section>
      <section class="studio-applicant-email-composer__card">
        <p class="studio-applicant-email-composer__eyebrow">Custom templates</p>
        <label class="studio-field studio-applicant-email-composer__field">
          <span>Choose template</span>
          <select class="studio-select" id="studio-ae-template-custom"></select>
        </label>
        <div class="studio-applicant-email-composer__button-grid">
          <button type="button" class="studio-btn-secondary" id="studio-ae-tpl-custom-apply">Apply</button>
          <button type="button" class="studio-btn-ghost" id="studio-ae-tpl-new">New</button>
          <button type="button" class="studio-btn-ghost" id="studio-ae-tpl-update">Update</button>
          <button type="button" class="studio-btn-ghost" id="studio-ae-tpl-delete">Delete</button>
        </div>
        <p class="studio-applicant-email-composer__hint">Custom templates are saved in this browser.</p>
      </section>
      <section class="studio-applicant-email-composer__card">
        <p class="studio-applicant-email-composer__eyebrow">Applicant Draft</p>
        <div class="studio-applicant-email-composer__button-grid">
          <button type="button" class="studio-btn-ghost" id="studio-ae-load-draft">Load</button>
          <button type="button" class="studio-btn-secondary" id="studio-ae-save-draft">Save</button>
          <button type="button" class="studio-btn-ghost" id="studio-ae-delete-draft" disabled>Delete</button>
        </div>
      </section>
    </aside>
    <section class="studio-applicant-email-composer__editor" aria-label="Message editor">
      <div class="studio-applicant-email-composer__editor-head">
        <p class="studio-applicant-email-composer__eyebrow">Email</p>
        <h3>Message</h3>
      </div>
      <label class="studio-field studio-applicant-email-composer__field">
        <span>Subject</span>
        <input type="text" class="studio-input" id="studio-ae-subject" maxlength="998" placeholder="Email subject" />
      </label>
      <label class="studio-field studio-applicant-email-composer__field studio-applicant-email-composer__message-field">
        <span>Message <em>plain text, line breaks kept</em></span>
        <textarea class="studio-textarea studio-individual-email__body" id="studio-ae-body" rows="16" spellcheck="true" placeholder="Write your message…"></textarea>
      </label>
      <div class="studio-applicant-email-composer__quick-draft">
        <label class="studio-field studio-applicant-email-composer__field">
          <span>Quick draft tone</span>
          <select class="studio-select" id="studio-ae-tone">
            <option value="Professional and warm">Professional and warm</option>
            <option value="Short and direct">Short and direct</option>
            <option value="Friendly and encouraging">Friendly and encouraging</option>
            <option value="Formal">Formal</option>
          </select>
        </label>
        <button type="button" class="studio-btn-secondary" id="studio-ae-llm">Quick draft</button>
      </div>
    </section>
    <aside class="studio-applicant-email-composer__review" aria-label="Review and send">
      <section class="studio-applicant-email-composer__card studio-applicant-email-composer__send-card">
        <p class="studio-applicant-email-composer__eyebrow">Review</p>
        <p class="studio-applicant-email-composer__hint">Sending uses the Integration API and Resend path.</p>
        <label class="studio-field studio-applicant-email-composer__field">
          <span>Send test to</span>
          <input type="email" class="studio-input" id="studio-ae-test-to" placeholder="you@org.com" autocomplete="email" />
        </label>
        <button type="button" class="studio-btn-secondary" id="studio-ae-test">Send test</button>
        ${studioEmailCcSelectHtml('studio-ae-cc-team')}
      </section>
      <section class="studio-applicant-email-composer__card studio-applicant-email-composer__signature-card">
        <div class="studio-applicant-email-composer__card-head">
          <p class="studio-applicant-email-composer__eyebrow">Signature</p>
          <button type="button" class="studio-btn-ghost" id="studio-ae-sig-toggle" aria-expanded="false">Edit</button>
        </div>
        <label class="studio-field studio-applicant-email-composer__field">
          <span>Signature preset</span>
          <select class="studio-select" id="studio-ae-signature-choice">
            ${APPLICANT_SIGNATURES.map((sig) => `<option value="${escapeHtmlText(sig.id)}">${escapeHtmlText(sig.label)}</option>`).join('')}
            <option value="custom">Custom</option>
          </select>
        </label>
        <div id="studio-ae-sig-preview" class="studio-send-blast-sig-preview" aria-hidden="false"></div>
        <div id="studio-ae-sig-editor" class="studio-send-blast-sig-editor" hidden>
          <label class="studio-field studio-applicant-email-composer__field">
            <span class="studio-muted">HTML appended after message</span>
            <textarea class="studio-textarea" id="studio-ae-sig" rows="6" spellcheck="false"></textarea>
          </label>
          <button type="button" class="studio-btn-secondary" id="studio-ae-sig-done">Done editing</button>
        </div>
      </section>
    </aside>
  </div>
  <div class="studio-applicant-email-composer__dock">
    <p id="studio-ae-status" class="studio-send-blast-foot-status" role="status" aria-live="polite"></p>
    <div class="studio-applicant-email-composer__dock-actions">
      <button type="button" class="studio-btn-primary" id="studio-ae-send" disabled>Send now</button>
      <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
    </div>
  </div>
</div>`;

    const { root } = openStudioModal(inner, { title, wide: true });

    void populateStudioEmailCcSelect(root.querySelector('#studio-ae-cc-team'));

    const subjectEl = root.querySelector('#studio-ae-subject');
    const bodyEl = root.querySelector('#studio-ae-body');
    const testToEl = root.querySelector('#studio-ae-test-to');
    const statusEl = root.querySelector('#studio-ae-status');
    const sendBtn = root.querySelector('#studio-ae-send');
    const sigTextarea = root.querySelector('#studio-ae-sig');
    const sigPreview = root.querySelector('#studio-ae-sig-preview');
    const sigEditor = root.querySelector('#studio-ae-sig-editor');
    const sigToggle = root.querySelector('#studio-ae-sig-toggle');
    const sigDone = root.querySelector('#studio-ae-sig-done');
    const sigChoice = root.querySelector('#studio-ae-signature-choice');
    const saveDraftBtn = root.querySelector('#studio-ae-save-draft');
    const loadDraftBtn = root.querySelector('#studio-ae-load-draft');
    const deleteDraftBtn = root.querySelector('#studio-ae-delete-draft');
    const tplBuiltinSelect = root.querySelector('#studio-ae-template-builtin');
    const tplCustomSelect = root.querySelector('#studio-ae-template-custom');
    const outreachListEl = root.querySelector('#studio-ae-outreach-list');
    const clearCorrespondenceBtn = root.querySelector('#studio-ae-clear-correspondence');

    if (sigTextarea instanceof HTMLTextAreaElement) {
        sigTextarea.value = APPLICANT_DEFAULT_SIGNATURE_HTML;
    }
    let signatureEditSnapshot = sigTextarea instanceof HTMLTextAreaElement ? sigTextarea.value : APPLICANT_DEFAULT_SIGNATURE_HTML;
    /** @type {{ id: string, name: string } | null} */
    let lastAppliedTemplate = null;
    /** @type {{ sentAt: string, subject: string, templateId: string, templateName: string }[]} */
    let outreachEntries = [...initialOutreach];
    let outreachUnavailable = false;

    const setSignaturePresetValue = (signatureKey) => {
        if (!(sigChoice instanceof HTMLSelectElement)) return;
        const key = String(signatureKey || '').trim();
        sigChoice.value = APPLICANT_SIGNATURES.some((sig) => sig.id === key) ? key : 'custom';
    };

    const applySignaturePreset = (signatureKey) => {
        const sig = APPLICANT_SIGNATURES.find((item) => item.id === signatureKey);
        if (!sig || !(sigTextarea instanceof HTMLTextAreaElement)) return;
        sigTextarea.value = sig.html;
        signatureEditSnapshot = sigTextarea.value;
        setSignaturePresetValue(sig.id);
        renderSignaturePreview();
    };

    const setStatus = (msg) => {
        if (statusEl) statusEl.textContent = msg || '';
    };

    const fillSelectOptions = (selectEl, rows, selectedId) => {
        if (!(selectEl instanceof HTMLSelectElement)) return;
        const fr = document.createDocumentFragment();
        const o0 = document.createElement('option');
        o0.value = '';
        o0.textContent = '— Select template —';
        fr.appendChild(o0);
        for (const t of rows) {
            const o = document.createElement('option');
            o.value = t.id;
            o.textContent = t.name;
            fr.appendChild(o);
        }
        selectEl.replaceChildren(fr);
        if (selectedId && rows.some((x) => x.id === selectedId)) {
            selectEl.value = selectedId;
        }
    };

    const builtInIds = new Set(builtInApplicantTemplates().map((x) => x.id));
    let customTemplates = readTemplates().filter((x) => !builtInIds.has(x.id));
    const builtInTemplates = builtInApplicantTemplates();
    let templates = [...builtInTemplates, ...customTemplates];
    const preferredId = String(preferTemplateId || '').trim();
    const defaultBuiltinId =
        preferredId && builtInTemplates.some((t) => t.id === preferredId)
            ? preferredId
            : isAccepted
              ? APPROVED_TEMPLATE_ID
              : builtInTemplates[0]?.id || '';

    const refreshTemplates = (selectedBuiltinId = '', selectedCustomId = '') => {
        customTemplates = readTemplates().filter((x) => !builtInIds.has(x.id));
        templates = [...builtInApplicantTemplates(), ...customTemplates];
        fillSelectOptions(tplBuiltinSelect, builtInApplicantTemplates(), selectedBuiltinId);
        fillSelectOptions(tplCustomSelect, customTemplates, selectedCustomId);
    };

    refreshTemplates(defaultBuiltinId, '');

    const getSelectedTemplate = () => {
        const customId =
            tplCustomSelect instanceof HTMLSelectElement ? tplCustomSelect.value.trim() : '';
        const builtinId =
            tplBuiltinSelect instanceof HTMLSelectElement ? tplBuiltinSelect.value.trim() : '';
        const id = customId || builtinId;
        if (!id) return null;
        return templates.find((t) => t.id === id) || null;
    };

    const clearOtherTemplateSelect = (source) => {
        if (source === 'builtin' && tplCustomSelect instanceof HTMLSelectElement) {
            tplCustomSelect.value = '';
        }
        if (source === 'custom' && tplBuiltinSelect instanceof HTMLSelectElement) {
            tplBuiltinSelect.value = '';
        }
    };

    const renderOutreachList = () => {
        if (outreachListEl instanceof HTMLElement) {
            outreachListEl.innerHTML = renderOutreachHistoryHtml(outreachEntries, {
                unavailable: outreachUnavailable,
            });
        }
        syncClearCorrespondenceBtn();
    };

    const syncClearCorrespondenceBtn = () => {
        if (!(clearCorrespondenceBtn instanceof HTMLButtonElement)) return;
        const show =
            canClearCorrespondence &&
            !outreachUnavailable &&
            outreachEntries.length > 0;
        clearCorrespondenceBtn.hidden = !show;
    };

    const refreshOutreachFromServer = async () => {
        if (!applicantId) return;
        outreachUnavailable = getDataSource() === 'live' && !(await applicantEmailOutreachApiAvailable());
        if (outreachUnavailable) {
            renderOutreachList();
            return;
        }
        try {
            outreachEntries = await getApplicantEmailOutreachForStudio(applicantId);
            renderOutreachList();
        } catch {
            renderOutreachList();
        }
    };

    const applyTemplate = (t, message = 'Template applied.') => {
        if (!t) {
            setStatus('Select a template first.');
            return;
        }
        lastAppliedTemplate = { id: t.id, name: t.name };
        if (subjectEl instanceof HTMLInputElement) {
            subjectEl.value = applyTemplateVars(t.subject, vars);
        }
        if (bodyEl instanceof HTMLTextAreaElement) {
            bodyEl.value = applyTemplateVars(t.body, vars);
        }
        if (sigTextarea instanceof HTMLTextAreaElement) {
            if (typeof t.signatureHtml === 'string') {
                sigTextarea.value = applyTemplateVars(t.signatureHtml, vars);
                signatureEditSnapshot = sigTextarea.value;
                setSignaturePresetValue(t.signatureKey || 'custom');
                renderSignaturePreview();
            } else if (t.signatureKey) {
                applySignaturePreset(t.signatureKey);
            } else if (t.builtIn) {
                sigTextarea.value = APPLICANT_DEFAULT_SIGNATURE_HTML;
                signatureEditSnapshot = sigTextarea.value;
                setSignaturePresetValue('zoia');
                renderSignaturePreview();
            }
        }
        setStatus(message);
    };

    const readDraftFromStorage = () => {
        if (typeof localStorage === 'undefined' || !applicantId) return null;
        try {
            const raw = localStorage.getItem(applicantEmailDraftKey(applicantId));
            if (!raw) return null;
            const o = JSON.parse(raw);
            if (!o || typeof o !== 'object') return null;
            return o;
        } catch {
            return null;
        }
    };

    const fullHtml = () => {
        const bodyPlain = bodyEl instanceof HTMLTextAreaElement ? bodyEl.value : '';
        const bodyHtml = plainBodyToEmailHtml(bodyPlain);
        const sig = sigTextarea instanceof HTMLTextAreaElement ? sigTextarea.value : '';
        const sigTrim = sig.trim();
        const inner = sigTrim
            ? `${bodyHtml}<div style="margin:36px 0 0;padding:40px 0 0;border-top:1px solid #e5e2df">${sigTrim}</div>`
            : bodyHtml;
        return wrapEmailHtml(inner, { includeSignature: false });
    };

    const renderSignaturePreview = () => {
        if (!(sigPreview instanceof HTMLElement)) return;
        const html = sigTextarea instanceof HTMLTextAreaElement ? sigTextarea.value : '';
        sigPreview.innerHTML = html.trim() || '<p class="studio-muted">(empty signature)</p>';
    };

    const setSignatureEditing = (editing) => {
        if (sigEditor instanceof HTMLElement) {
            sigEditor.hidden = !editing;
        }
        if (sigPreview instanceof HTMLElement) {
            sigPreview.hidden = editing;
        }
        if (sigToggle instanceof HTMLButtonElement) {
            sigToggle.setAttribute('aria-expanded', editing ? 'true' : 'false');
            sigToggle.textContent = editing ? 'Cancel' : 'Edit signature';
        }
        if (sigPreview instanceof HTMLElement) {
            sigPreview.setAttribute('aria-hidden', editing ? 'true' : 'false');
        }
        if (editing && sigTextarea instanceof HTMLTextAreaElement) {
            queueMicrotask(() => sigTextarea.focus());
        }
    };

    const syncDeleteDraftEnabled = () => {
        const inStorage = Boolean(readDraftFromStorage());
        if (deleteDraftBtn instanceof HTMLButtonElement) {
            deleteDraftBtn.disabled = !inStorage;
        }
    };

    const setButtonBusy = (btn, busy) => {
        if (!btn) return;
        if (busy) {
            btn.setAttribute('aria-busy', 'true');
            btn.disabled = true;
        } else {
            btn.setAttribute('aria-busy', 'false');
            btn.disabled = false;
        }
    };

    const flashButtonSuccess = (btn, label) => {
        if (!btn) return;
        btn.classList.add('studio-btn--async-ok');
        if (label) btn.textContent = label;
        window.setTimeout(() => {
            btn.classList.remove('studio-btn--async-ok');
        }, 1600);
    };

    const recomputeSendNow = () => {
        if (!(sendBtn instanceof HTMLButtonElement)) return;
        if (getDataSource() !== 'live') {
            sendBtn.disabled = true;
            sendBtn.title = 'Switch to live data to send.';
            return;
        }
        if (!getIntegrationBaseUrl()) {
            sendBtn.disabled = true;
            sendBtn.title = 'Set Integration API URL under Services.';
            return;
        }
        if (!toValid) {
            sendBtn.disabled = true;
            sendBtn.title = 'Applicant has no valid email.';
            return;
        }
        sendBtn.disabled = false;
        sendBtn.title = '';
    };

    renderSignaturePreview();
    const initialTemplate =
        builtInTemplates.find((t) => t.id === defaultBuiltinId) || builtInTemplates[0] || null;
    if (initialTemplate) applyTemplate(initialTemplate, '');
    recomputeSendNow();
    syncDeleteDraftEnabled();
    renderOutreachList();
    void refreshOutreachFromServer();

    clearCorrespondenceBtn?.addEventListener('click', async () => {
        if (!canClearCorrespondence || !applicantId || outreachEntries.length === 0) return;
        const label = fullName || toEmail || applicantId;
        if (
            !window.confirm(
                `Clear all logged outreach emails for ${label}? This cannot be undone.`,
            )
        ) {
            return;
        }
        if (clearCorrespondenceBtn instanceof HTMLButtonElement) {
            clearCorrespondenceBtn.disabled = true;
        }
        try {
            await clearApplicantEmailOutreachStudio(applicantId);
            outreachEntries = [];
            renderOutreachList();
            setStatus('Correspondence cleared.');
            if (onSent) await onSent();
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
            syncClearCorrespondenceBtn();
            if (clearCorrespondenceBtn instanceof HTMLButtonElement) {
                clearCorrespondenceBtn.disabled = false;
            }
        }
    });

    tplBuiltinSelect?.addEventListener('change', () => {
        if (tplBuiltinSelect instanceof HTMLSelectElement && tplBuiltinSelect.value) {
            clearOtherTemplateSelect('builtin');
        }
    });
    tplCustomSelect?.addEventListener('change', () => {
        if (tplCustomSelect instanceof HTMLSelectElement && tplCustomSelect.value) {
            clearOtherTemplateSelect('custom');
        }
    });

    root.querySelector('#studio-ae-tpl-builtin-apply')?.addEventListener('click', () => {
        const t = getSelectedTemplate();
        if (t?.builtIn) applyTemplate(t);
        else setStatus('Select a built-in template first.');
    });

    root.querySelector('#studio-ae-tpl-custom-apply')?.addEventListener('click', () => {
        const t = getSelectedTemplate();
        if (t && !t.builtIn) applyTemplate(t);
        else setStatus('Select a custom template first.');
    });

    root.querySelector('#studio-ae-tpl-new')?.addEventListener('click', () => {
        const name = window.prompt('Template name?');
        if (!name || !String(name).trim()) return;
        const subj = subjectEl instanceof HTMLInputElement ? subjectEl.value : '';
        const bod = bodyEl instanceof HTMLTextAreaElement ? bodyEl.value : '';
        const id = `tpl-${Date.now()}`;
        customTemplates = [...customTemplates, { id, name: String(name).trim(), subject: subj, body: bod, builtIn: false }];
        writeTemplates(customTemplates);
        refreshTemplates('', id);
        if (tplCustomSelect instanceof HTMLSelectElement) tplCustomSelect.value = id;
        clearOtherTemplateSelect('custom');
        setStatus('Template created.');
    });

    root.querySelector('#studio-ae-tpl-update')?.addEventListener('click', () => {
        const t = getSelectedTemplate();
        if (!t) {
            setStatus('Select a template to update.');
            return;
        }
        if (t.builtIn) {
            setStatus('Built-in templates cannot be updated. Create a custom template instead.');
            return;
        }
        const subj = subjectEl instanceof HTMLInputElement ? subjectEl.value : '';
        const bod = bodyEl instanceof HTMLTextAreaElement ? bodyEl.value : '';
        customTemplates = customTemplates.map((x) =>
            x.id === t.id ? { ...x, subject: subj, body: bod } : x,
        );
        writeTemplates(customTemplates);
        refreshTemplates('', t.id);
        setStatus('Template updated.');
    });

    root.querySelector('#studio-ae-tpl-delete')?.addEventListener('click', () => {
        const t = getSelectedTemplate();
        if (!t) {
            setStatus('Select a template to delete.');
            return;
        }
        if (t.builtIn) {
            setStatus('Built-in templates cannot be deleted.');
            return;
        }
        if (!window.confirm(`Delete template “${t.name}”?`)) return;
        const cur = t.id;
        customTemplates = customTemplates.filter((x) => x.id !== cur);
        writeTemplates(customTemplates);
        refreshTemplates('', '');
        setStatus('Template deleted.');
    });

    sigToggle?.addEventListener('click', () => {
        const nowEditing = sigEditor instanceof HTMLElement && !sigEditor.hidden;
        if (nowEditing) {
            if (sigTextarea instanceof HTMLTextAreaElement) {
                sigTextarea.value = signatureEditSnapshot;
            }
            renderSignaturePreview();
            setSignatureEditing(false);
        } else {
            signatureEditSnapshot = sigTextarea instanceof HTMLTextAreaElement ? sigTextarea.value : signatureEditSnapshot;
            setSignatureEditing(true);
        }
    });

    sigDone?.addEventListener('click', () => {
        if (sigTextarea instanceof HTMLTextAreaElement) {
            signatureEditSnapshot = sigTextarea.value;
            setSignaturePresetValue('custom');
        }
        renderSignaturePreview();
        setSignatureEditing(false);
    });

    sigChoice?.addEventListener('change', () => {
        if (!(sigChoice instanceof HTMLSelectElement)) return;
        if (sigChoice.value === 'custom') return;
        applySignaturePreset(sigChoice.value);
    });

    saveDraftBtn?.addEventListener('click', () => {
        if (typeof localStorage === 'undefined' || !applicantId) return;
        const payload = {
            subject: subjectEl instanceof HTMLInputElement ? subjectEl.value : '',
            message: bodyEl instanceof HTMLTextAreaElement ? bodyEl.value : '',
            signatureHtml: sigTextarea instanceof HTMLTextAreaElement ? sigTextarea.value : '',
            savedAt: new Date().toISOString(),
        };
        try {
            localStorage.setItem(applicantEmailDraftKey(applicantId), JSON.stringify(payload));
            setStatus('Draft saved locally.');
            syncDeleteDraftEnabled();
        } catch (e) {
            setStatus(e instanceof Error ? e.message : String(e));
        }
    });

    loadDraftBtn?.addEventListener('click', () => {
        const o = readDraftFromStorage();
        if (!o) {
            setStatus('No saved draft for this applicant.');
            return;
        }
        if (subjectEl instanceof HTMLInputElement) subjectEl.value = String(o.subject ?? '');
        if (bodyEl instanceof HTMLTextAreaElement) bodyEl.value = String(o.message ?? '');
        if (sigTextarea instanceof HTMLTextAreaElement) {
            const sig = String(o.signatureHtml ?? '');
            sigTextarea.value = sig || APPLICANT_DEFAULT_SIGNATURE_HTML;
            signatureEditSnapshot = sigTextarea.value;
            setSignaturePresetValue('custom');
        }
        renderSignaturePreview();
        setStatus('Loaded draft from this browser.');
        syncDeleteDraftEnabled();
    });

    deleteDraftBtn?.addEventListener('click', () => {
        if (typeof localStorage === 'undefined' || !applicantId) return;
        if (!readDraftFromStorage()) {
            return;
        }
        localStorage.removeItem(applicantEmailDraftKey(applicantId));
        if (subjectEl instanceof HTMLInputElement) subjectEl.value = '';
        if (bodyEl instanceof HTMLTextAreaElement) bodyEl.value = '';
        if (sigTextarea instanceof HTMLTextAreaElement) {
            sigTextarea.value = APPLICANT_DEFAULT_SIGNATURE_HTML;
            signatureEditSnapshot = sigTextarea.value;
            setSignaturePresetValue('zoia');
        }
        renderSignaturePreview();
        setStatus('Draft deleted.');
        syncDeleteDraftEnabled();
    });

    const llmDefault = 'Quick draft';
    root.querySelector('#studio-ae-llm')?.addEventListener('click', async () => {
        if (!(bodyEl instanceof HTMLTextAreaElement)) return;
        const btn = root.querySelector('#studio-ae-llm');
        const tone =
            (root.querySelector('#studio-ae-tone') instanceof HTMLSelectElement
                ? root.querySelector('#studio-ae-tone')?.value
                : '') || 'Professional and warm';
        const src = bodyEl.value;
        const prompt = `Quick draft for a single staff email to a program applicant. Tone: ${tone}. Output plain text only — no HTML, no markdown, no code fences. Use line breaks between paragraphs.`;
        if (prompt.length + src.length > LLM_COMBINED_MAX) {
            alert(`Prompt + body exceeds ${LLM_COMBINED_MAX} characters. Shorten the message.`);
            return;
        }
        if (btn instanceof HTMLButtonElement) setButtonBusy(btn, true);
        setStatus('Quick draft: working…');
        let ok = false;
        try {
            const out = await studioReinterpretWithPrompt(prompt, src, 'en');
            bodyEl.value = out.trim();
            ok = true;
            setStatus('Quick draft: message updated below.');
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
            setStatus('');
        } finally {
            if (btn instanceof HTMLButtonElement) {
                setButtonBusy(btn, false);
                if (ok) {
                    flashButtonSuccess(btn, 'Done');
                    window.setTimeout(() => {
                        if (btn.textContent === 'Done' && llmDefault) btn.textContent = llmDefault;
                    }, 1600);
                }
            }
        }
    });

    const testDefault = 'Send test';
    root.querySelector('#studio-ae-test')?.addEventListener('click', async () => {
        const btn = root.querySelector('#studio-ae-test');
        const to = testToEl instanceof HTMLInputElement ? testToEl.value.trim() : '';
        if (!to.includes('@')) {
            alert('Enter a valid test recipient email.');
            return;
        }
        const subj = subjectEl instanceof HTMLInputElement ? subjectEl.value.trim() : '';
        if (!subj) {
            alert('Subject is required.');
            return;
        }
        if (btn instanceof HTMLButtonElement) setButtonBusy(btn, true);
        setStatus('Test email: sending…');
        let ok = false;
        try {
            const cc = buildStudioEmailCcList(readStudioEmailCcTeamEmail(root, 'studio-ae-cc-team'));
            const html = fullHtml();
            await sendEmail({ to, subject: subj, html, cc });
            await recordStudioEmailOutbound({
                kind: 'single',
                subject: subj,
                htmlBody: html,
                toSummary: `Test → ${to}`,
                recipientCount: 1,
                cc,
            });
            ok = true;
            setStatus(`Test email: sent to ${to}.`);
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
            setStatus('');
        } finally {
            if (btn instanceof HTMLButtonElement) {
                setButtonBusy(btn, false);
                if (ok) {
                    flashButtonSuccess(btn, 'Sent');
                    window.setTimeout(() => {
                        if (btn.textContent === 'Sent' && testDefault) btn.textContent = testDefault;
                    }, 1600);
                }
            }
        }
    });

    sendBtn?.addEventListener('click', async () => {
        if (!(sendBtn instanceof HTMLButtonElement) || !subjectEl || !bodyEl) return;
        if (getDataSource() !== 'live') {
            alert('Use Live data to send.');
            return;
        }
        if (!getIntegrationBaseUrl()) {
            alert('Integration API URL is not configured (Studio → Services).');
            return;
        }
        if (!toValid) {
            alert('This applicant has no valid email.');
            return;
        }
        const subj = subjectEl instanceof HTMLInputElement ? subjectEl.value.trim() : '';
        if (!subj) {
            alert('Subject is required.');
            return;
        }
        sendBtn.disabled = true;
        setStatus('Sending…');
        try {
            const cc = buildStudioEmailCcList(readStudioEmailCcTeamEmail(root, 'studio-ae-cc-team'));
            const html = fullHtml();
            await sendEmail({ to: toEmail, subject: subj, html, cc });
            await recordStudioEmailOutbound({
                kind: 'single',
                subject: subj,
                htmlBody: html,
                toSummary: toEmail,
                recipientCount: 1,
                cc,
            });
            const tpl = lastAppliedTemplate || getSelectedTemplate();
            await appendApplicantEmailOutreachStudio(applicantId, {
                subject: subj,
                templateId: tpl?.id || '',
                templateName: tpl?.name || 'Manual',
            });
            outreachEntries = [
                ...outreachEntries,
                {
                    sentAt: new Date().toISOString(),
                    subject: subj,
                    templateId: tpl?.id || '',
                    templateName: tpl?.name || 'Manual',
                },
            ];
            renderOutreachList();
            setStatus(`Sent to ${toEmail}.`);
            if (onSent) await onSent();
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
            setStatus('');
        } finally {
            recomputeSendNow();
        }
    });
}
