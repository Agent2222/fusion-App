/**
 * Studio Comms — program overview cards (confirmed + email-ready + invites sent).
 */
import { getProgramDisplayNameFromRow } from '../../utils/database.js';
import { firstNonEmptyString } from '../../utils/localeFallback.js';
import { applicantPublicEmail, resolveProviderThumbUrl } from '../../utils/programCommsInvite.js';
import { escapeHtml } from '../../utils/textPreview.js';
import { applicantProgramLifecycleFromStudioStatus } from './applicantsProgramCards.js';

export const COMMS_PROGRAM_SELECT_STORAGE_KEY = 'studio-comms-selected-program-v1';

/**
 * @param {object} programRow
 * @param {{ confirmedApplicants?: object[], sentApplicantIds?: Iterable<string>, commsConfig?: object }} ctx
 */
export function buildCommsProgramCardModel(programRow, ctx = {}) {
    const lifecycle = applicantProgramLifecycleFromStudioStatus(programRow?.studioStatus);
    const confirmed = Array.isArray(ctx.confirmedApplicants) ? ctx.confirmedApplicants : [];
    const sent = new Set(
        ctx.sentApplicantIds ? [...ctx.sentApplicantIds].map((id) => String(id || '')) : [],
    );
    const withEmail = confirmed.filter((row) => applicantPublicEmail(row)).length;
    const invitesSent = confirmed.filter((row) => sent.has(String(row.id || ''))).length;
    const cfg = ctx.commsConfig;
    return {
        id: String(programRow?.id || '').trim(),
        title: getProgramDisplayNameFromRow(programRow),
        imageSrc: firstNonEmptyString(programRow?.jaCard?.imageSrc, programRow?.enCard?.imageSrc),
        providerThumbUrl: resolveProviderThumbUrl(cfg),
        memberActive: Boolean(cfg?.memberActive),
        ...lifecycle,
        totalConfirmed: confirmed.length,
        withEmail,
        invitesSent,
    };
}

/**
 * @param {ReturnType<typeof buildCommsProgramCardModel>} item
 * @param {{ selected?: boolean }} [opts]
 */
export function commsProgramCardHtml(item, opts = {}) {
    const selected = Boolean(opts.selected);
    const media = item.imageSrc
        ? `<img class="studio-comms-program-card__img" src="${escapeHtml(item.imageSrc)}" alt="" loading="lazy" />`
        : `<div class="studio-comms-program-card__placeholder" aria-hidden="true">Fusion</div>`;
    const thumb = item.providerThumbUrl
        ? `<img class="studio-comms-program-card__provider" src="${escapeHtml(item.providerThumbUrl)}" alt="" />`
        : '';
    const live = item.memberActive;
    return `<div class="studio-comms-program-card${selected ? ' is-selected' : ''}" role="listitem" data-comms-program-id="${escapeHtml(item.id)}">
        <button type="button" class="studio-comms-program-card__select" data-comms-program-select="${escapeHtml(item.id)}" aria-pressed="${selected ? 'true' : 'false'}">
            <div class="studio-comms-program-card__media">${media}${thumb}</div>
            <div class="studio-comms-program-card__body">
                <div class="studio-comms-program-card__head">
                    <h4 class="studio-comms-program-card__title">${escapeHtml(item.title)}</h4>
                    <span class="studio-comms-program-card__status studio-comms-program-card__status--${escapeHtml(item.badgeKey)}">${escapeHtml(item.badge)}</span>
                </div>
                <div class="studio-comms-program-card__metrics">
                    <p class="studio-comms-program-card__metric"><span>Confirmed</span><strong>${escapeHtml(String(item.totalConfirmed))}</strong></p>
                    <p class="studio-comms-program-card__metric"><span>Invites sent</span><strong>${escapeHtml(String(item.invitesSent))}</strong></p>
                    <p class="studio-comms-program-card__metric"><span>Member tab</span><strong>${live ? 'On' : 'Off'}</strong></p>
                </div>
            </div>
        </button>
    </div>`;
}

/**
 * @param {ReturnType<typeof buildCommsProgramCardModel>[]} items
 * @param {string | null} selectedProgramId
 */
export function commsProgramCardsRailHtml(items, selectedProgramId) {
    /** @type {Record<'active' | 'past' | 'upcoming', ReturnType<typeof buildCommsProgramCardModel>[]>} */
    const buckets = { active: [], past: [], upcoming: [] };
    for (const item of items) {
        buckets[item.section].push(item);
    }
    const sectionLabels = /** @type {const} */ (['active', 'past', 'upcoming']);
    const sectionTitles = { active: 'Active', past: 'Past', upcoming: 'Upcoming' };
    const parts = [];
    let anyCards = false;
    for (const key of sectionLabels) {
        const sectionItems = buckets[key];
        if (!sectionItems.length) continue;
        anyCards = true;
        parts.push(
            `<span class="studio-comms-program-cards-divider" aria-hidden="true">${escapeHtml(sectionTitles[key])}</span>`,
        );
        parts.push(
            ...sectionItems.map((item) =>
                commsProgramCardHtml(item, { selected: item.id === selectedProgramId }),
            ),
        );
    }
    if (!anyCards) {
        return '<p class="studio-muted studio-comms-program-cards__empty">No programs yet.</p>';
    }
    return parts.join('');
}
