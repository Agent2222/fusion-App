/**
 * Shared EN/JA labels for program application + program draw forms
 * (contact / world / about fields only).
 */

export const PROGRAM_FORM_FIELD_COPY = {
    en: {
        contactSectionTitle: 'Contact & location',
        firstName: 'First name',
        lastName: 'Last name',
        email: 'Email',
        country: 'Country',
        state: 'State / region',
        city: 'City',
        contactRequiredHint:
            'Please fill in first name, last name, email, country, and city before continuing.',
        emailInvalid: 'Please enter a valid email address.',
        website: 'Where can we experience your world?',
        websiteByline: '(Website, portfolio, or any place your work lives — links welcome)',
        bioStatement: 'Tell us about yourself, as an artist and as a person.',
        bioStatementByline:
            '(A short bio, or something more personal — whichever feels more honest to you)',
    },
    ja: {
        contactSectionTitle: '連絡先と所在地',
        firstName: '名（ファーストネーム）',
        lastName: '姓（ラストネーム）',
        email: 'メール',
        country: '国',
        state: '州 / 地域',
        city: '都市',
        contactRequiredHint:
            '続行する前に、名、姓、メール、国、都市を入力してください。',
        emailInvalid: '有効なメールアドレスを入力してください。',
        website: 'あなたの世界をどこで体験できますか？',
        websiteByline: '（ウェブサイト、ポートフォリオ、作品を置いている場所 — リンク可）',
        bioStatement: 'アーティストとして、ひとりの人として、あなたについて教えてください。',
        bioStatementByline: '（短い経歴でも、もっと個人的なことでも — 正直に書ける方）',
    },
};

/**
 * @returns {typeof PROGRAM_FORM_FIELD_COPY.en}
 */
export function programFormFieldLabels() {
    const loc =
        typeof window !== 'undefined' &&
        typeof window.getLocale === 'function' &&
        window.getLocale() === 'ja'
            ? 'ja'
            : 'en';
    return PROGRAM_FORM_FIELD_COPY[loc];
}
