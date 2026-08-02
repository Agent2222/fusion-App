/**
 * Studio Applicants — program overview cards (pipeline metrics + Standard/Draw mode).
 */
import { getProgramDisplayNameFromRow } from '../../utils/database.js';
import { firstNonEmptyString } from '../../utils/localeFallback.js';
import { getApplicantIsTester } from '../../utils/studioPlainForms.js';
import { escapeHtml } from '../../utils/textPreview.js';

export const APPLICANTS_PROGRAM_SELECT_STORAGE_KEY = 'studio-applicants-selected-program-v1';

/**
 * Stub until program-draw applications are wired. Reserved payload key: programDraw.
 * @param {unknown} [_payloadJson]
 * @returns {boolean}
 */
export function getApplicantIsProgramDraw(_payloadJson) {
    return false;
}

/**
 * @param {string} studioStatus
 * @returns {{ section: 'active' | 'past' | 'upcoming', badge: string, badgeKey: string }}
 */
export function applicantProgramLifecycleFromStudioStatus(studioStatus) {
    const s = String(studioStatus || '').trim();
    if (s === 'completed') {
        return { section: 'past', badge: 'Completed', badgeKey: 'completed' };
    }
    if (s === 'comingUp') {
        return { section: 'upcoming', badge: 'Upcoming', badgeKey: 'upcoming' };
    }
    if (s === 'active' || s === 'open' || s === 'full') {
        return { section: 'active', badge: 'Active', badgeKey: 'active' };
    }
    return { section: 'upcoming', badge: 'Upcoming', badgeKey: 'upcoming' };
}

/**
 * @param {object} a
 * @param {object} b
 */
export function sortApplicantProgramRows(a, b) {
    const yearA = Number(
        (a.enCard && typeof a.enCard === 'object' ? a.enCard.year : undefined) ?? 0,
    );
    const yearB = Number(
        (b.enCard && typeof b.enCard === 'object' ? b.enCard.year : undefined) ?? 0,
    );
    if (yearB !== yearA) return yearB - yearA;
    return String(a.id || '').localeCompare(String(b.id || ''));
}

/**
 * Non-tester applicants grouped by programId (for overview counts).
 * @param {object[]} allRows
 * @returns {Map<string, object[]>}
 */
export function aggregateApplicantsByProgram(allRows) {
    /** @type {Map<string, object[]>} */
    const map = new Map();
    for (const row of Array.isArray(allRows) ? allRows : []) {
        if (getApplicantIsTester(row?.payloadJson)) continue;
        const programId = String(row?.programId || '').trim();
        if (!programId) continue;
        const list = map.get(programId);
        if (list) list.push(row);
        else map.set(programId, [row]);
    }
    return map;
}

/**
 * @param {object} programRow
 * @param {object[] | undefined} applicantsForProgram
 */
export function buildApplicantProgramCardModel(programRow, applicantsForProgram) {
    const lifecycle = applicantProgramLifecycleFromStudioStatus(programRow?.studioStatus);
    const rows = Array.isArray(applicantsForProgram) ? applicantsForProgram : [];
    let confirmed = 0;
    let pulledOut = 0;
    let inProcessing = 0;
    for (const row of rows) {
        const secured = Boolean(row?.slotSecured);
        const status = String(row?.status || '');
        if (status === 'pulledOut') pulledOut += 1;
        if (secured) confirmed += 1;
        if (status !== 'pulledOut' && !secured) inProcessing += 1;
    }
    return {
        id: String(programRow?.id || '').trim(),
        title: getProgramDisplayNameFromRow(programRow),
        imageSrc: firstNonEmptyString(
            programRow?.jaCard?.imageSrc,
            programRow?.enCard?.imageSrc,
        ),
        ...lifecycle,
        totalApplicants: rows.length,
        totalConfirmed: confirmed,
        totalPulledOut: pulledOut,
        totalInProcessing: inProcessing,
    };
}

/**
 * @param {ReturnType<typeof buildApplicantProgramCardModel>} item
 * @param {{ selected?: boolean, viewMode?: 'standard' | 'draw' }} [opts]
 */
export function applicantProgramCardHtml(item, opts = {}) {
    const selected = Boolean(opts.selected);
    const viewMode = opts.viewMode === 'draw' ? 'draw' : 'standard';
    const media = item.imageSrc
        ? `<img class="studio-applicants-program-card__img" src="${escapeHtml(item.imageSrc)}" alt="" loading="lazy" />`
        : `<div class="studio-applicants-program-card__placeholder" aria-hidden="true">Fusion</div>`;
    const modeBtn = (mode, label) => {
        const on = viewMode === mode;
        return `<button type="button" class="studio-applicants-view-toggle__btn${on ? ' is-active' : ''}" data-applicants-view-mode="${mode}" data-applicants-program-id="${escapeHtml(item.id)}" aria-pressed="${on ? 'true' : 'false'}">${escapeHtml(label)}</button>`;
    };
    return `<div class="studio-applicants-program-card${selected ? ' is-selected' : ''}" role="listitem" data-applicants-program-id="${escapeHtml(item.id)}">
        <button type="button" class="studio-applicants-program-card__select" data-applicants-program-select="${escapeHtml(item.id)}" aria-pressed="${selected ? 'true' : 'false'}">
            <div class="studio-applicants-program-card__media">${media}</div>
            <div class="studio-applicants-program-card__body">
                <div class="studio-applicants-program-card__head">
                    <h4 class="studio-applicants-program-card__title">${escapeHtml(item.title)}</h4>
                    <span class="studio-applicants-program-card__status studio-applicants-program-card__status--${escapeHtml(item.badgeKey)}">${escapeHtml(item.badge)}</span>
                </div>
                <div class="studio-applicants-program-card__metrics">
                    <p class="studio-applicants-program-card__metric"><span>Total applicants</span><strong>${escapeHtml(String(item.totalApplicants))}</strong></p>
                    <p class="studio-applicants-program-card__metric"><span>Total confirmed</span><strong>${escapeHtml(String(item.totalConfirmed))}</strong></p>
                    <p class="studio-applicants-program-card__metric"><span>Total pulled out</span><strong>${escapeHtml(String(item.totalPulledOut))}</strong></p>
                    <p class="studio-applicants-program-card__metric"><span>Total in processing</span><strong>${escapeHtml(String(item.totalInProcessing))}</strong></p>
                </div>
            </div>
        </button>
        <div class="studio-applicants-view-toggle" role="group" aria-label="Applicant view for ${escapeHtml(item.title)}">
            ${modeBtn('standard', 'Standard')}
            ${modeBtn('draw', 'Draw')}
        </div>
    </div>`;
}

/**
 * @param {ReturnType<typeof buildApplicantProgramCardModel>[]} items
 * @param {string | null} selectedProgramId
 * @param {Map<string, 'standard' | 'draw'>} viewModeByProgramId
 */
export function applicantProgramCardsRailHtml(items, selectedProgramId, viewModeByProgramId) {
    /** @type {Record<'active' | 'past' | 'upcoming', ReturnType<typeof buildApplicantProgramCardModel>[]>} */
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
            `<span class="studio-applicants-program-cards-divider" aria-hidden="true">${escapeHtml(sectionTitles[key])}</span>`,
        );
        parts.push(
            ...sectionItems.map((item) =>
                applicantProgramCardHtml(item, {
                    selected: item.id === selectedProgramId,
                    viewMode: viewModeByProgramId.get(item.id) || 'standard',
                }),
            ),
        );
    }
    if (!anyCards) {
        return '<p class="studio-muted studio-applicants-program-cards__empty">No programs yet.</p>';
    }
    return parts.join('');
}
