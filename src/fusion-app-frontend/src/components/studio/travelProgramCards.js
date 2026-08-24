/**
 * Studio Travel — program overview cards (confirmed + flight metrics).
 */
import { getProgramDisplayNameFromRow } from '../../utils/database.js';
import { firstNonEmptyString } from '../../utils/localeFallback.js';
import { escapeHtml } from '../../utils/textPreview.js';
import { applicantProgramLifecycleFromStudioStatus } from './applicantsProgramCards.js';

export const TRAVEL_PROGRAM_SELECT_STORAGE_KEY = 'studio-travel-selected-program-v1';

/**
 * @param {object} programRow
 * @param {{ confirmedApplicants?: object[], bookings?: object[] }} ctx
 */
export function buildTravelProgramCardModel(programRow, ctx = {}) {
    const lifecycle = applicantProgramLifecycleFromStudioStatus(programRow?.studioStatus);
    const confirmed = Array.isArray(ctx.confirmedApplicants) ? ctx.confirmedApplicants : [];
    const bookings = Array.isArray(ctx.bookings) ? ctx.bookings : [];
    const bookedIds = new Set(
        bookings
            .filter((b) => b && (b.airline || b.confirmationNumber))
            .map((b) => String(b.applicantId || '')),
    );
    return {
        id: String(programRow?.id || '').trim(),
        title: getProgramDisplayNameFromRow(programRow),
        imageSrc: firstNonEmptyString(
            programRow?.jaCard?.imageSrc,
            programRow?.enCard?.imageSrc,
        ),
        ...lifecycle,
        totalConfirmed: confirmed.length,
        flightsBooked: bookedIds.size,
        flightsPending: Math.max(0, confirmed.length - bookedIds.size),
    };
}

/**
 * @param {ReturnType<typeof buildTravelProgramCardModel>} item
 * @param {{ selected?: boolean }} [opts]
 */
export function travelProgramCardHtml(item, opts = {}) {
    const selected = Boolean(opts.selected);
    const media = item.imageSrc
        ? `<img class="studio-travel-program-card__img" src="${escapeHtml(item.imageSrc)}" alt="" loading="lazy" />`
        : `<div class="studio-travel-program-card__placeholder" aria-hidden="true">Fusion</div>`;
    return `<div class="studio-travel-program-card${selected ? ' is-selected' : ''}" role="listitem" data-travel-program-id="${escapeHtml(item.id)}">
        <button type="button" class="studio-travel-program-card__select" data-travel-program-select="${escapeHtml(item.id)}" aria-pressed="${selected ? 'true' : 'false'}">
            <div class="studio-travel-program-card__media">${media}</div>
            <div class="studio-travel-program-card__body">
                <div class="studio-travel-program-card__head">
                    <h4 class="studio-travel-program-card__title">${escapeHtml(item.title)}</h4>
                    <span class="studio-travel-program-card__status studio-travel-program-card__status--${escapeHtml(item.badgeKey)}">${escapeHtml(item.badge)}</span>
                </div>
                <div class="studio-travel-program-card__metrics">
                    <p class="studio-travel-program-card__metric"><span>Confirmed</span><strong>${escapeHtml(String(item.totalConfirmed))}</strong></p>
                    <p class="studio-travel-program-card__metric"><span>Flights booked</span><strong>${escapeHtml(String(item.flightsBooked))}</strong></p>
                    <p class="studio-travel-program-card__metric"><span>Flights pending</span><strong>${escapeHtml(String(item.flightsPending))}</strong></p>
                </div>
            </div>
        </button>
    </div>`;
}

/**
 * @param {ReturnType<typeof buildTravelProgramCardModel>[]} items
 * @param {string | null} selectedProgramId
 */
export function travelProgramCardsRailHtml(items, selectedProgramId) {
    /** @type {Record<'active' | 'past' | 'upcoming', ReturnType<typeof buildTravelProgramCardModel>[]>} */
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
            `<span class="studio-travel-program-cards-divider" aria-hidden="true">${escapeHtml(sectionTitles[key])}</span>`,
        );
        parts.push(
            ...sectionItems.map((item) =>
                travelProgramCardHtml(item, { selected: item.id === selectedProgramId }),
            ),
        );
    }
    if (!anyCards) {
        return '<p class="studio-muted studio-travel-program-cards__empty">No programs yet.</p>';
    }
    return parts.join('');
}
