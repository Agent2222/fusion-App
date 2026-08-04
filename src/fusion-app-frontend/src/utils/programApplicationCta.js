/**
 * Labels for program page CTAs (intro + timeline “begin application” button).
 */
export const PROGRAM_APPLICATION_CTA_COPY = {
    en: {
        guest: 'Sign up & apply',
        user: 'Begin application',
        review: 'Review in-progress',
        applySub: 'Apply for the residency program',
        draw: 'Enter Program Draw',
        drawInactive: 'Program Draw',
        drawSub: (slots) => {
            const n = Math.max(1, Math.round(Number(slots) || 100));
            return `Submit for the program draw (1 in ${n})`;
        },
        drawSubInactive: 'Get notified when it opens',
    },
    ja: {
        guest: 'サインアップして応募',
        user: '応募を始める',
        review: '審査中を確認',
        applySub: 'レジデンシープログラムに応募',
        draw: 'プログラム抽選に参加',
        drawInactive: 'プログラム抽選',
        drawSub: (slots) => {
            const n = Math.max(1, Math.round(Number(slots) || 100));
            return `プログラム抽選に応募（${n}名中1名）`;
        },
        drawSubInactive: '公開されたらお知らせします',
    },
};

function localeRow() {
    const loc = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
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

export function programApplicationCtaSubLabel() {
    return localeRow().applySub;
}

/**
 * @param {boolean} [active=true] ProgramDrawConfig.active
 * @returns {string}
 */
export function programDrawCtaLabel(active = true) {
    const row = localeRow();
    return active ? row.draw : row.drawInactive;
}

/**
 * @param {number} [totalSlots]
 * @param {boolean} [active=true]
 * @returns {string}
 */
export function programDrawCtaSubLabel(totalSlots = 100, active = true) {
    const row = localeRow();
    return active ? row.drawSub(totalSlots) : row.drawSubInactive;
}

/** Intro secondary CTA label (`#applicationButton1`); click scrolls to `#programDetailsSection`. */
export function programKeyDetailsLabel() {
    const loc = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
    return loc === 'ja' ? 'キー詳細' : 'Key Details';
}
