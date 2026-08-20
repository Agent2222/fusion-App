/**
 * Global Program Draw CMS shape (`content` page slug `program-draw`).
 * Used by Studio editor + public `app-program-draw-display`.
 */

/**
 * @typedef {{
 *   badge: string,
 *   headline: string,
 *   sub: string,
 *   submitLabel: string,
 *   enteredLabel: string,
 *   currentCycleLabel: string,
 *   membersSuffix: string,
 *   remainingTemplate: string,
 *   applicantsLabel: string,
 *   applicantsHideLabel: string,
 *   applicantsEmpty: string,
 *   roundLabelTemplate: string,
 *   howTitle: string,
 *   howBody: string,
 *   selectionTitle: string,
 *   selectionBody: string,
 *   awardTitle: string,
 *   awardDate: string,
 *   awardNote: string,
 *   pastRecipientsLabel: string,
 *   pastRecipientsHideLabel: string,
 *   moreDetailsLabel: string,
 *   moreDetailsHideLabel: string,
 *   pastTitle: string,
 *   viewAllLabel: string,
 *   supportLead: string,
 *   supportLeadSingular?: string,
 *   supportCta: string,
 *   emptyRecipientsLead: string,
 *   emptyRecipientsBody: string,
 *   emptyRecipientsSoft: string,
 *   badgeInactive: string,
 *   subInactive: string,
 *   getNotifiedLabel: string,
 *   applyToProgramLabel: string,
 *   learnHowLabel: string,
 *   currentStatusLabel: string,
 *   statusNotActive: string,
 *   statusNotScheduledBody: string,
 * }} ProgramDrawDisplayCopy
 *
 * @typedef {{
 *   title: string,
 *   lead: string,
 *   paragraphs: string[],
 *   bullets: string[],
 * }} ProgramDrawAboutCopy
 *
 * @typedef {{
 *   title: string,
 *   lead: string,
 *   bullets: string[],
 * }} ProgramDrawPolicySection
 *
 * @typedef {{
 *   display: ProgramDrawDisplayCopy,
 *   about: ProgramDrawAboutCopy,
 *   eligibility: ProgramDrawPolicySection,
 *   terms: ProgramDrawPolicySection,
 * }} ProgramDrawLocale
 * @typedef {{ en: ProgramDrawLocale, ja: ProgramDrawLocale }} ProgramDrawBundle
 */

/** @returns {ProgramDrawDisplayCopy} */
export function emptyProgramDrawDisplay() {
    return {
        badge: '',
        headline: '',
        sub: '',
        submitLabel: '',
        enteredLabel: '',
        currentCycleLabel: '',
        membersSuffix: '',
        remainingTemplate: '',
        applicantsLabel: '',
        applicantsHideLabel: '',
        applicantsEmpty: '',
        roundLabelTemplate: '',
        howTitle: '',
        howBody: '',
        selectionTitle: '',
        selectionBody: '',
        awardTitle: '',
        awardDate: '',
        awardNote: '',
        pastRecipientsLabel: '',
        pastRecipientsHideLabel: '',
        moreDetailsLabel: '',
        moreDetailsHideLabel: '',
        pastTitle: '',
        viewAllLabel: '',
        supportLead: '',
        supportLeadSingular: '',
        supportCta: '',
        emptyRecipientsLead: '',
        emptyRecipientsBody: '',
        emptyRecipientsSoft: '',
        badgeInactive: '',
        subInactive: '',
        getNotifiedLabel: '',
        applyToProgramLabel: '',
        learnHowLabel: '',
        currentStatusLabel: '',
        statusNotActive: '',
        statusNotScheduledBody: '',
    };
}

/** @returns {ProgramDrawAboutCopy} */
export function emptyProgramDrawAbout() {
    return {
        title: '',
        lead: '',
        paragraphs: [''],
        bullets: [''],
    };
}

/** @returns {ProgramDrawPolicySection} */
export function emptyProgramDrawPolicySection() {
    return {
        title: '',
        lead: '',
        bullets: [''],
    };
}

/** @returns {ProgramDrawLocale} */
export function emptyProgramDrawLocale() {
    return {
        display: emptyProgramDrawDisplay(),
        about: emptyProgramDrawAbout(),
        eligibility: emptyProgramDrawPolicySection(),
        terms: emptyProgramDrawPolicySection(),
    };
}

/** @returns {ProgramDrawBundle} */
export function emptyProgramDrawBundle() {
    return { en: emptyProgramDrawLocale(), ja: emptyProgramDrawLocale() };
}

/** @returns {ProgramDrawLocale} */
export function defaultProgramDrawLocaleEn() {
    return {
        display: {
            badge: 'Program Draw',
            headline: 'One artist will receive a fully sponsored residency placement.',
            sub: 'Not automatic. You must submit your application to enter the draw.',
            submitLabel: 'Submit to Draw',
            enteredLabel: "You're entered",
            currentCycleLabel: 'Current Round',
            membersSuffix: 'Entries',
            remainingTemplate: '{{count}} entries remaining',
            applicantsLabel: 'Applicants',
            applicantsHideLabel: 'Hide applicants',
            applicantsEmpty: 'No applicants yet.',
            roundLabelTemplate: 'Round #{{n}}',
            howTitle: 'How it Works',
            howBody: 'Submit your entry to join the current round.',
            selectionTitle: 'Selection',
            selectionBody: 'Once all {{total}} spots are filled, one recipient is randomly drawn.',
            awardTitle: 'Award',
            awardDate: 'One fully sponsored placement in the {{program}} Artist Residency.',
            awardNote: '',
            pastRecipientsLabel: 'Past recipients',
            pastRecipientsHideLabel: 'Hide past recipients',
            moreDetailsLabel: 'More details',
            moreDetailsHideLabel: 'Hide details',
            pastTitle: 'Past Recipients',
            viewAllLabel: 'View all recipients →',
            supportLead:
                '{{recipients}} artists have already received support through the FUSION Artist Support Draw.',
            supportLeadSingular:
                '{{recipients}} artist has already received support through the FUSION Artist Support Draw.',
            supportCta: "Be part of what's next.",
            emptyRecipientsLead: 'This is the first FUSION Program Draw.',
            emptyRecipientsBody: 'The first recipient will be announced after Round #{{n}}.',
            emptyRecipientsSoft: 'Past recipients will appear here.',
            badgeInactive: 'Program Draw',
            subInactive:
                "The Program Draw is not active yet. Join the waitlist and we'll notify you when it opens.",
            getNotifiedLabel: 'Get Notified',
            applyToProgramLabel: 'Apply to program instead',
            learnHowLabel: 'Learn how the Fusion Draw works →',
            currentStatusLabel: 'Current Status',
            statusNotActive: 'Not active',
            statusNotScheduledBody: 'The next round has not been scheduled yet.',
        },
        about: {
            title: 'About Program Draw',
            lead: 'The Program Draw is a path into a fully sponsored residency slot, including flights to and from Japan and accommodations in Japan. The one-time entry fee (or an included award credit) is the only amount you pay to enter. If you win, there is no additional program cost: you receive a fully paid placement in the program.',
            paragraphs: [
                'Each round fills toward an entry goal. When the round completes, one entrant is selected for a fully sponsored slot.',
                'Entry is not automatic. You must submit contact details and complete entry with an included award credit or a one-time payment.',
            ],
            bullets: [
                'Award credits from membership can cover entry when available',
                'Winners receive a fully funded program slot with no further residency fees',
            ],
        },
        eligibility: {
            title: 'Eligibility',
            lead: 'Entrants must meet these requirements to be considered for the Program Draw.',
            bullets: [
                'Applicants must be practicing artists',
                'You cannot enter the Program Draw while you have an active formal application for the same program',
                'A Fusion account with complete contact details is required to enter',
                'Eligibility is determined by FUSION and may be verified before an award is issued',
            ],
        },
        terms: {
            title: 'Additional terms',
            lead: 'By entering, you agree to the following terms for this Program Draw.',
            bullets: [
                'Entry fees and consumed Program Award credits are non-refundable',
                'You may not enter the same round more than once',
                'If you have already received a Program Draw placement within the past year, you may sponsor a FUSION member for entry instead of entering again',
                'If a round does not reach 50% capacity, the draw is not executed. Entrants instead receive a 3-month Fusion platform membership with additional benefits.',
                'These terms may be updated only while no Program Draw round is active. Any changes will be communicated before the next round opens.',
            ],
        },
    };
}

/** @returns {ProgramDrawLocale} */
export function defaultProgramDrawLocaleJa() {
    return {
        display: {
            badge: 'プログラム抽選',
            headline: '1名のアーティストが、全額支援のレジデンシー枠を受け取ります。',
            sub: '自動では入りません。抽選に参加するには応募の提出が必要です。',
            submitLabel: '抽選に申し込む',
            enteredLabel: 'エントリー済み',
            currentCycleLabel: '現在のラウンド',
            membersSuffix: 'エントリー',
            remainingTemplate: '残り {{count}} エントリー',
            applicantsLabel: '応募者',
            applicantsHideLabel: '応募者を閉じる',
            applicantsEmpty: 'まだ応募者はいません。',
            roundLabelTemplate: 'ラウンド #{{n}}',
            howTitle: '仕組み',
            howBody: 'エントリーを提出して、現在のラウンドに参加します。',
            selectionTitle: '選出',
            selectionBody: '全 {{total}} 枠が埋まったら、1名がランダムに選ばれます。',
            awardTitle: 'アワード',
            awardDate: '{{program}} アーティスト・レジデンシーにおける全額支援の1枠。',
            awardNote: '',
            pastRecipientsLabel: '過去の受賞者',
            pastRecipientsHideLabel: '過去の受賞者を閉じる',
            moreDetailsLabel: '詳細を見る',
            moreDetailsHideLabel: '詳細を閉じる',
            pastTitle: '過去の受賞者',
            viewAllLabel: 'すべての受賞者を見る →',
            supportLead:
                'すでに {{recipients}} 名のアーティストが FUSION Artist Support Draw を通じて支援を受けています。',
            supportLeadSingular:
                'すでに {{recipients}} 名のアーティストが FUSION Artist Support Draw を通じて支援を受けています。',
            supportCta: '次の一歩に参加しよう。',
            emptyRecipientsLead: 'これが初めての FUSION プログラム抽選です。',
            emptyRecipientsBody: '最初の受賞者はラウンド #{{n}} の後に発表されます。',
            emptyRecipientsSoft: '過去の受賞者はここに表示されます。',
            badgeInactive: 'プログラム抽選',
            subInactive:
                'プログラム抽選はまだ開始していません。ウェイトリストに登録すると、公開時にお知らせします。',
            getNotifiedLabel: '通知を受け取る',
            applyToProgramLabel: 'プログラムに応募',
            learnHowLabel: 'Fusion抽選の仕組みを見る →',
            currentStatusLabel: '現在のステータス',
            statusNotActive: '未開始',
            statusNotScheduledBody: '次のラウンドはまだ予定されていません。',
        },
        about: {
            title: 'プログラム抽選について',
            lead: 'プログラム抽選は、全額スポンサーのレジデンシー枠（日本への往復航空券と日本国内の宿泊を含む）へ進むための道です。エントリーに必要な金額は、一度きりの参加費（または付与されたアワードクレジット）のみです。当選した場合、プログラムに関する追加費用はなく、全額負担の支援枠が付与されます。',
            paragraphs: [
                '各ラウンドはエントリー目標に向かって埋まります。ラウンド完了後、エントリーした方の中から1名が全額スポンサー枠に選ばれます。',
                'エントリーは自動ではありません。連絡先を入力し、付与クレジットまたは一回払いで参加を完了してください。',
            ],
            bullets: [
                'メンバーシップのアワードクレジットがある場合はエントリーに使えます',
                '当選者には、レジデンシーに関する追加料金のない全額支援のプログラム枠が付与されます',
            ],
        },
        eligibility: {
            title: '応募資格',
            lead: 'プログラム抽選の対象となるには、以下の条件を満たす必要があります。',
            bullets: [
                '応募者は活動中のアーティストであること',
                '同じプログラムで正式応募が有効な状態では、プログラム抽選にエントリーできません',
                'エントリーには、連絡先が揃った Fusion アカウントが必要です',
                '応募資格は FUSION が判断し、アワード付与前に確認する場合があります',
            ],
        },
        terms: {
            title: 'その他の条件',
            lead: 'エントリーにより、本プログラム抽選に関する以下の条件に同意したものとみなします。',
            bullets: [
                'エントリー料金および消費済みのプログラムアワードクレジットは返金されません',
                '同じラウンドに複数回エントリーすることはできません',
                '過去1年以内にプログラム抽選の支援枠を受け取った場合は、再エントリーの代わりに FUSION メンバーのエントリーをスポンサーできます',
                'ラウンドが定員の50%に達しない場合、抽選は実施されません。その場合、エントリーした方には追加特典付きの3か月間 Fusion プラットフォーム・メンバーシップが付与されます',
                'これらの条件は、プログラム抽選のラウンドが実施されていない期間にのみ更新されることがあります。変更がある場合は、次のラウンド開始前にお知らせします',
            ],
        },
    };
}

/** @returns {ProgramDrawBundle} */
export function defaultProgramDrawBundle() {
    return {
        en: defaultProgramDrawLocaleEn(),
        ja: defaultProgramDrawLocaleJa(),
    };
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function normalizeLines(raw) {
    if (!Array.isArray(raw)) return [''];
    const lines = raw.map((x) => String(x ?? '').trim()).filter(Boolean);
    return lines.length ? lines : [''];
}

/**
 * @param {unknown} raw
 * @param {ProgramDrawLocale} fallback
 * @returns {ProgramDrawLocale}
 */
/**
 * @param {unknown} raw
 * @param {ProgramDrawPolicySection} fallback
 * @returns {ProgramDrawPolicySection}
 */
function normalizePolicySection(raw, fallback) {
    const src = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
    const fromCms = Array.isArray(src.bullets)
        ? src.bullets.map((x) => String(x ?? '').trim()).filter(Boolean)
        : [];
    return {
        title: String(src.title ?? '').trim() || fallback.title,
        lead: String(src.lead ?? '').trim() || fallback.lead,
        bullets: fromCms.length ? fromCms : [...fallback.bullets],
    };
}

/**
 * @param {unknown} raw
 * @param {ProgramDrawPolicySection} fallback
 * @returns {ProgramDrawPolicySection}
 */
function normalizePolicySectionForStudio(raw, fallback) {
    const src = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
    return {
        title: src.title != null ? String(src.title ?? '') : fallback.title,
        lead: src.lead != null ? String(src.lead ?? '') : fallback.lead,
        bullets: normalizeLines(src.bullets ?? fallback.bullets),
    };
}

export function normalizeProgramDrawLocale(raw, fallback) {
    const src = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
    const dSrc =
        src.display && typeof src.display === 'object'
            ? /** @type {Record<string, unknown>} */ (src.display)
            : {};
    const aSrc =
        src.about && typeof src.about === 'object'
            ? /** @type {Record<string, unknown>} */ (src.about)
            : {};
    const dFb = fallback.display;
    const aFb = fallback.about;
    /** @param {string} key */
    const d = (key) => {
        const v = String(dSrc[key] ?? '').trim();
        return v || String(dFb[/** @type {keyof ProgramDrawDisplayCopy} */ (key)] ?? '');
    };
    /** Prefer current product wording when CMS still has older “Member Draw” copy. */
    const rewriteBadge = (raw, fallback) => {
        const v = String(raw || '').trim();
        if (/^member\s*draw$/i.test(v) || v === 'メンバー抽選') {
            return String(fallback || 'Program Draw');
        }
        return v;
    };
    const badge = rewriteBadge(d('badge'), dFb.badge);
    const badgeInactive = rewriteBadge(d('badgeInactive'), dFb.badgeInactive || dFb.badge);
    const headline = d('headline')
        .replace(/\bOne member\b/gi, 'One artist')
        .replace(/1名のメンバーが/g, '1名のアーティストが')
        .replace(/\bmember will receive\b/gi, 'artist will receive');
    return {
        display: {
            badge,
            headline,
            sub: d('sub'),
            submitLabel: d('submitLabel'),
            enteredLabel: d('enteredLabel'),
            currentCycleLabel: d('currentCycleLabel'),
            membersSuffix: d('membersSuffix'),
            remainingTemplate: d('remainingTemplate'),
            applicantsLabel: d('applicantsLabel'),
            applicantsHideLabel: d('applicantsHideLabel'),
            applicantsEmpty: d('applicantsEmpty'),
            roundLabelTemplate: d('roundLabelTemplate'),
            howTitle: d('howTitle'),
            howBody: d('howBody'),
            selectionTitle: d('selectionTitle'),
            selectionBody: d('selectionBody'),
            awardTitle: d('awardTitle'),
            awardDate: d('awardDate'),
            awardNote: d('awardNote'),
            pastRecipientsLabel: d('pastRecipientsLabel'),
            pastRecipientsHideLabel: d('pastRecipientsHideLabel'),
            moreDetailsLabel: d('moreDetailsLabel'),
            moreDetailsHideLabel: d('moreDetailsHideLabel'),
            pastTitle: d('pastTitle'),
            viewAllLabel: d('viewAllLabel'),
            supportLead: d('supportLead'),
            supportLeadSingular: d('supportLeadSingular'),
            supportCta: d('supportCta'),
            emptyRecipientsLead: d('emptyRecipientsLead'),
            emptyRecipientsBody: d('emptyRecipientsBody'),
            emptyRecipientsSoft: d('emptyRecipientsSoft'),
            badgeInactive,
            subInactive: d('subInactive'),
            getNotifiedLabel: d('getNotifiedLabel'),
            applyToProgramLabel: d('applyToProgramLabel'),
            learnHowLabel: d('learnHowLabel'),
            currentStatusLabel: d('currentStatusLabel'),
            statusNotActive: d('statusNotActive'),
            statusNotScheduledBody: d('statusNotScheduledBody'),
        },
        about: {
            title: String(aSrc.title ?? '').trim() || aFb.title,
            lead: String(aSrc.lead ?? '').trim() || aFb.lead,
            paragraphs: (() => {
                const fromCms = Array.isArray(aSrc.paragraphs)
                    ? aSrc.paragraphs.map((x) => String(x ?? '').trim()).filter(Boolean)
                    : [];
                return fromCms.length ? fromCms : [...aFb.paragraphs];
            })(),
            bullets: (() => {
                const fromCms = Array.isArray(aSrc.bullets)
                    ? aSrc.bullets.map((x) => String(x ?? '').trim()).filter(Boolean)
                    : [];
                return fromCms.length ? fromCms : [...aFb.bullets];
            })(),
        },
        eligibility: normalizePolicySection(src.eligibility, fallback.eligibility),
        terms: normalizePolicySection(src.terms, fallback.terms),
    };
}

/**
 * Normalize for Studio editing (preserve empty lines in lists).
 * @param {unknown} raw
 * @returns {ProgramDrawBundle}
 */
export function normalizeProgramDrawBundleForStudio(raw) {
    const defaults = defaultProgramDrawBundle();
    const obj = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
    /**
     * @param {unknown} locRaw
     * @param {ProgramDrawLocale} fb
     */
    const mergeStudioLoc = (locRaw, fb) => {
        const src = locRaw && typeof locRaw === 'object' ? /** @type {Record<string, unknown>} */ (locRaw) : {};
        const dSrc =
            src.display && typeof src.display === 'object'
                ? /** @type {Record<string, unknown>} */ (src.display)
                : {};
        const aSrc =
            src.about && typeof src.about === 'object'
                ? /** @type {Record<string, unknown>} */ (src.about)
                : {};
        /** @type {ProgramDrawDisplayCopy} */
        const display = { ...fb.display };
        for (const key of Object.keys(display)) {
            if (dSrc[key] != null) display[/** @type {keyof ProgramDrawDisplayCopy} */ (key)] = String(dSrc[key] ?? '');
        }
        return {
            display,
            about: {
                title: aSrc.title != null ? String(aSrc.title ?? '') : fb.about.title,
                lead: aSrc.lead != null ? String(aSrc.lead ?? '') : fb.about.lead,
                paragraphs: normalizeLines(aSrc.paragraphs ?? fb.about.paragraphs),
                bullets: normalizeLines(aSrc.bullets ?? fb.about.bullets),
            },
            eligibility: normalizePolicySectionForStudio(src.eligibility, fb.eligibility),
            terms: normalizePolicySectionForStudio(src.terms, fb.terms),
        };
    };
    return {
        en: mergeStudioLoc(obj.en, defaults.en),
        ja: mergeStudioLoc(obj.ja, defaults.ja),
    };
}

/**
 * Public resolve: CMS overlay on defaults (empty CMS fields keep defaults).
 * @param {unknown} raw
 * @param {'en'|'ja'} locale
 * @returns {ProgramDrawLocale}
 */
export function resolveProgramDrawLocale(raw, locale) {
    const defaults = defaultProgramDrawBundle();
    const locKey = locale === 'ja' ? 'ja' : 'en';
    const obj = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
    const locRaw = obj[locKey] ?? obj.en;
    return normalizeProgramDrawLocale(locRaw, defaults[locKey]);
}

/**
 * @param {string} template
 * @param {number} count
 */
export function formatRemainingTemplate(template, count) {
    return String(template || '{{count}} entries remaining').replace(
        /\{\{count\}\}/g,
        String(count),
    );
}

/**
 * Brand-style program label for draw copy (`fusionKaga` → `FUSION Kaga`).
 * @param {string} [programId]
 * @returns {string}
 */
export function programDrawBrandLabel(programId = '') {
    const id = String(programId || '').trim();
    if (!id) return 'FUSION';
    let rest = id;
    if (/^fusion/i.test(id)) {
        rest = id.replace(/^fusion/i, '');
    }
    const spaced = rest
        .replace(/([a-z\d])([A-Z])/g, '$1 $2')
        .replace(/[-_]+/g, ' ')
        .trim();
    if (!spaced) return 'FUSION';
    const titled = spaced.replace(/\b\w/g, (c) => c.toUpperCase());
    return `FUSION ${titled}`;
}

/**
 * Replace `{{program}}` / `{{total}}` / `{{n}}` / `{{recipients}}` (and legacy `{{count}}` for total) in draw copy.
 * @param {string} template
 * @param {{ program?: string, total?: number, n?: number, round?: number, recipients?: number }} [vars]
 */
export function formatProgramDrawCopyTemplate(template, vars = {}) {
    const program = String(vars.program || 'FUSION').trim() || 'FUSION';
    const total = Number.isFinite(Number(vars.total)) ? String(Math.floor(Number(vars.total))) : '100';
    const nRaw = vars.n ?? vars.round;
    const n = Number.isFinite(Number(nRaw)) ? String(Math.floor(Number(nRaw))) : '';
    const recipients = Number.isFinite(Number(vars.recipients))
        ? String(Math.floor(Number(vars.recipients)))
        : '0';
    return String(template || '')
        .replace(/\{\{program\}\}/gi, program)
        .replace(/\{\{total\}\}/gi, total)
        .replace(/\{\{count\}\}/gi, total)
        .replace(/\{\{recipients\}\}/gi, recipients)
        .replace(/\{\{n\}\}/gi, n)
        .replace(/\{\{round\}\}/gi, n);
}
