/**
 * Labels for program page CTAs (intro + timeline “begin application” button).
 */
export const PROGRAM_APPLICATION_CTA_COPY = {
    en: { guest: 'Sign up & apply', user: 'Begin application', review: 'Review in-progress' },
    ja: { guest: 'サインアップして応募', user: '応募を始める', review: '審査中を確認' },
};

/**
 * @param {boolean} authenticated
 * @returns {string}
 */
export function programApplicationCtaLabelForAuth(authenticated) {
    const loc = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
    const row = PROGRAM_APPLICATION_CTA_COPY[loc];
    return authenticated ? row.user : row.guest;
}

export function programApplicationReviewLabel() {
    const loc = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
    return PROGRAM_APPLICATION_CTA_COPY[loc].review;
}

/** Intro secondary CTA label (`#applicationButton1`); click scrolls to `#programDetailsSection`. */
export function programKeyDetailsLabel() {
    const loc = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
    return loc === 'ja' ? 'キー詳細' : 'Key Details';
}
