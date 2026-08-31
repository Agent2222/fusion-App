/**
 * Follow-up flight email — arrival-time reminder + travel prep cards.
 * Distinct from Finance → Email “Flight information” (booking details).
 */
import { getPublicSiteOrigin } from '../config.js';
import {
    escapeHtmlForEmailLayout,
    fusionEmailParagraph,
    FUSION_EMAIL_STYLES,
    renderFusionEmailFromSlots,
} from './emailFusionLayout.js';
import {
    renderTravelPrepCardsHtml,
    SAMPLE_COMMS_TRAVEL_PREP_LINKS,
} from './programCommsInvite.js';

export const FLIGHT_FOLLOWUP_TEMPLATE_ID = 'tpl_flight_followup';

export const SAMPLE_FLIGHT_FOLLOWUP_HERO_URL =
    'https://fusionart-bucket.s3.us-east-2.amazonaws.com/uploads/platform-assets/program_hero-1.jpg';

/**
 * @param {string} [programName]
 */
export function buildFlightFollowUpSubject(programName) {
    const name = String(programName || '').trim() || 'the program';
    return `${name} — add your arrival date and time`;
}

/**
 * @param {string} [programName]
 */
export function buildFlightFollowUpPreview(programName) {
    const name = String(programName || '').trim() || 'the program';
    return `Reminder about your ${name} flight — add arrival date and time so we can meet you.`;
}

/**
 * @param {string} [href]
 */
export function profileTravelTabUrl(href) {
    const override = String(href || '').trim();
    if (override) return override;
    return `${getPublicSiteOrigin()}/settings/profile#travel`;
}

/**
 * @param {string} label
 * @param {string} href
 */
function inBodyCta(label, href) {
    const text = String(label || '').trim();
    const url = String(href || '').trim();
    if (!text || !url) return '';
    return `<p style="margin:0 0 28px;"><a href="${escapeHtmlForEmailLayout(url)}" style="display:inline-block;background:${FUSION_EMAIL_STYLES.ctaBg};color:${FUSION_EMAIL_STYLES.ctaText};text-decoration:none;padding:14px 20px;font-size:12px;font-weight:800;letter-spacing:0.08em;">${escapeHtmlForEmailLayout(text)}</a></p>`;
}

/**
 * @param {{
 *   programName?: string,
 *   heroImageUrl?: string,
 *   heroAlt?: string,
 *   applicantName?: string,
 *   profileTravelUrl?: string,
 *   travelPrepLinks?: unknown[],
 *   bodyHtmlOverride?: string,
 * }} [opts]
 */
export function flightFollowUpSlots(opts = {}) {
    const programName = String(opts.programName || '').trim() || 'the program';
    const applicantName = String(opts.applicantName || '').trim();
    const travelUrl = profileTravelTabUrl(opts.profileTravelUrl);
    const greeting = applicantName
        ? `Hi ${escapeHtmlForEmailLayout(applicantName)},`
        : 'Hello,';
    const defaultBody = [
        fusionEmailParagraph(greeting, 'lead'),
        fusionEmailParagraph(
            `A reminder about your upcoming flight for ${escapeHtmlForEmailLayout(programName)}. Please add your estimated arrival date and time in your profile so we can keep up with your flight and meet you on arrival.`,
        ),
        fusionEmailParagraph(
            'Sign in, open Programs, then the Travel tab, and enter the date and time you expect to land.',
        ),
    ].join('\n');
    const intro = String(opts.bodyHtmlOverride || '').trim() || defaultBody;
    return {
        eyebrow: 'Travel',
        heroImageUrl: String(opts.heroImageUrl || '').trim(),
        heroAlt: String(opts.heroAlt || programName).trim(),
        pillLabel: 'FLIGHT FOLLOW-UP',
        headlineHtml: 'Add your<br>arrival time',
        bodyHtml: [intro, inBodyCta('ADD ARRIVAL TIME', travelUrl), renderTravelPrepCardsHtml(opts.travelPrepLinks)].join(
            '\n',
        ),
        footnote: 'Questions about your flight? Reply to this email and the Fusion team will help.',
        subject: buildFlightFollowUpSubject(programName),
        previewText: buildFlightFollowUpPreview(programName),
    };
}

/**
 * @param {Parameters<typeof flightFollowUpSlots>[0]} [opts]
 */
export function renderFlightFollowUpHtml(opts = {}) {
    return renderFusionEmailFromSlots(flightFollowUpSlots(opts));
}

/**
 * Sample HTML for the Email studio template picker.
 */
export function sampleFlightFollowUpHtml() {
    return renderFlightFollowUpHtml({
        programName: 'Kaga City Artist Residency',
        heroImageUrl: SAMPLE_FLIGHT_FOLLOWUP_HERO_URL,
        heroAlt: 'Kaga City, Ishikawa',
        applicantName: 'Alex',
        travelPrepLinks: SAMPLE_COMMS_TRAVEL_PREP_LINKS,
    });
}
