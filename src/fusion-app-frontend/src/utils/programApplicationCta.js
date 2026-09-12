/**
 * Labels for program page CTAs (intro + timeline “begin application” button).
 */
export const PROGRAM_APPLICATION_CTA_COPY = {
    en: {
        guest: 'Sign up & apply',
        user: 'Begin application',
        review: 'Review in-progress',
        comingSoon: 'Coming soon',
        programFull: 'Program full',
        applySub: 'Apply for the residency program',
        applySubFull: 'This residency is at capacity',
        applySubComingSoon: 'Applications open soon',
        draw: 'Enter Program Draw',
        drawInactive: 'Program Draw',
        drawSub: (slots) => {
            const n = Math.max(1, Math.round(Number(slots) || 100));
            return `Submit for the program draw (1 in ${n})`;
        },
        drawSubInactive: 'Get notified when it opens',
        drawSubClosed: 'Get notified when the next draw opens',
    },
    ja: {
        guest: 'サインアップして応募',
        user: '応募を始める',
        review: '審査中を確認',
        comingSoon: '近日公開',
        programFull: 'プログラム満員',
        applySub: 'レジデンシープログラムに応募',
        applySubFull: '定員に達しています',
        applySubComingSoon: '応募開始をお待ちください',
        draw: 'プログラム抽選に参加',
        drawInactive: 'プログラム抽選',
        drawSub: (slots) => {
            const n = Math.max(1, Math.round(Number(slots) || 100));
            return `プログラム抽選に応募（${n}名中1名）`;
        },
        drawSubInactive: '公開されたらお知らせします',
        drawSubClosed: '次回の抽選開始時にお知らせします',
    },
};

function localeRow() {
    const loc =
        typeof window !== 'undefined' &&
        typeof window.getLocale === 'function' &&
        window.getLocale() === 'ja'
            ? 'ja'
            : 'en';
    return PROGRAM_APPLICATION_CTA_COPY[loc];
}

/**
 * @param {boolean} authenticated
 * @returns {string}
 */
export function programApplicationCtaLabelForAuth(authenticated) {
    const row = localeRow();
    return authenticated ? row.user : row.guest;
}

export function programApplicationReviewLabel() {
    return localeRow().review;
}

/**
 * @param {unknown} [studioStatus]
 * @param {boolean} [applicationsOpen=true]
 */
export function programApplicationCtaSubLabel(studioStatus, applicationsOpen = true) {
    const row = localeRow();
    if (applicationsOpen) return row.applySub;
    const s = String(studioStatus || '')
        .trim()
        .toLowerCase();
    if (s === 'full') return row.applySubFull;
    return row.applySubComingSoon;
}

/**
 * Formal applications are only open when `studioStatus` is `open`.
 * Unknown / empty status stays open unless `acceptingApplications` is false.
 * @param {unknown} [studioStatus]
 * @param {unknown} [acceptingApplications]
 */
export function programApplicationsAreOpen(studioStatus, acceptingApplications) {
    const s = String(studioStatus || '')
        .trim()
        .toLowerCase();
    if (s) return s === 'open';
    if (acceptingApplications === false) return false;
    return true;
}

/**
 * Closed apply CTA when studioStatus is not `open`.
 * @param {unknown} [studioStatus]
 */
export function programApplicationClosedCtaLabel(studioStatus) {
    const row = localeRow();
    const s = String(studioStatus || '')
        .trim()
        .toLowerCase();
    if (s === 'full') return row.programFull;
    return row.comingSoon;
}

/**
 * @param {boolean} [active=true] ProgramDrawConfig.active
 * @param {boolean} [entered=false] Caller already has an entered draw for this program
 * @param {boolean} [closed=false] localesJson.draw.closed — notify, not enter
 * @returns {string}
 */
export function programDrawCtaLabel(active = true, entered = false, closed = false) {
    const row = localeRow();
    // Closed / entered / inactive: short brand label, not "Enter Program Draw".
    if (closed || !active || entered) return row.drawInactive;
    return row.draw;
}

/**
 * @param {number} [totalSlots]
 * @param {boolean} [active=true]
 * @param {boolean} [closed=false]
 * @returns {string}
 */
export function programDrawCtaSubLabel(totalSlots = 100, active = true, closed = false) {
    const row = localeRow();
    if (closed) return row.drawSubClosed || row.drawSubInactive;
    return active ? row.drawSub(totalSlots) : row.drawSubInactive;
}

/** Intro secondary CTA label (`#applicationButton1`); click scrolls to `#programDetailsSection`. */
export function programKeyDetailsLabel() {
    const loc = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
    return loc === 'ja' ? 'キー詳細' : 'Key Details';
}
