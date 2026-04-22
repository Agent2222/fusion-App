/**
 * Program application: single-page form (contact, portfolio, application fee + Stripe).
 */

import {
    defaultApplicationPaymentGlobal,
    ensureMyLinkedArtistProfile,
    getMembershipAccessForCaller,
    getMyArtistRecord,
    PROGRAM_APPLICATION_ERROR_CODE,
    submitProgramApplication,
} from '../../utils/database.js';
import { getAuthSnapshot } from '../../utils/icAuth.js';
import { emptyApplicationPaymentOptions } from '../../utils/programApplicationFormContext.js';
import {
    clearPendingPaymentEmailLocal,
    createPaymentIntent,
    createSubscription,
    FUSION_PENDING_APPLICATION_SUB_KEY,
    getIntegrationBaseUrl,
    mapIntegrationUserMessage,
    setPendingPaymentEmailLocal,
    setStoredBillingEmailForPrincipal,
} from '../../utils/integrationApi.js';
import { getProfileSetupDraft } from '../../utils/profileSetupDraft.js';
import { getStripePublishableKeyResolved } from '../../utils/studioServicesConfig.js';
import posthog from 'posthog-js';

const DEFAULT_PROGRAM_FORM_CTX = {
    applicationFeeLine: '',
    depositAmountDisplay: '',
    applicationDeadlineDisplay: '',
    whatsIncludedBody: '',
    feeNoticeItalic: '',
    selectionProcessOverride: '',
    detailsSectionId: 'programDetailsSection',
    /** @type {number | null} */
    applicationFeeAmountCents: null,
    applicationPaymentOptions: emptyApplicationPaymentOptions(),
};

/**
 * @param {string} raw
 * @returns {string}
 */
function normalizeWebsiteForPayload(raw) {
    const s = String(raw ?? '').trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('//')) return `https:${s}`;
    return `https://${s}`;
}

/**
 * @param {string} email
 * @returns {boolean}
 */
function isLooseEmail(email) {
    const t = String(email ?? '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

/**
 * @param {unknown} links
 * @returns {string}
 */
function pickWebsiteFromProfileLinks(links) {
    if (!Array.isArray(links)) return '';
    const lower = (s) => String(s ?? '').toLowerCase();
    const preferred = links.find(
        (l) => l && typeof l === 'object' && lower(/** @type {{ type?: unknown }} */ (l).type) === 'website' && String(/** @type {{ url?: unknown }} */ (l).url ?? '').trim()
    );
    const row = preferred || links.find((l) => l && typeof l === 'object' && String(/** @type {{ url?: unknown }} */ (l).url ?? '').trim());
    return row && typeof row === 'object' ? String(/** @type {{ url?: unknown }} */ (row).url ?? '').trim() : '';
}

class ApplicationFormComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {Record<string, string | number | null | object>} */
        this._programFormContext = { ...DEFAULT_PROGRAM_FORM_CTX };
        /** Global EN/JA bullets from site settings (`applicationPaymentGlobal`). */
        this._applicationPaymentGlobal = defaultApplicationPaymentGlobal();
        /** @type {'one_time' | 'bimonthly' | 'annual' | null} */
        this._paymentPlan = null;
        /** User edited the form after load — drives SPA `data-unsaved` + `beforeunload`. */
        this._dirty = false;
        this._beforeUnloadHooked = false;
        /** @type {((e: BeforeUnloadEvent) => void) | null} */
        this._boundBeforeUnload = null;
        /** @type {import('@stripe/stripe-js').Stripe | null} */
        this._stripe = null;
        /** @type {import('@stripe/stripe-js').StripeElements | null} */
        this._stripeElements = null;
        /** @type {import('@stripe/stripe-js').StripeElement | null} */
        this._stripePaymentElement = null;
        this._stripePaymentReady = false;
        this._stripePrepareGen = 0;
        /** Fingerprint for reusing the same Stripe Elements session (subscription checkout). */
        this._stripePrepareKey = '';
        /** @type {string | null} */
        this._fusionPendingId = null;
        /** @type {string | null} */
        this._fusionSubscriptionId = null;
        /** @type {AbortController | null} */
        this._wireAbort = null;
        /** User has a stored application for this `data-program-id` — hide fee UI; submit without Stripe. */
        this._alreadyApplied = false;
        /** Active member (`ok` / `exempt`) after ensure — skip application fee Stripe. */
        this._membershipFeeWaived = false;
        /** Last `getMembershipAccessForCaller` result for analytics. */
        this._membershipGate = 'unknown';
        /** Avoid duplicate `program_application_started` on `fusion-auth-change` refresh. */
        this._hasCapturedProgramApplicationStarted = false;
    }

    get active() {
        return this.getAttribute('active') || false;
    }

    set active(val) {
        const next = val === true || val === 'true' ? 'true' : 'false';
        if (this.getAttribute('active') === next) return;
        this.setAttribute('active', next);
    }

    static get observedAttributes() {
        return ['active', 'data-program-id'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if ((prop === 'active' || prop === 'data-program-id') && oldVal !== newVal) {
            this.render();
            this._afterRender();
        }
    }

    /**
     * @param {Record<string, string | number | null | undefined | object>} ctx
     */
    setProgramFormContext(ctx) {
        this._programFormContext = { ...DEFAULT_PROGRAM_FORM_CTX, ...this._programFormContext, ...ctx };
        if (this.shadowRoot) this._hydrateProgramContextInDom();
    }

    /**
     * @param {{ en?: { whatsIncludedBullets?: string[] }, ja?: { whatsIncludedBullets?: string[] } } | null | undefined} obj
     */
    setApplicationPaymentGlobalContext(obj) {
        const base = defaultApplicationPaymentGlobal();
        if (obj && typeof obj === 'object') {
            for (const loc of ['en', 'ja']) {
                const b = obj[loc];
                if (b && typeof b === 'object' && Array.isArray(b.whatsIncludedBullets)) {
                    base[loc].whatsIncludedBullets = b.whatsIncludedBullets
                        .map((x) => String(x ?? '').trim())
                        .filter(Boolean);
                }
            }
        }
        this._applicationPaymentGlobal = base;
        if (this.shadowRoot) this._hydrateWhatsIncludedForPlan();
    }

    _hydrateProgramContextInDom() {
        const root = this.shadowRoot;
        if (!root) return;
        const L = this._labels();
        const ctx = this._programFormContext;

        const introEl = root.querySelector('#app-selection-intro');
        if (introEl) {
            const override = String(ctx.selectionProcessOverride ?? '').trim();
            if (override) {
                introEl.innerHTML = override;
                introEl.style.whiteSpace = '';
            } else {
                const dep = String(ctx.depositAmountDisplay ?? '').trim() || '—';
                const dl = String(ctx.applicationDeadlineDisplay ?? '').trim() || '—';
                introEl.innerHTML = this._selectionProcessTemplateHtml(L, dep, dl);
            }
        }

        const feeAmt = root.querySelector('#app-application-fee-amount');
        if (feeAmt) {
            const line = String(ctx.applicationFeeLine ?? '').trim();
            if (line.includes(':')) {
                const i = line.indexOf(':');
                feeAmt.textContent = line.slice(i + 1).trim() || line;
            } else {
                feeAmt.textContent = line || '—';
            }
        }

        const feeNotice = root.querySelector('#app-fee-notice-italic');
        if (feeNotice) {
            const custom = String(ctx.feeNoticeItalic ?? '').trim();
            feeNotice.textContent = custom || L.defaultFeeNoticeItalic;
        }

        this._hydratePaymentPlanCards();
        this._hydrateWhatsIncludedForPlan();
    }

    /**
     * Fills global + per-plan “what’s included” lists (locale + selected plan).
     */
    _hydrateWhatsIncludedForPlan() {
        const root = this.shadowRoot;
        if (!root) return;
        const L = this._labels();
        const locale = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
        const g =
            this._applicationPaymentGlobal[locale] ||
            this._applicationPaymentGlobal.en ||
            defaultApplicationPaymentGlobal().en;
        const globalBullets = Array.isArray(g?.whatsIncludedBullets) ? g.whatsIncludedBullets : [];

        const globalHead = root.querySelector('#app-whats-included-global-head');
        const planHead = root.querySelector('#app-whats-included-plan-head');
        const globalUl = root.querySelector('#app-whats-included-global-ul');
        const planUl = root.querySelector('#app-whats-included-plan-ul');
        const planBlock = root.querySelector('#app-whats-included-plan-block');

        if (globalHead) globalHead.textContent = L.whatsIncludedGlobalHeading;
        if (planHead) planHead.textContent = L.whatsIncludedPlanHeading;

        if (globalUl) {
            globalUl.innerHTML = '';
            if (globalBullets.length === 0) {
                const li = document.createElement('li');
                li.className = 'app-whats-included-empty';
                li.textContent = L.whatsIncludedGlobalEmpty;
                globalUl.appendChild(li);
            } else {
                for (const t of globalBullets) {
                    const li = document.createElement('li');
                    li.textContent = t;
                    globalUl.appendChild(li);
                }
            }
        }

        const plan = this._paymentPlan;
        const apo = this._programFormContext.applicationPaymentOptions;
        const opt =
            plan && apo && typeof apo === 'object' && plan in apo
                ? /** @type {{ title?: string, displayPrice?: string, subtext?: string, subtext2?: string, includedBullets?: string[] }} */ (
                      apo[plan]
                  )
                : null;
        const planBullets = opt?.includedBullets?.length ? opt.includedBullets : [];

        if (planUl && planBlock) {
            planUl.innerHTML = '';
            if (!plan) {
                planBlock.hidden = false;
                const li = document.createElement('li');
                li.className = 'app-whats-included-empty';
                li.textContent = L.whatsIncludedPickPlan;
                planUl.appendChild(li);
            } else if (planBullets.length === 0) {
                planBlock.hidden = true;
            } else {
                planBlock.hidden = false;
                for (const t of planBullets) {
                    const li = document.createElement('li');
                    li.textContent = t;
                    planUl.appendChild(li);
                }
            }
        }
    }

    /**
     * @param {number | null | undefined} cents
     * @returns {string}
     */
    _formatUsdFromCents(cents) {
        if (typeof cents !== 'number' || !Number.isFinite(cents) || cents < 0) return '—';
        try {
            return new Intl.NumberFormat(
                typeof navigator !== 'undefined' ? navigator.language : 'en-US',
                { style: 'currency', currency: 'USD' }
            ).format(cents / 100);
        } catch {
            return `$${(cents / 100).toFixed(2)}`;
        }
    }

    _hydratePaymentPlanCards() {
        const root = this.shadowRoot;
        if (!root) return;
        const L = this._labels();
        const apo = this._programFormContext.applicationPaymentOptions;
        const o =
            apo && typeof apo === 'object'
                ? apo
                : /** @type {Record<string, { title?: string, displayPrice?: string, subtext?: string, subtext2?: string }>} */ ({});
        const centsRaw = this._programFormContext.applicationFeeAmountCents;
        const cents = typeof centsRaw === 'number' && Number.isFinite(centsRaw) && centsRaw >= 50 ? centsRaw : null;

        const one = o.one_time || {};
        const oneTimeCard = root.querySelector('[data-app-payment-plan="one_time"]');
        const oneTimeTitle = root.querySelector('#app-plan-one-time-title');
        const oneTimePrice = root.querySelector('#app-plan-one-time-price');
        const oneTimeSub = root.querySelector('#app-plan-one-time-sub');
        const dispOne = String(one.displayPrice ?? '').trim();
        if (oneTimeTitle) oneTimeTitle.textContent = String(one.title ?? '').trim() || L.planOneTimeTitle;
        if (oneTimePrice) {
            if (dispOne) oneTimePrice.textContent = dispOne;
            else oneTimePrice.textContent = cents != null ? this._formatUsdFromCents(cents) : '—';
        }
        if (oneTimeSub) {
            const s = String(one.subtext ?? '').trim();
            const s2 = String(one.subtext2 ?? '').trim();
            oneTimeSub.textContent = s2 ? `${s}\n${s2}` : s || L.planOneTimeSub;
            oneTimeSub.style.whiteSpace = s2 ? 'pre-line' : '';
        }
        if (oneTimeCard instanceof HTMLElement) {
            const unavailable = cents == null;
            oneTimeCard.toggleAttribute('disabled', unavailable);
            oneTimeCard.classList.toggle('is-unavailable', unavailable);
            oneTimeCard.title = unavailable ? L.oneTimePlanUnavailable : '';
        }

        const bi = o.bimonthly || {};
        const biTitle = root.querySelector('#app-plan-bimonthly-title');
        const biPrice = root.querySelector('#app-plan-bimonthly-price');
        const biEvery = root.querySelector('#app-plan-bimonthly-every');
        const biSub1 = root.querySelector('#app-plan-bimonthly-sub1');
        const biSub2 = root.querySelector('#app-plan-bimonthly-sub2');
        if (biTitle) biTitle.textContent = String(bi.title ?? '').trim() || L.planBimonthlyTitle;
        if (biPrice) biPrice.textContent = String(bi.displayPrice ?? '').trim() || L.planBimonthlyPriceLine;
        if (biEvery) biEvery.textContent = L.planBimonthlyEvery;
        if (biSub1) biSub1.textContent = String(bi.subtext ?? '').trim() || L.planBimonthlySub1;
        if (biSub2) biSub2.textContent = String(bi.subtext2 ?? '').trim() || L.planBimonthlySub2;

        const an = o.annual || {};
        const anTitle = root.querySelector('#app-plan-annual-title');
        const anPrice = root.querySelector('#app-plan-annual-price');
        const anDisc = root.querySelector('#app-plan-annual-discount');
        const anSub1 = root.querySelector('#app-plan-annual-sub1');
        const anSub2 = root.querySelector('#app-plan-annual-sub2');
        if (anTitle) anTitle.textContent = String(an.title ?? '').trim() || L.planAnnualTitle;
        if (anPrice) anPrice.textContent = String(an.displayPrice ?? '').trim() || L.planAnnualPrice;
        if (anDisc) anDisc.textContent = L.planAnnualDiscount;
        if (anSub1) anSub1.textContent = String(an.subtext ?? '').trim() || L.planAnnualSub1;
        if (anSub2) anSub2.textContent = String(an.subtext2 ?? '').trim() || L.planAnnualSub2;
    }

    /**
     * @param {Record<string, string>} L
     * @param {string} deposit
     * @param {string} deadline
     */
    _selectionProcessTemplateHtml(L, deposit, deadline) {
        const esc = (s) =>
            String(s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        const href = `#${this._programFormContext.detailsSectionId || 'programDetailsSection'}`;
        return `
<p class="app-selection-process-heading">${esc(L.selectionProcessTitle)}</p>
<p>${esc(L.selectionReview)}</p>
<p>${esc(L.selectionEmail)}</p>
<p>${esc(L.selectionInterview)}</p>
<p>${esc(L.selectionFinal)}</p>
<p>${esc(String(L.selectionDepositLine || '').replace(/\{\{deposit\}\}/g, String(deposit)).replace(/\{\{deadline\}\}/g, String(deadline)))}</p>
<p>${esc(L.selectionSeeFaq)} <a href="${href}" class="app-inline-details-link">${esc(L.faqDetailsLinkText)}</a>.</p>
`.trim();
    }

    _labels() {
        const locale = typeof window.getLocale === 'function' ? window.getLocale() : 'en';
        if (locale === 'ja') {
            return {
                title: '応募フォーム',
                contactSectionTitle: '連絡先と所在地',
                portfolioSectionTitle: 'ポートフォリオ',
                applicationFeeHeading: '応募料',
                selectionProcessTitle: '選考プロセス',
                selectionReview:
                    '応募書類を拝見し、選考委員会が候補者を検討します。ポートフォリオ、経歴、レジデンシーへの適合を総合的に見ます。',
                selectionEmail:
                    '書類選考を通過した候補者には、メールで面談のご案内をお送りします。',
                selectionInterview:
                    '面談では、実践の詳細や、このプログラムで目指すことをお伺いします。',
                selectionFinal:
                    '最終選考の結果は、メールでご連絡します。定員に達するまで複数回の募集を行う場合があります。',
                selectionDepositLine:
                    '参加が確定した場合、{{deposit}} のデポジットを {{deadline}} までにお支払いいただきます。',
                selectionSeeFaq: '日程や料金の詳細は',
                faqDetailsLinkText: 'FAQ とプログラム詳細',
                defaultFeeNoticeItalic:
                    '応募料は返金できません。選考の結果にかかわらず、Fusion プラットフォームのメンバーシップ特典が適用されます。',
                whatsIncludedEmpty: '（このプログラム用の説明がまだありません）',
                whatsIncludedSummary: '応募料に含まれるもの',
                whatsIncludedGlobalHeading: 'すべての応募に共通',
                whatsIncludedPlanHeading: 'この支払いオプションで含まれるもの',
                whatsIncludedPickPlan: 'プラン固有の内容を表示するには、上で支払い方法を選んでください。',
                whatsIncludedGlobalEmpty: '（まだグローバル項目がありません。Studio の Services → Subscription で設定できます。）',
                paymentFeeLead:
                    '下から支払い方法を選び、安全なフォームにカード情報を入力して応募を完了してください。',
                paymentPlanGroupLabel: '応募料の支払い方法',
                paymentPlaceholderNoSelection: '上のいずれかのオプションを選ぶと、カード入力フォームが表示されます。',
                suggestedBadge: 'おすすめ',
                planOneTimeTitle: '1. 一回払い（応募料のみ）',
                planOneTimeSub: '一度だけのお支払い',
                planBimonthlyTitle: '2. 応募料＋サブスクリプション',
                planBimonthlyPriceLine: '$50',
                planBimonthlyEvery: '2か月ごと',
                planBimonthlySub1: '応募料を含みます',
                planBimonthlySub2: '2か月ごとに更新',
                planAnnualTitle: '3. 応募料＋年間サブスクリプション',
                planAnnualPrice: '$260',
                planAnnualDiscount: '（10% 割引）',
                planAnnualSub1: '応募料を含みます',
                planAnnualSub2: '毎年更新',
                oneTimePlanUnavailable:
                    '一回払いの金額がプログラムに設定されていません。Studio で「Application fee amount (cents)」を設定してください。',
                selectPaymentPlanFirst: '支払いオプションを選んでください。',
                paymentStillLoading: '決済フォームの準備中です。しばらくお待ちください。',
                payAndSubmitApplication: '支払って応募を送信',
                paymentSupportPrefix: 'ご不明点は ',
                paymentSupportSuffix: ' までお問い合わせください。',
                emailRequiredForPayment: '決済の前に、有効なメールアドレスをフォーム上部に入力してください。',
                lead1: '連絡先と所在地を入力してください。',
                lead2:
                    '正解よりも、あなたの視点や文脈を知りたいと考えています。率直にご記入のうえ、下の応募料でお支払い・送信を完了してください。',
                lead2MemberFeeWaived:
                    'Fusion メンバーのため、応募料は含まれています。内容を入力して、下のボタンから応募を送信してください。',
                memberFeeWaivedBanner:
                    'Fusion メンバーシップに応募料が含まれます。カードでのお支払いは不要です。',
                submitApplicationOnly: '応募を送信',
                lead2AlreadyApplied:
                    '応募内容を更新して保存できます。追加の応募料はかかりません。',
                firstName: '名（ファーストネーム）',
                lastName: '姓（ラストネーム）',
                email: 'メールアドレス',
                country: '国',
                stateProvince: '州 / 省 / 都道府県（任意）',
                city: '市区町村',
                step0FillRequired: '名・姓・メール・国・市区町村を入力してください。',
                step0InvalidEmail: '有効なメールアドレスを入力してください。',
                website: 'あなたの世界をどこで体験できますか？',
                websiteByline: '（ウェブサイト、ポートフォリオ、作品を置いている場所 — リンク可）',
                discipline: 'いま、実践をどう定義していますか？',
                disciplineByline: '（分野や、やり方の呼び方 — カテゴリに当てはまらなくても構いません）',
                bioStatement: 'アーティストとして、ひとりの人として、あなたについて教えてください。',
                bioStatementByline: '（短い経歴でも、もっと個人的なことでも — 正直に書ける方）',
                exploration: 'いま探求・問いかけ・変化の途中にあることは何ですか？',
                explorationByline: '（制作や生活で、いま前に引っ張られているもの）',
                residencyGoals: 'このレジデンシーに参加したら、内面でも外面でも、何を持ち帰りたいですか？',
                residencyGoalsByline: '（作品、視点の変化、つながり、言葉にしにくいものでも）',
                submitError: '送信に失敗しました。もう一度お試しください。',
                submitNoAccount:
                    'この Internet Identity には Fusion のメンバーアカウントがありません。参加（Join）の登録を完了するか、アーティストとして紐づいたアカウントでサインインしてください。管理者だけの II では応募できません。',
                submitNoLinkedArtist:
                    'アカウントに紐づくアーティストプロフィールがありません。Studio でロスターと紐づけてもらうか、アーティストとリンクされた II でサインインしてください。',
                submitSuccess: '応募を受け付けました。',
                submitting: '送信中…',
                submitReceivedTitle: '応募を受け付けました。',
                submitReceivedBody: 'プロフィールダッシュボードで進捗を確認できます。',
                alreadyApplied: 'このプログラムには既に応募済みです。下のボタンで内容を更新して保存できます（追加の応募料はありません）。',
                saveApplicationUpdates: '応募内容を保存',
                payAndSubmit: '支払って送信',
                paymentPreparing: '決済フォームを準備しています…',
                paymentLoadingForm: 'カード入力フォームを読み込み中…',
                paymentConfigureServices: 'Studio → Services で Integration API と Stripe の公開鍵を設定してください。',
                paymentFailed: 'お支払いを完了できませんでした。もう一度お試しください。',
                required: '必須',
                feeInfoTrigger: '応募料に含まれるもの',
                feeInfoP1:
                    '応募料には、Fusion プラットフォームの2か月分のメンバーシップが含まれます。その期間中にプロフィールを整え、ギャラリー、コレクター、キュレターとのつながりを始められます。',
                feeInfoP2:
                    'メンバーシップでは、他の Fusion プログラムへの応募も、追加の応募料なしで行えます。選考が進むなかでも応募料の価値を最大限に活かし、レジデンシー以外にも、より深い関わりの選択肢を用意しています。',
                feeInfoP3:
                    'お支払いが完了し応募が送信されたあと、プロフィールのダッシュボードから、いつでもサブスクリプションの内容を更新したり、解約したりできます。',
            };
        }
        return {
            title: 'Application Form',
            contactSectionTitle: 'Contact & location',
            portfolioSectionTitle: 'Portfolio',
            applicationFeeHeading: 'Application fee',
            selectionProcessTitle: 'Selection process',
            selectionReview:
                'We review applications and shortlist candidates based on your materials, background, and fit for the residency.',
            selectionEmail: 'If you advance past the document review, we will email you to schedule an interview.',
            selectionInterview:
                'The interview is a conversation about your practice and what you hope to explore in the program.',
            selectionFinal:
                'Final decisions are communicated by email. We may run more than one round of applications until the cohort is filled.',
            selectionDepositLine:
                'If you are offered a place, a deposit of {{deposit}} is due to secure your slot, with final payment due by {{deadline}}.',
            selectionSeeFaq: 'For dates and costs, see',
            faqDetailsLinkText: 'FAQ and program details',
            defaultFeeNoticeItalic:
                'The application fee is non-refundable. Regardless of selection outcome, your Fusion platform membership benefits apply as described.',
            whatsIncludedEmpty: '(No program-specific description yet.)',
            whatsIncludedSummary: "What's included in the application fee",
            whatsIncludedGlobalHeading: 'Included with every application',
            whatsIncludedPlanHeading: 'Included with this payment option',
            whatsIncludedPickPlan: 'Select a payment option above to see plan-specific items.',
            whatsIncludedGlobalEmpty: '(No global items yet — configure under Studio → Services → Subscription.)',
            paymentFeeLead:
                'Choose a payment option below, then enter your card in the secure form and submit to complete your application.',
            paymentPlanGroupLabel: 'Application fee payment options',
            paymentPlaceholderNoSelection: 'Select an option above to load the secure card form.',
            suggestedBadge: 'Suggested',
            planOneTimeTitle: '1. Single Application Payment',
            planOneTimeSub: 'One-time payment',
            planBimonthlyTitle: '2. Application + Subscription',
            planBimonthlyPriceLine: '$50',
            planBimonthlyEvery: 'every 2 months',
            planBimonthlySub1: 'Includes application fee',
            planBimonthlySub2: 'Renews every 2 months',
            planAnnualTitle: '3. Application + Annual Subscription',
            planAnnualPrice: '$260',
            planAnnualDiscount: '(10% Discount)',
            planAnnualSub1: 'Includes application fee',
            planAnnualSub2: 'Renews every year',
            oneTimePlanUnavailable:
                'One-time payment amount is not set for this program. Add Application fee amount (cents) in Studio.',
            selectPaymentPlanFirst: 'Please select a payment option.',
            paymentStillLoading: 'Payment form is still loading. Please wait.',
            payAndSubmitApplication: 'Pay and submit application',
            paymentSupportPrefix: 'Questions? Email ',
            paymentSupportSuffix: '.',
            emailRequiredForPayment: 'Enter a valid email address in the form above before paying.',
            lead1: 'Enter your name, email, and location.',
            lead2:
                'We’re less interested in perfect answers, more in perspective. Share what feels true to you, then pay the application fee and submit below.',
            lead2MemberFeeWaived:
                'As a Fusion member, your application fee is included. Complete your answers and submit below.',
            memberFeeWaivedBanner:
                'Your Fusion membership includes the program application fee—no card payment required.',
            submitApplicationOnly: 'Submit application',
            lead2AlreadyApplied:
                'You can update your answers below and save. No additional application fee.',
            firstName: 'First name',
            lastName: 'Last name',
            email: 'Email',
            country: 'Country',
            stateProvince: 'State / province / region (optional)',
            city: 'City',
            step0FillRequired:
                'Please fill in first name, last name, email, country, and city before paying or submitting.',
            step0InvalidEmail: 'Please enter a valid email address.',
            website: 'Where can we experience your world?',
            websiteByline: '(Website, portfolio, or any place your work lives — links welcome)',
            discipline: 'How do you define your practice right now?',
            disciplineByline: '(Your discipline, or however you choose to describe what you do — it doesn’t have to fit a category)',
            bioStatement: 'Tell us about yourself, as an artist and as a person.',
            bioStatementByline: '(A short bio, or something more personal — whichever feels more honest to you)',
            exploration: 'What are you currently exploring, questioning, or becoming?',
            explorationByline: '(What’s pulling you forward in your work or life right now)',
            residencyGoals:
                'If you joined this residency, what would you want to leave with — internally or externally?',
            residencyGoalsByline: '(This could be a body of work, a shift in perspective, a connection, or something intangible)',
            submitError: 'Could not submit. Please try again.',
            submitNoAccount:
                'This Internet Identity has no Fusion member account. Finish the Join / registration flow, or sign in with an identity linked to an artist. Admin-only identities (no member profile) cannot submit applications.',
            submitNoLinkedArtist:
                'Your account has no linked artist profile. Ask Fusion to link your roster row in Studio, or sign in with an identity that is linked to an artist.',
            submitSuccess: 'Your application was received.',
            submitting: 'Submitting...',
            submitReceivedTitle: 'Your application was received.',
            submitReceivedBody: 'You can track your progress in your profile dashboard.',
            alreadyApplied:
                'You already applied to this program. Update your answers below and save—no additional application fee.',
            saveApplicationUpdates: 'Save application updates',
            payAndSubmit: 'Pay and submit',
            paymentPreparing: 'Preparing payment…',
            paymentLoadingForm: 'Loading card form…',
            paymentConfigureServices:
                'Configure Integration API URL and Stripe publishable key under Studio → Services.',
            paymentFailed: 'Payment could not be completed. Please try again.',
            required: 'required',
            feeInfoTrigger: "What's included in the application fee?",
            feeInfoP1:
                'Your application fee includes a two-month membership to the Fusion platform. You can use that time to set up your profile and connect with galleries, collectors, and curators.',
            feeInfoP2:
                'Membership also lets you apply to other Fusion programs at no additional application fee, so you get lasting value while selection is ongoing, and a path to deeper connection beyond the residency alone.',
            feeInfoP3:
                'After your payment completes and your application is sent, you can use your profile dashboard to update or cancel your subscription at any time.',
        };
    }

    /**
     * Analytics locale (no PII).
     * @returns {'en' | 'ja'}
     */
    _analyticsLocale() {
        return typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
    }

    /**
     * Shared PostHog props for program application + payment funnels (no PII).
     * @returns {Record<string, string | number | boolean>}
     */
    _posthogApplicationBaseProps() {
        const programId = this.getAttribute('data-program-id') || '';
        const centsRaw = this._programFormContext.applicationFeeAmountCents;
        const oneTimeOk = typeof centsRaw === 'number' && Number.isFinite(centsRaw) && centsRaw >= 50;
        return {
            program_id: programId,
            locale: this._analyticsLocale(),
            one_time_payment_available: oneTimeOk,
            bimonthly_plan_offered: true,
            annual_plan_offered: true,
            fee_waived: !!this._membershipFeeWaived,
            membership_gate: String(this._membershipGate || 'unknown'),
            ...(oneTimeOk ? { application_fee_amount_cents: Math.round(centsRaw) } : {}),
        };
    }

    /**
     * Soft validation for contact fields — avoids native `required` / strict `type=url` friction.
     * @returns {string | null} Error message, or null if OK.
     */
    _validateStep0Soft() {
        const L = this._labels();
        const root = this.shadowRoot;
        const get = (id) => String(root?.querySelector(`#${id}`)?.value ?? '').trim();
        if (!get('app-first-name') || !get('app-last-name') || !get('app-email') || !get('app-country') || !get('app-city')) {
            return L.step0FillRequired;
        }
        if (!isLooseEmail(get('app-email'))) {
            return L.step0InvalidEmail;
        }
        return null;
    }

    /**
     * @param {string} text
     * @param {'error' | 'neutral'} kind
     */
    _setFormStatusMessage(text, kind) {
        const statusEl = this.shadowRoot?.querySelector('#app-form-status');
        if (!statusEl) return;
        statusEl.textContent = text;
        statusEl.classList.toggle('is-error', kind === 'error');
        statusEl.classList.remove('is-success');
    }

    _touchDirty() {
        if (this.getAttribute('active') !== 'true') return;
        const wrap = document.getElementById('programApplicationWrap');
        if (!wrap || wrap.hasAttribute('hidden')) return;
        if (this._dirty) return;
        this._dirty = true;
        this.setAttribute('data-unsaved', 'true');
        if (this._beforeUnloadHooked) return;
        this._beforeUnloadHooked = true;
        this._boundBeforeUnload = (e) => {
            if (!this._dirty) return;
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', this._boundBeforeUnload);
    }

    _clearDirtyState() {
        this._dirty = false;
        this.removeAttribute('data-unsaved');
        if (this._boundBeforeUnload) {
            window.removeEventListener('beforeunload', this._boundBeforeUnload);
            this._boundBeforeUnload = null;
            this._beforeUnloadHooked = false;
        }
    }

    /**
     * Light-DOM node for Stripe (Payment Element cannot mount in closed shadow roots reliably).
     * @returns {HTMLElement}
     */
    _ensureStripeSlotEl() {
        let el = this.querySelector('[slot="app-stripe-mount"]');
        if (!el) {
            el = document.createElement('div');
            el.slot = 'app-stripe-mount';
            el.className = 'app-application-stripe-mount';
            this.appendChild(el);
        }
        return el;
    }

    _teardownStripePayment() {
        this._stripePrepareGen += 1;
        this._stripePaymentReady = false;
        this._stripePrepareKey = '';
        this._fusionPendingId = null;
        this._fusionSubscriptionId = null;
        try {
            this._stripePaymentElement?.unmount();
        } catch {
            /* ignore */
        }
        this._stripePaymentElement = null;
        this._stripeElements = null;
        this._stripe = null;
        const ph = this.shadowRoot?.querySelector('#app-payment-placeholder');
        if (ph instanceof HTMLElement) ph.hidden = false;
    }

    _computeStripePrepareKey() {
        const root = this.shadowRoot;
        const email = String(root?.querySelector('#app-email')?.value ?? '').trim();
        const programId = this.getAttribute('data-program-id') || '';
        const plan = this._paymentPlan || '';
        return `${email}|${programId}|${plan}`;
    }

    /**
     * @param {import('@stripe/stripe-js').StripeElement} paymentElement
     * @returns {Promise<void>}
     */
    _whenPaymentElementReady(paymentElement) {
        return new Promise((resolve, reject) => {
            let settled = false;
            const t = window.setTimeout(() => {
                if (!settled) {
                    settled = true;
                    resolve();
                }
            }, 12000);
            const finish = (fn) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(t);
                fn();
            };
            paymentElement.on('ready', () => finish(() => resolve()));
            paymentElement.on('loaderror', (event) => {
                const msg =
                    event?.error?.message ||
                    event?.message ||
                    'Payment form failed to load.';
                finish(() => reject(new Error(msg)));
            });
        });
    }

    async _prepareStripePayment() {
        if (this._alreadyApplied || this._membershipFeeWaived) return;
        const prepareKey = this._computeStripePrepareKey();
        if (
            this._stripePaymentReady &&
            this._stripe &&
            this._stripeElements &&
            this._stripePrepareKey === prepareKey
        ) {
            return;
        }
        const myGen = ++this._stripePrepareGen;
        try {
            this._stripePaymentElement?.unmount();
        } catch {
            /* ignore */
        }
        this._stripePaymentElement = null;
        this._stripeElements = null;
        this._stripe = null;
        this._stripePaymentReady = false;
        this._fusionPendingId = null;
        this._fusionSubscriptionId = null;

        const root = this.shadowRoot;
        const L = this._labels();
        const payBtn = root?.querySelector('#app-pay-submit');

        const setHint = (text, busy) => {
            this._syncPaymentHintChrome(root, { busy, text });
        };

        if (!this._paymentPlan) {
            setHint('', false);
            if (payBtn) payBtn.disabled = true;
            return;
        }

        const email = String(root?.querySelector('#app-email')?.value ?? '').trim();
        if (!email.includes('@')) {
            setHint(L.emailRequiredForPayment, false);
            if (payBtn) payBtn.disabled = true;
            return;
        }

        const programId = this.getAttribute('data-program-id') || '';
        const pk = getStripePublishableKeyResolved();
        const base = getIntegrationBaseUrl();
        if (!pk || !base) {
            setHint(L.paymentConfigureServices, false);
            if (payBtn) payBtn.disabled = true;
            return;
        }

        let clientSecret = '';
        if (this._paymentPlan === 'one_time') {
            const centsRaw = this._programFormContext.applicationFeeAmountCents;
            const amountCents =
                typeof centsRaw === 'number' && Number.isFinite(centsRaw) && centsRaw >= 50
                    ? Math.round(centsRaw)
                    : null;
            if (amountCents == null) {
                setHint(L.oneTimePlanUnavailable, false);
                if (payBtn) payBtn.disabled = true;
                return;
            }
            if (payBtn) payBtn.disabled = true;
            setHint(L.paymentPreparing, true);
            if (myGen !== this._stripePrepareGen) return;
            try {
                const piRes = await createPaymentIntent(amountCents, 'usd', {
                    programId,
                    purpose: 'program_application',
                    payment_plan: 'one_time',
                });
                if (myGen !== this._stripePrepareGen) return;
                clientSecret = piRes.clientSecret;
            } catch (e) {
                if (myGen !== this._stripePrepareGen) return;
                this._teardownStripePayment();
                const raw = e instanceof Error ? e.message : String(e);
                setHint(mapIntegrationUserMessage(raw, 0), false);
                if (payBtn) payBtn.disabled = true;
                try {
                    posthog.capture('program_application_payment_prepare_failed', {
                        ...this._posthogApplicationBaseProps(),
                        payment_plan: 'one_time',
                        failure_stage: 'payment_intent',
                    });
                } catch {
                    /* ignore */
                }
                return;
            }
        } else {
            if (payBtn) payBtn.disabled = true;
            setHint(L.paymentPreparing, true);
            if (myGen !== this._stripePrepareGen) return;
            try {
                const subRes = await createSubscription({
                    email,
                    payFirst: true,
                    subscriptionTier: this._paymentPlan === 'annual' ? 'annual' : 'bimonthly',
                    metadata: {
                        programId,
                        purpose: 'program_application',
                        payment_plan: this._paymentPlan === 'annual' ? 'subscription_annual' : 'subscription_bimonthly',
                    },
                });
                if (myGen !== this._stripePrepareGen) return;
                clientSecret = subRes.clientSecret;
                this._fusionPendingId = subRes.fusionPendingId || null;
                this._fusionSubscriptionId = subRes.subscriptionId || null;
                setPendingPaymentEmailLocal({
                    email,
                    source: 'application',
                    fusionPendingId: this._fusionPendingId || '',
                    subscriptionId: this._fusionSubscriptionId || '',
                    programId,
                });
            } catch (e) {
                if (myGen !== this._stripePrepareGen) return;
                this._teardownStripePayment();
                const raw = e instanceof Error ? e.message : String(e);
                setHint(mapIntegrationUserMessage(raw, 0), false);
                if (payBtn) payBtn.disabled = true;
                try {
                    posthog.capture('program_application_payment_prepare_failed', {
                        ...this._posthogApplicationBaseProps(),
                        payment_plan: this._paymentPlan === 'annual' ? 'annual' : 'bimonthly',
                        failure_stage: 'subscription',
                    });
                } catch {
                    /* ignore */
                }
                return;
            }
        }

        setHint(L.paymentLoadingForm, true);
        if (myGen !== this._stripePrepareGen) return;
        try {
            const { loadStripe } = await import('@stripe/stripe-js');
            const stripe = await loadStripe(pk);
            if (!stripe) throw new Error('Stripe failed to load');
            if (myGen !== this._stripePrepareGen) return;

            const elements = stripe.elements({
                clientSecret,
                appearance: { theme: 'stripe' },
            });
            const paymentElement = elements.create('payment');
            const mountEl = this._ensureStripeSlotEl();
            await new Promise((r) => requestAnimationFrame(r));
            if (myGen !== this._stripePrepareGen) return;

            const readyPromise = this._whenPaymentElementReady(paymentElement);
            paymentElement.mount(mountEl);
            this._stripe = stripe;
            this._stripeElements = elements;
            this._stripePaymentElement = paymentElement;

            await readyPromise;
            if (myGen !== this._stripePrepareGen) {
                this._teardownStripePayment();
                return;
            }

            this._stripePaymentReady = true;
            this._stripePrepareKey = prepareKey;
            setHint('', false);
            if (payBtn) payBtn.disabled = false;
            const ph = root?.querySelector('#app-payment-placeholder');
            if (ph instanceof HTMLElement) ph.hidden = true;
        } catch (e) {
            if (myGen !== this._stripePrepareGen) return;
            this._teardownStripePayment();
            const raw = e instanceof Error ? e.message : String(e);
            setHint(mapIntegrationUserMessage(raw, 0), false);
            if (payBtn) payBtn.disabled = true;
            try {
                posthog.capture('program_application_payment_prepare_failed', {
                    ...this._posthogApplicationBaseProps(),
                    payment_plan: this._paymentPlan || 'unknown',
                    failure_stage: 'stripe_elements',
                });
            } catch {
                /* ignore */
            }
        }
    }

    async _confirmPayAndSubmit() {
        const L = this._labels();
        const root = this.shadowRoot;
        const statusEl = root?.querySelector('#app-form-status');
        if (!this._paymentPlan) {
            if (statusEl) {
                statusEl.textContent = L.selectPaymentPlanFirst;
                statusEl.classList.add('is-error');
            }
            return;
        }
        if (!this._stripe || !this._stripeElements || !this._stripePaymentReady) {
            if (statusEl) {
                statusEl.textContent = L.paymentStillLoading;
                statusEl.classList.add('is-error');
            }
            return;
        }
        this._setPaySubmittingState(true, L.paymentPreparing);
        if (statusEl) {
            statusEl.textContent = '';
            statusEl.classList.remove('is-error', 'is-success');
        }
        try {
            const { error } = await this._stripe.confirmPayment({
                elements: this._stripeElements,
                confirmParams: {
                    return_url: typeof window !== 'undefined' ? window.location.href : '',
                },
                redirect: 'if_required',
            });
            if (error) {
                const wrapped = new Error(error.message || L.paymentFailed);
                /** @type {{ stripeError?: import('@stripe/stripe-js').StripeError }} */
                const w = /** @type {any} */ (wrapped);
                w.stripeError = error;
                throw wrapped;
            }
            try {
                const email = String(root?.querySelector('#app-email')?.value ?? '').trim();
                const programId = this.getAttribute('data-program-id') || '';
                if (
                    (this._fusionPendingId || this._fusionSubscriptionId) &&
                    email.includes('@')
                ) {
                    sessionStorage.setItem(
                        FUSION_PENDING_APPLICATION_SUB_KEY,
                        JSON.stringify({
                            fusionPendingId: this._fusionPendingId,
                            subscriptionId: this._fusionSubscriptionId,
                            email,
                            programId,
                        })
                    );
                }
                setPendingPaymentEmailLocal({
                    email,
                    source: 'application',
                    fusionPendingId: this._fusionPendingId || '',
                    subscriptionId: this._fusionSubscriptionId || '',
                    programId,
                });
            } catch {
                /* ignore */
            }
            await this._submitApplication();
        } catch (err) {
            const stripeErr =
                err &&
                typeof err === 'object' &&
                'stripeError' in err &&
                /** @type {{ stripeError?: import('@stripe/stripe-js').StripeError }} */ (err).stripeError
                    ? /** @type {{ stripeError?: import('@stripe/stripe-js').StripeError }} */ (err).stripeError
                    : null;
            try {
                posthog.capture('program_application_payment_failed', {
                    ...this._posthogApplicationBaseProps(),
                    payment_plan: this._paymentPlan || 'unknown',
                    failure_stage: 'stripe_confirm',
                    ...(stripeErr && typeof stripeErr === 'object'
                        ? {
                              ...(stripeErr.type ? { stripe_error_type: String(stripeErr.type) } : {}),
                              ...(stripeErr.code ? { stripe_error_code: String(stripeErr.code) } : {}),
                              ...(stripeErr.decline_code ? { stripe_decline_code: String(stripeErr.decline_code) } : {}),
                          }
                        : { error_kind: 'exception' }),
                });
            } catch {
                /* ignore */
            }
            const line = err instanceof Error ? err.message : L.paymentFailed;
            if (statusEl) {
                statusEl.textContent = line;
                statusEl.classList.add('is-error');
            }
        } finally {
            this._setPaySubmittingState(false, '');
        }
    }

    /**
     * Payment fee row: spinner + copy + notice styling (Stripe prepare + pay submit).
     * @param {ShadowRoot | null | undefined} root
     * @param {{ busy?: boolean, text?: string }} opts — `text` omitted leaves copy unchanged
     */
    _syncPaymentHintChrome(root, opts) {
        const busy = !!opts?.busy;
        const text = opts?.text;
        const hint = root?.querySelector('#app-payment-hint');
        const wrap = root?.querySelector('#app-payment-hint-wrap');
        const loadingEl = root?.querySelector('#app-payment-loading');
        if (hint) {
            if (text !== undefined) hint.textContent = text;
            hint.classList.toggle('is-busy', busy);
        }
        if (wrap instanceof HTMLElement) {
            wrap.classList.toggle('is-busy', busy);
            wrap.setAttribute('aria-busy', busy ? 'true' : 'false');
        }
        if (loadingEl instanceof HTMLElement) {
            if (busy) {
                loadingEl.removeAttribute('hidden');
                loadingEl.setAttribute('aria-hidden', 'false');
            } else {
                loadingEl.setAttribute('hidden', '');
                loadingEl.setAttribute('aria-hidden', 'true');
            }
        }
    }

    _setPaySubmittingState(on, text) {
        const root = this.shadowRoot;
        const payBtn = root?.querySelector('#app-pay-submit');
        if (payBtn) {
            payBtn.disabled = on;
            payBtn.classList.toggle('is-loading', on);
        }
        this._syncPaymentHintChrome(root, { busy: on, text });
    }

    _wireControls() {
        const root = this.shadowRoot;
        if (!root) return;

        if (this._wireAbort) this._wireAbort.abort();
        this._wireAbort = new AbortController();
        const { signal } = this._wireAbort;

        const form = root.querySelector('#app-application-form-fields');
        form?.addEventListener(
            'submit',
            (e) => {
                e.preventDefault();
            },
            { signal }
        );

        root.querySelector('#app-pay-submit')?.addEventListener(
            'click',
            () => {
                void this._onPaySubmitClick();
            },
            { signal }
        );
        root.addEventListener(
            'click',
            (e) => {
                const t = e.target;
                if (!(t instanceof Element)) return;
                const a = t.closest('.app-inline-details-link');
                if (!a || !root.contains(a)) return;
                e.preventDefault();
                const id = this._programFormContext.detailsSectionId || 'programDetailsSection';
                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            },
            { signal }
        );

        root.addEventListener(
            'click',
            (e) => {
                const t = e.target;
                if (!(t instanceof Element)) return;
                if (this._alreadyApplied) return;
                const btn = t.closest('[data-app-payment-plan]');
                if (!btn || !root.contains(btn)) return;
                if (btn.hasAttribute('disabled')) return;
                const plan = btn.getAttribute('data-app-payment-plan');
                if (plan === 'one_time' || plan === 'bimonthly' || plan === 'annual') {
                    this._onPaymentPlanSelected(plan);
                }
            },
            { signal }
        );

        form?.addEventListener('input', () => this._touchDirty(), { passive: true, signal });
        form?.addEventListener('change', () => this._touchDirty(), { passive: true, signal });

        root.querySelector('#app-submit-updates')?.addEventListener(
            'click',
            () => {
                void this._onSubmitUpdatesClick();
            },
            { signal }
        );

        root.querySelector('#app-submit-free')?.addEventListener(
            'click',
            () => {
                void this._onSubmitFreeClick();
            },
            { signal }
        );

        window.addEventListener(
            'fusion-localechange',
            () => {
                this._hydrateProgramContextInDom();
            },
            { signal }
        );

        window.addEventListener(
            'fusion-auth-change',
            () => {
                void this._hydrateMembershipAndPrefill();
            },
            { signal }
        );
    }

    async _onPaySubmitClick() {
        const err = this._validateStep0Soft();
        if (err) {
            this._setFormStatusMessage(err, 'error');
            return;
        }
        this._setFormStatusMessage('', 'neutral');
        await this._confirmPayAndSubmit();
    }

    /**
     * Sync payment vs. member-waiver vs. already-applied sections (mutually exclusive).
     */
    _syncApplicationFeeUi() {
        const root = this.shadowRoot;
        if (!root) return;
        const L = this._labels();
        const pay = root.querySelector('#app-payment-section');
        const updatesWrap = root.querySelector('#app-submit-updates-wrap');
        const freeWrap = root.querySelector('#app-submit-free-wrap');
        const banner = root.querySelector('#app-membership-fee-waived-banner');
        const lead = root.querySelector('#app-portfolio-lead');

        if (this._alreadyApplied) {
            if (pay instanceof HTMLElement) pay.setAttribute('hidden', '');
            if (updatesWrap instanceof HTMLElement) updatesWrap.removeAttribute('hidden');
            if (freeWrap instanceof HTMLElement) freeWrap.setAttribute('hidden', '');
            if (banner instanceof HTMLElement) banner.setAttribute('hidden', '');
            if (lead) lead.textContent = L.lead2AlreadyApplied;
            this._teardownStripePayment();
            return;
        }
        if (this._membershipFeeWaived) {
            if (pay instanceof HTMLElement) pay.setAttribute('hidden', '');
            if (updatesWrap instanceof HTMLElement) updatesWrap.setAttribute('hidden', '');
            if (freeWrap instanceof HTMLElement) freeWrap.removeAttribute('hidden');
            if (banner instanceof HTMLElement) banner.removeAttribute('hidden');
            if (lead) lead.textContent = L.lead2MemberFeeWaived;
            this._teardownStripePayment();
            return;
        }
        if (pay instanceof HTMLElement) pay.removeAttribute('hidden');
        if (updatesWrap instanceof HTMLElement) updatesWrap.setAttribute('hidden', '');
        if (freeWrap instanceof HTMLElement) freeWrap.setAttribute('hidden', '');
        if (banner instanceof HTMLElement) banner.setAttribute('hidden', '');
        if (lead) lead.textContent = L.lead2;
    }

    /**
     * @param {boolean} on
     */
    _applyAlreadyAppliedUi(on) {
        this._alreadyApplied = !!on;
        this._syncApplicationFeeUi();
    }

    async _hydrateMembershipAndPrefill() {
        this._membershipFeeWaived = false;
        this._membershipGate = 'unknown';
        try {
            const snap = await getAuthSnapshot();
            if (!snap.authenticated) {
                this._membershipGate = 'noAccount';
            } else {
                const gate = await getMembershipAccessForCaller();
                this._membershipGate = gate;
                if (gate === 'ok' || gate === 'exempt') {
                    const ens = await ensureMyLinkedArtistProfile();
                    if (ens === 'ok' || ens === 'alreadyLinked') {
                        this._membershipFeeWaived = true;
                    }
                }
            }
        } catch {
            this._membershipFeeWaived = false;
        }
        this._syncApplicationFeeUi();
        await this._prefillFromArtist();
        if (this.shadowRoot) this._hydrateProgramContextInDom();
        if (!this._hasCapturedProgramApplicationStarted) {
            this._hasCapturedProgramApplicationStarted = true;
            try {
                posthog.capture('program_application_started', {
                    ...this._posthogApplicationBaseProps(),
                });
            } catch {
                /* ignore */
            }
        }
    }

    async _onSubmitUpdatesClick() {
        if (!this._alreadyApplied) return;
        const err = this._validateStep0Soft();
        if (err) {
            this._setFormStatusMessage(err, 'error');
            return;
        }
        this._setFormStatusMessage('', 'neutral');
        await this._submitApplication();
    }

    async _onSubmitFreeClick() {
        if (!this._membershipFeeWaived || this._alreadyApplied) return;
        const err = this._validateStep0Soft();
        if (err) {
            this._setFormStatusMessage(err, 'error');
            return;
        }
        this._setFormStatusMessage('', 'neutral');
        await this._submitApplication();
    }

    /**
     * @param {'one_time' | 'bimonthly' | 'annual'} plan
     */
    _onPaymentPlanSelected(plan) {
        if (this._alreadyApplied || this._membershipFeeWaived) return;
        if (plan === 'one_time') {
            const centsRaw = this._programFormContext.applicationFeeAmountCents;
            const ok = typeof centsRaw === 'number' && Number.isFinite(centsRaw) && centsRaw >= 50;
            if (!ok) return;
        }
        const err = this._validateStep0Soft();
        if (err) {
            this._setFormStatusMessage(err, 'error');
            return;
        }
        this._setFormStatusMessage('', 'neutral');
        this._paymentPlan = plan;
        this._syncPaymentPlanUi();
        this._teardownStripePayment();
        try {
            posthog.capture('program_application_payment_plan_selected', {
                ...this._posthogApplicationBaseProps(),
                payment_plan: plan,
            });
        } catch {
            /* ignore */
        }
        void this._prepareStripePayment();
    }

    _syncPaymentPlanUi() {
        const root = this.shadowRoot;
        if (!root) return;
        const plan = this._paymentPlan;
        root.querySelectorAll('[data-app-payment-plan]').forEach((el) => {
            if (!(el instanceof HTMLElement)) return;
            const p = el.getAttribute('data-app-payment-plan');
            const sel = p === plan;
            el.classList.toggle('is-selected', sel);
            el.setAttribute('aria-checked', sel ? 'true' : 'false');
        });
        const payBtn = root.querySelector('#app-pay-submit');
        if (payBtn instanceof HTMLElement) {
            if (!plan) payBtn.setAttribute('hidden', '');
            else payBtn.removeAttribute('hidden');
        }
        this._hydrateWhatsIncludedForPlan();
    }

    /**
     * @returns {Record<string, string>}
     */
    _collectPayload() {
        const root = this.shadowRoot;
        const get = (id) => root?.querySelector(`#${id}`)?.value ?? '';
        const websiteRaw = String(get('app-website')).trim();
        return {
            firstName: String(get('app-first-name')).trim(),
            lastName: String(get('app-last-name')).trim(),
            email: String(get('app-email')).trim(),
            country: String(get('app-country')).trim(),
            stateProvince: String(get('app-state')).trim(),
            city: String(get('app-city')).trim(),
            website: normalizeWebsiteForPayload(websiteRaw),
            discipline: String(get('app-discipline')).trim(),
            bioStatement: String(get('app-bio')).trim(),
            exploration: String(get('app-exploration')).trim(),
            residencyGoals: String(get('app-goals')).trim(),
        };
    }

    async _submitApplication() {
        const root = this.shadowRoot;
        const statusEl = root?.querySelector('#app-form-status');
        const programId = this.getAttribute('data-program-id') || '';
        const L = this._labels();
        if (!programId) {
            if (statusEl) {
                statusEl.textContent = 'Missing program id.';
                statusEl.classList.add('is-error');
            }
            return;
        }
        const step0Err = this._validateStep0Soft();
        if (step0Err) {
            if (statusEl) {
                statusEl.textContent = step0Err;
                statusEl.classList.add('is-error');
            }
            return;
        }
        if (statusEl) {
            statusEl.textContent = '';
            statusEl.classList.remove('is-error', 'is-success');
        }
        const payload = this._collectPayload();
        this._setSubmittingState(true, L.submitting);
        try {
            await submitProgramApplication(programId, payload);
            posthog.capture('program_application_submitted', {
                ...this._posthogApplicationBaseProps(),
                ...(this._paymentPlan ? { payment_plan: this._paymentPlan } : {}),
            });
            try {
                const snap = await getAuthSnapshot();
                const em = String(payload.email || '').trim();
                if (snap.authenticated && em.includes('@')) {
                    setStoredBillingEmailForPrincipal(snap.principal.toText(), em);
                }
                clearPendingPaymentEmailLocal('application');
            } catch {
                /* ignore */
            }
            if (statusEl) statusEl.classList.add('is-success');
            this._clearDirtyState();
            this._showSubmitSuccess(programId);
        } catch (err) {
            const code = err && typeof err === 'object' && 'code' in err ? String(/** @type {{ code?: unknown }} */ (err).code) : '';
            const raw = err instanceof Error ? err.message : String(err);
            const blob = `${raw} ${err && typeof err === 'object' && 'message' in err ? String(/** @type {{ message?: unknown }} */ (err).message) : ''}`;
            let line = L.submitError;
            if (code === PROGRAM_APPLICATION_ERROR_CODE.NO_ACCOUNT || /No account for caller/i.test(blob)) {
                line = L.submitNoAccount;
            } else if (code === PROGRAM_APPLICATION_ERROR_CODE.NO_LINKED_ARTIST || /No linked artist on account/i.test(blob)) {
                line = L.submitNoLinkedArtist;
            } else if (
                raw &&
                raw.length < 280 &&
                !/Request ID:|Reject code:|ic0\.trap|Canister called/i.test(raw)
            ) {
                line = raw;
            }
            posthog.capture('program_application_failed', {
                ...this._posthogApplicationBaseProps(),
                error_code: code || 'unknown',
                ...(this._paymentPlan ? { payment_plan: this._paymentPlan } : {}),
            });
            if (statusEl) {
                statusEl.textContent = line;
                statusEl.classList.add('is-error');
            }
            if (typeof console !== 'undefined' && console.error) {
                console.error('[ApplicationForm]', err);
            }
        } finally {
            this._setSubmittingState(false, '');
        }
    }

    _setSubmittingState(on, text) {
        const root = this.shadowRoot;
        const form = root?.querySelector('#app-application-form-fields');
        const statusEl = root?.querySelector('#app-form-status');
        const submitBtn = root?.querySelector('.app-btn[type="submit"]');
        if (form) {
            form.classList.toggle('is-submitting', on);
            form.querySelectorAll('input, textarea, select, button').forEach((el) => {
                if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || el instanceof HTMLButtonElement) {
                    el.disabled = on;
                }
            });
        }
        if (submitBtn) submitBtn.classList.toggle('is-loading', on);
        if (statusEl) {
            statusEl.classList.remove('is-error');
            statusEl.textContent = on ? text : statusEl.textContent;
        }
    }

    _showSubmitSuccess(programId) {
        const root = this.shadowRoot;
        if (!root) return;
        const L = this._labels();
        const popup = root.querySelector('#app-submit-success');
        const title = root.querySelector('#app-submit-success-title');
        const body = root.querySelector('#app-submit-success-body');
        if (title) title.textContent = L.submitReceivedTitle;
        if (body) body.textContent = L.submitReceivedBody;
        popup?.removeAttribute('hidden');
        root.querySelector('#app-form-main')?.setAttribute('hidden', '');
        const statusEl = root.querySelector('#app-form-status');
        if (statusEl) {
            statusEl.classList.remove('is-error');
            statusEl.classList.add('is-success');
            statusEl.textContent = '';
        }
        window.dispatchEvent(
            new CustomEvent('fusion-program-application-submitted', {
                detail: { programId, status: 'reviewing' },
            })
        );
    }

    async _prefillFromArtist() {
        const root = this.shadowRoot;
        if (!root) return;
        this._alreadyApplied = false;

        const programId = this.getAttribute('data-program-id') || '';
        let rec;
        try {
            rec = await getMyArtistRecord();
        } catch {
            this._syncApplicationFeeUi();
            return;
        }
        if (!rec) {
            this._syncApplicationFeeUi();
            return;
        }

        const locale = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
        let locales = {};
        try {
            const lj = rec.locales_json ?? rec.localesJson;
            const raw = typeof lj === 'string' ? lj : '';
            locales = raw ? JSON.parse(raw) : {};
        } catch {
            locales = {};
        }
        const block = locales[locale] || locales.en || {};
        const name = String(block.name || '').trim();
        const parts = name.split(/\s+/).filter(Boolean);
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';
        const loc = block.location && typeof block.location === 'object' ? block.location : {};
        const country = String(loc.country || '').trim();
        const stateProvince = String(loc.state || loc.region || '').trim();
        const city = String(loc.city || '').trim();

        const setVal = (id, v) => {
            const el = root.querySelector(`#${id}`);
            if (el && 'value' in el) el.value = v;
        };

        if (firstName) setVal('app-first-name', firstName);
        if (lastName) setVal('app-last-name', lastName);
        if (country) setVal('app-country', country);
        if (stateProvince) setVal('app-state', stateProvince);
        if (city) setVal('app-city', city);
        if (block.discipline) setVal('app-discipline', String(block.discipline));

        const draft = getProfileSetupDraft();
        const nameParts = String(draft.fullName || '').trim().split(/\s+/).filter(Boolean);
        const draftFirst = nameParts[0] || '';
        const draftLast = nameParts.slice(1).join(' ');
        const setIfEmpty = (id, v) => {
            if (!v) return;
            const el = root.querySelector(`#${id}`);
            if (!el || !('value' in el)) return;
            if (String(el.value || '').trim()) return;
            el.value = v;
        };
        setIfEmpty('app-first-name', draftFirst);
        setIfEmpty('app-last-name', draftLast);
        setIfEmpty('app-email', String(draft.email || '').trim());

        const webFromLinks = pickWebsiteFromProfileLinks(block.links);
        const bioFromProfile =
            String(block.bio || '').trim() || String(block.bioLong || '').trim();
        setIfEmpty('app-website', webFromLinks);
        setIfEmpty('app-bio', bioFromProfile);

        const appliedRaw = rec.applied_json ?? rec.appliedJson;
        if (programId && appliedRaw) {
            try {
                const applied = typeof appliedRaw === 'string' ? JSON.parse(appliedRaw) : appliedRaw;
                const entry = applied[programId];
                const p = entry && typeof entry === 'object' ? entry.payload : null;
                if (p && typeof p === 'object') {
                    if (p.firstName != null) setVal('app-first-name', String(p.firstName));
                    if (p.lastName != null) setVal('app-last-name', String(p.lastName));
                    if (p.email != null) setVal('app-email', String(p.email));
                    if (p.country != null) setVal('app-country', String(p.country));
                    if (p.stateProvince != null) setVal('app-state', String(p.stateProvince));
                    if (p.city != null) setVal('app-city', String(p.city));
                    if (p.website != null) setVal('app-website', String(p.website));
                    if (p.discipline != null) setVal('app-discipline', String(p.discipline));
                    if (p.bioStatement != null) setVal('app-bio', String(p.bioStatement));
                    if (p.exploration != null) setVal('app-exploration', String(p.exploration));
                    if (p.residencyGoals != null) setVal('app-goals', String(p.residencyGoals));
                }
                const L = this._labels();
                const statusEl = root.querySelector('#app-form-status');
                if (entry && typeof entry === 'object' && statusEl) {
                    statusEl.textContent = L.alreadyApplied;
                    statusEl.classList.remove('is-error');
                    statusEl.classList.add('is-success');
                    this._alreadyApplied = true;
                    this._syncApplicationFeeUi();
                    window.dispatchEvent(
                        new CustomEvent('fusion-program-application-submitted', {
                            detail: { programId, status: 'reviewing' },
                        })
                    );
                }
            } catch {
                /* ignore */
            }
        }
        this._syncApplicationFeeUi();
    }

    _afterRender() {
        this._wireControls();
        void this._hydrateMembershipAndPrefill();
    }

    disconnectedCallback() {
        this._clearDirtyState();
        if (this._wireAbort) {
            this._wireAbort.abort();
            this._wireAbort = null;
        }
        this._teardownStripePayment();
    }

    connectedCallback() {
        this.render();
        this._afterRender();
    }

    render() {
        this._paymentPlan = null;
        this._alreadyApplied = false;
        this._membershipFeeWaived = false;
        this._membershipGate = 'unknown';
        this._hasCapturedProgramApplicationStarted = false;
        this._teardownStripePayment();
        const L = this._labels();
        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    box-sizing: border-box;
                    padding: clamp(2rem, 5vw, 3.5rem) 0 clamp(3rem, 8vw, 5rem);
                }

                .application-form-root {
                    width: 100%;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 clamp(1rem, 4vw, 2rem);
                    box-sizing: border-box;
                }

                .app-form-title {
                    margin: 0 0 clamp(1.25rem, 3vw, 2rem);
                    text-align: center;
                    font-size: clamp(1.25rem, 2.5vw, 1.75rem);
                    font-variation-settings: var(--fv-headline-wide);
                    color: var(--c2);
                    letter-spacing: 0.04em;
                }

                #app-form-main[hidden] {
                    display: none !important;
                }

                .app-selection-intro {
                    max-width: 820px;
                    margin: 0 auto clamp(1.5rem, 4vw, 2.25rem);
                    padding: clamp(1rem, 2.5vw, 1.5rem);
                    box-sizing: border-box;
                    border: 1px solid var(--c2);
                    background: var(--c3);
                    font-size: clamp(0.88rem, 1.1vw, 0.98rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    line-height: 1.55;
                }

                .app-selection-intro .app-selection-process-heading {
                    margin: 0 0 0.65rem;
                    font-size: clamp(1rem, 1.35vw, 1.2rem);
                    font-variation-settings: var(--fv-title);
                    letter-spacing: 0.02em;
                }

                .app-selection-intro p {
                    margin: 0 0 0.5rem;
                }

                .app-selection-intro a.app-inline-details-link {
                    color: inherit;
                    text-decoration: underline;
                    text-underline-offset: 0.12em;
                }

                .app-form-card {
                    max-width: 820px;
                    margin: 0 auto;
                    padding: clamp(1.25rem, 3vw, 2rem);
                    box-sizing: border-box;
                    background: var(--c3);
                    border: 1px solid var(--c2);
                    touch-action: pan-y;
                }

                .app-form-card--spaced {
                    margin-top: clamp(1.25rem, 3vw, 2rem);
                }

                .app-form-card--payment {
                    margin-top: clamp(1.25rem, 3vw, 2rem);
                }

                .app-payment-fee-lead {
                    margin: 0 0 1rem;
                    font-size: clamp(0.88rem, 1.1vw, 0.98rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    line-height: 1.5;
                    opacity: 0.95;
                }

                .app-payment-plan-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 0.75rem;
                    align-items: stretch;
                    margin: 0 0 1.25rem;
                }

                @media (max-width: 900px) {
                    .app-payment-plan-grid {
                        grid-template-columns: 1fr;
                    }
                }

                .app-payment-plan-wrap {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    min-height: 100%;
                }

                .app-payment-plan-wrap--suggested {
                    padding-top: 0.65rem;
                }

                .app-payment-plan-suggested-badge {
                    position: absolute;
                    top: 0;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 1;
                    padding: 0.2rem 0.55rem;
                    border-radius: 999px;
                    font-size: clamp(0.65rem, 0.75vw, 0.72rem);
                    font-variation-settings: var(--fv-caption);
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    background: #2e7d4a;
                    color: var(--c3);
                    white-space: nowrap;
                }

                .app-payment-plan-card {
                    position: relative;
                    display: flex;
                    gap: 0.65rem;
                    align-items: flex-start;
                    width: 100%;
                    min-height: 100%;
                    margin: 0;
                    padding: 0.85rem 0.75rem;
                    box-sizing: border-box;
                    border: 1px solid rgba(0, 0, 0, 0.18);
                    border-radius: 4px;
                    background: var(--c3);
                    color: var(--c2);
                    text-align: left;
                    cursor: pointer;
                    font-family: inherit;
                    transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
                }

                .app-payment-plan-card:hover:not([disabled]) {
                    border-color: var(--c2);
                }

                .app-payment-plan-card.is-selected {
                    border: 2px solid var(--c4);
                    background: rgba(0, 0, 0, 0.02);
                    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04);
                }

                .app-payment-plan-card[disabled],
                .app-payment-plan-card.is-unavailable {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .app-payment-plan-radio {
                    flex-shrink: 0;
                    width: 18px;
                    height: 18px;
                    margin-top: 0.15rem;
                    border: 2px solid var(--c2);
                    border-radius: 50%;
                    box-sizing: border-box;
                    background: var(--c3);
                }

                .app-payment-plan-card.is-selected .app-payment-plan-radio {
                    border-color: var(--c4);
                    box-shadow: inset 0 0 0 3px var(--c3);
                    background: var(--c4);
                }

                .app-payment-plan-card-body {
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                    min-width: 0;
                }

                .app-payment-plan-title {
                    font-size: clamp(0.82rem, 1vw, 0.92rem);
                    font-variation-settings: var(--fv-body-wide);
                    font-weight: 600;
                    line-height: 1.35;
                    color: var(--c2);
                }

                .app-payment-plan-price-row {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: baseline;
                    gap: 0.35rem 0.5rem;
                }

                .app-payment-plan-price {
                    font-size: clamp(1.15rem, 1.5vw, 1.45rem);
                    font-variation-settings: var(--fv-emphasis);
                    color: var(--c2);
                }

                .app-payment-plan-every,
                .app-payment-plan-discount {
                    font-size: clamp(0.78rem, 0.95vw, 0.88rem);
                    font-variation-settings: var(--fv-caption);
                    opacity: 0.85;
                }

                .app-payment-plan-discount {
                    color: #2e7d4a;
                    font-weight: 600;
                }

                .app-payment-plan-sub {
                    font-size: clamp(0.75rem, 0.9vw, 0.84rem);
                    font-variation-settings: var(--fv-caption);
                    opacity: 0.78;
                    line-height: 1.4;
                }

                .app-step-heading {
                    margin: 0 0 0.5rem;
                    font-size: clamp(1rem, 1.35vw, 1.2rem);
                    font-variation-settings: var(--fv-title);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                }

                .app-step-lead {
                    margin: 0 0 1.25rem;
                    font-size: clamp(0.88rem, 1.1vw, 0.98rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    line-height: 1.5;
                    opacity: 0.92;
                }

                .app-field {
                    margin-bottom: 1rem;
                }

                .app-field label {
                    display: block;
                    margin-bottom: 0.25rem;
                    font-size: clamp(0.8rem, 1vw, 0.9rem);
                    font-variation-settings: var(--fv-label);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                }

                .app-field-byline {
                    margin: 0 0 0.5rem;
                    font-size: clamp(0.62rem, 0.72vw, 0.74rem);
                    font-variation-settings: var(--fv-caption);
                    color: var(--c2);
                    line-height: 1.4;
                    letter-spacing: 0.01em;
                    opacity: 0.78;
                }

                .app-field input,
                .app-field select,
                .app-field textarea {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 0.55rem 0.65rem;
                    border: 1px solid rgba(0, 0, 0, 0.2);
                    background: var(--c3);
                    color: var(--c2);
                    font-family: inherit;
                    font-size: clamp(0.88rem, 1.1vw, 1rem);
                    font-variation-settings: var(--fv-body);
                    touch-action: manipulation;
                }

                .app-field textarea {
                    min-height: 120px;
                    resize: vertical;
                }

                .app-field--card-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.75rem;
                }

                @media (max-width: 480px) {
                    .app-field--card-row {
                        grid-template-columns: 1fr;
                    }
                }

                .app-application-fee-line {
                    margin: 0 0 0.35rem;
                    font-size: clamp(1rem, 1.2vw, 1.15rem);
                    font-variation-settings: var(--fv-emphasis);
                    color: var(--c2);
                }

                .app-fee-notice-italic {
                    margin: 0 0 1rem;
                    font-size: clamp(0.86rem, 1.05vw, 0.96rem);
                    font-variation-settings: var(--fv-body-wide);
                    font-style: italic;
                    line-height: 1.5;
                    color: var(--c2);
                    opacity: 0.92;
                }

                .app-whats-included-details {
                    margin: 0 0 1rem;
                    border: 1px solid rgba(0, 0, 0, 0.12);
                    padding: 0.5rem 0.75rem;
                    background: var(--c3);
                }

                .app-whats-included-details[hidden] {
                    display: none !important;
                }

                .app-whats-included-details summary {
                    cursor: pointer;
                    font-size: clamp(0.88rem, 1.05vw, 0.98rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                }

                .app-whats-included-body {
                    margin: 0.5rem 0 0;
                    font-size: clamp(0.86rem, 1vw, 0.95rem);
                    font-variation-settings: var(--fv-body-wide);
                    line-height: 1.55;
                    color: var(--c2);
                }

                .app-whats-included-subhead {
                    margin: 0.65rem 0 0.2rem;
                    font-size: clamp(0.8rem, 0.95vw, 0.9rem);
                    font-variation-settings: var(--fv-label);
                    letter-spacing: 0.02em;
                    opacity: 0.88;
                }

                .app-whats-included-subhead:first-child {
                    margin-top: 0;
                }

                .app-whats-included-body ul {
                    margin: 0.25rem 0 0.5rem;
                    padding-left: 1.25rem;
                }

                .app-whats-included-empty {
                    list-style: none;
                    margin-left: 0;
                    padding-left: 0;
                    opacity: 0.82;
                }

                .app-payment-placeholder {
                    margin: 0.75rem 0 1rem;
                    padding: 1.25rem 1rem;
                    border: 2px dashed rgba(0, 0, 0, 0.22);
                    border-radius: 2px;
                    text-align: center;
                    font-size: clamp(0.82rem, 1vw, 0.92rem);
                    font-variation-settings: var(--fv-caption);
                    color: var(--c2);
                    line-height: 1.45;
                    opacity: 0.88;
                }

                .app-payment-placeholder[hidden] {
                    display: none !important;
                }

                .app-payment-placeholder p {
                    margin: 0.35rem 0;
                }

                .app-form-actions {
                    display: flex;
                    justify-content: center;
                    gap: 0.75rem;
                    margin-top: 1.25rem;
                    flex-wrap: wrap;
                }

                .app-btn {
                    min-width: 120px;
                    padding: 0.55rem 1.25rem;
                    border: 1px solid var(--c2);
                    cursor: pointer;
                    font-family: inherit;
                    font-size: clamp(0.9rem, 1.05vw, 1rem);
                    font-variation-settings: var(--fv-cta);
                    letter-spacing: 0.03em;
                    transition: background 0.2s ease, color 0.2s ease;
                }

                .app-btn--primary {
                    background: var(--c5);
                    color: var(--c2);
                }

                .app-btn--primary:hover {
                    background: var(--c2);
                    color: var(--c3);
                }

                .app-btn--ghost {
                    background: transparent;
                    color: var(--c2);
                }

                .app-btn--ghost:hover {
                    background: rgba(0, 0, 0, 0.05);
                }

                @keyframes app-submit-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.45; }
                }

                #app-application-form-fields.is-submitting {
                    opacity: 0.8;
                    pointer-events: none;
                }

                .app-btn.is-loading {
                    animation: app-submit-pulse 0.85s ease-in-out infinite;
                }

                .app-form-status {
                    margin-top: 1rem;
                    font-size: clamp(0.85rem, 1vw, 0.95rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    min-height: 1.25em;
                }

                .app-form-status.is-error {
                    color: #8b2942;
                }

                .app-form-status.is-success {
                    opacity: 0.9;
                }

                .app-submit-success {
                    max-width: 760px;
                    margin: 0.5rem auto 0;
                    border: 1px solid var(--c2);
                    background: var(--c3);
                    padding: clamp(1rem, 2vw, 1.35rem);
                    text-align: center;
                }

                .app-submit-success h3 {
                    margin: 0;
                    color: var(--c2);
                    font-size: clamp(1rem, 1.2vw, 1.15rem);
                    font-variation-settings: var(--fv-title);
                }

                .app-submit-success p {
                    margin: 0.45rem 0 0;
                    color: var(--c2);
                    font-size: clamp(0.86rem, 1vw, 0.95rem);
                    line-height: 1.4;
                }

                .app-payment-hint-wrap {
                    display: flex;
                    align-items: center;
                    gap: 0.65rem;
                    margin: 0.5rem 0;
                    min-height: 1.5em;
                    border-radius: 4px;
                    transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
                }

                .app-payment-hint-wrap.is-busy {
                    margin: 0.85rem 0 1.1rem;
                    padding: 0.95rem 1.1rem;
                    border: 1px solid var(--c2);
                    background: linear-gradient(180deg, rgba(0, 0, 0, 0.045) 0%, rgba(0, 0, 0, 0.02) 100%);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
                    gap: 0.85rem;
                    min-height: 3.1rem;
                    align-items: center;
                }

                #app-payment-loading {
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                #app-payment-loading[hidden] {
                    display: none !important;
                }

                .app-payment-spinner {
                    display: block;
                    width: 26px;
                    height: 26px;
                    box-sizing: border-box;
                    border: 2px solid rgba(0, 0, 0, 0.14);
                    border-top-color: var(--c4, var(--c2));
                    border-right-color: rgba(0, 0, 0, 0.1);
                    border-radius: 50%;
                    animation: app-payment-spin 0.72s linear infinite;
                }

                @keyframes app-payment-spin {
                    to {
                        transform: rotate(360deg);
                    }
                }

                #app-payment-hint {
                    margin: 0;
                    flex: 1;
                    font-size: clamp(0.82rem, 1vw, 0.92rem);
                    font-variation-settings: var(--fv-caption);
                    color: var(--c2);
                    min-height: 1.5em;
                    line-height: 1.45;
                }

                #app-payment-hint.is-busy {
                    font-size: clamp(0.92rem, 1.15vw, 1.05rem);
                    font-variation-settings: var(--fv-body-wide);
                    font-weight: 600;
                    letter-spacing: 0.02em;
                    opacity: 1;
                }

                .app-payment-slot-wrap {
                    margin: 0.25rem 0 0.75rem;
                    min-height: 100px;
                    width: 100%;
                }

                ::slotted(.app-application-stripe-mount) {
                    display: block;
                    width: 100%;
                    min-height: 100px;
                }

                .app-payment-support {
                    margin: 1rem 0 0;
                    font-size: clamp(0.82rem, 1vw, 0.92rem);
                    font-variation-settings: var(--fv-body-wide);
                    text-align: center;
                    color: var(--c2);
                    line-height: 1.45;
                    opacity: 0.9;
                }

                .app-payment-mail {
                    color: inherit;
                    text-underline-offset: 0.12em;
                }

                #app-payment-section[hidden] {
                    display: none !important;
                }

                #app-submit-updates-wrap[hidden] {
                    display: none !important;
                }
            </style>
            <div class="application-form-root">
                <h2 class="app-form-title">${L.title}</h2>
                <div id="app-form-main">
                    <div id="app-selection-intro" class="app-selection-intro"></div>
                    <form id="app-application-form-fields" novalidate>
                        <div class="app-form-card">
                            <h3 class="app-step-heading">${L.contactSectionTitle}</h3>
                            <p class="app-step-lead">${L.lead1}</p>
                            <div class="app-field app-field--card-row">
                                <div>
                                    <label for="app-first-name">${L.firstName} <span aria-hidden="true">*</span></label>
                                    <input id="app-first-name" name="firstName" type="text" autocomplete="given-name" />
                                </div>
                                <div>
                                    <label for="app-last-name">${L.lastName} <span aria-hidden="true">*</span></label>
                                    <input id="app-last-name" name="lastName" type="text" autocomplete="family-name" />
                                </div>
                            </div>
                            <div class="app-field">
                                <label for="app-email">${L.email} <span aria-hidden="true">*</span></label>
                                <input id="app-email" name="email" type="text" inputmode="email" autocomplete="email" />
                            </div>
                            <div class="app-field">
                                <label for="app-country">${L.country} <span aria-hidden="true">*</span></label>
                                <input id="app-country" name="country" type="text" autocomplete="country-name" />
                            </div>
                            <div class="app-field">
                                <label for="app-state">${L.stateProvince}</label>
                                <input id="app-state" name="stateProvince" type="text" autocomplete="address-level1" />
                            </div>
                            <div class="app-field">
                                <label for="app-city">${L.city} <span aria-hidden="true">*</span></label>
                                <input id="app-city" name="city" type="text" autocomplete="address-level2" />
                            </div>
                        </div>

                        <div class="app-form-card app-form-card--spaced">
                            <h3 class="app-step-heading">${L.portfolioSectionTitle}</h3>
                            <p class="app-step-lead" id="app-portfolio-lead">${L.lead2}</p>
                            <div class="app-field">
                                <label for="app-website">${L.website}</label>
                                <p class="app-field-byline" id="app-website-byline">${L.websiteByline}</p>
                                <input id="app-website" name="website" type="text" inputmode="url" autocomplete="url" placeholder="https://" aria-describedby="app-website-byline" />
                            </div>
                            <div class="app-field">
                                <label for="app-discipline">${L.discipline}</label>
                                <p class="app-field-byline" id="app-discipline-byline">${L.disciplineByline}</p>
                                <input id="app-discipline" name="discipline" type="text" autocomplete="off" aria-describedby="app-discipline-byline" />
                            </div>
                            <div class="app-field">
                                <label for="app-bio">${L.bioStatement}</label>
                                <p class="app-field-byline" id="app-bio-byline">${L.bioStatementByline}</p>
                                <textarea id="app-bio" name="bioStatement" rows="5" aria-describedby="app-bio-byline"></textarea>
                            </div>
                            <div class="app-field">
                                <label for="app-exploration">${L.exploration}</label>
                                <p class="app-field-byline" id="app-exploration-byline">${L.explorationByline}</p>
                                <textarea id="app-exploration" name="exploration" rows="4" aria-describedby="app-exploration-byline"></textarea>
                            </div>
                            <div class="app-field">
                                <label for="app-goals">${L.residencyGoals}</label>
                                <p class="app-field-byline" id="app-goals-byline">${L.residencyGoalsByline}</p>
                                <textarea id="app-goals" name="residencyGoals" rows="4" aria-describedby="app-goals-byline"></textarea>
                            </div>
                        </div>

                        <div id="app-submit-updates-wrap" class="app-form-card app-form-card--spaced" hidden>
                            <div class="app-form-actions">
                                <button type="button" class="app-btn app-btn--primary" id="app-submit-updates">${L.saveApplicationUpdates}</button>
                            </div>
                        </div>

                        <div id="app-membership-fee-waived-banner" class="app-selection-intro" hidden>
                            <p>${L.memberFeeWaivedBanner}</p>
                        </div>
                        <div id="app-submit-free-wrap" class="app-form-card app-form-card--spaced" hidden>
                            <div class="app-form-actions">
                                <button type="button" class="app-btn app-btn--primary" id="app-submit-free">${L.submitApplicationOnly}</button>
                            </div>
                        </div>

                        <div id="app-payment-section" class="app-form-card app-form-card--payment">
                            <h3 class="app-step-heading">${L.applicationFeeHeading}</h3>
                            <p class="app-application-fee-line" id="app-application-fee-line">
                                <span id="app-application-fee-amount"></span>
                            </p>
                            <p id="app-fee-notice-italic" class="app-fee-notice-italic"></p>
                            <p class="app-payment-fee-lead">${L.paymentFeeLead}</p>
                            <div class="app-payment-plan-grid" role="radiogroup" aria-label="${L.paymentPlanGroupLabel}">
                                <button type="button" class="app-payment-plan-card" role="radio" aria-checked="false" data-app-payment-plan="one_time" id="app-plan-one-time">
                                    <span class="app-payment-plan-radio" aria-hidden="true"></span>
                                    <span class="app-payment-plan-card-body">
                                        <span class="app-payment-plan-title" id="app-plan-one-time-title">${L.planOneTimeTitle}</span>
                                        <span class="app-payment-plan-price" id="app-plan-one-time-price">—</span>
                                        <span class="app-payment-plan-sub" id="app-plan-one-time-sub">${L.planOneTimeSub}</span>
                                    </span>
                                </button>
                                <div class="app-payment-plan-wrap app-payment-plan-wrap--suggested">
                                    <span class="app-payment-plan-suggested-badge">${L.suggestedBadge}</span>
                                    <button type="button" class="app-payment-plan-card" role="radio" aria-checked="false" data-app-payment-plan="bimonthly" id="app-plan-bimonthly">
                                        <span class="app-payment-plan-radio" aria-hidden="true"></span>
                                        <span class="app-payment-plan-card-body">
                                            <span class="app-payment-plan-title" id="app-plan-bimonthly-title">${L.planBimonthlyTitle}</span>
                                            <span class="app-payment-plan-price-row">
                                                <span class="app-payment-plan-price" id="app-plan-bimonthly-price">${L.planBimonthlyPriceLine}</span>
                                                <span class="app-payment-plan-every" id="app-plan-bimonthly-every">${L.planBimonthlyEvery}</span>
                                            </span>
                                            <span class="app-payment-plan-sub" id="app-plan-bimonthly-sub1">${L.planBimonthlySub1}</span>
                                            <span class="app-payment-plan-sub" id="app-plan-bimonthly-sub2">${L.planBimonthlySub2}</span>
                                        </span>
                                    </button>
                                </div>
                                <button type="button" class="app-payment-plan-card" role="radio" aria-checked="false" data-app-payment-plan="annual" id="app-plan-annual">
                                    <span class="app-payment-plan-radio" aria-hidden="true"></span>
                                    <span class="app-payment-plan-card-body">
                                        <span class="app-payment-plan-title" id="app-plan-annual-title">${L.planAnnualTitle}</span>
                                        <span class="app-payment-plan-price-row">
                                            <span class="app-payment-plan-price" id="app-plan-annual-price">${L.planAnnualPrice}</span>
                                            <span class="app-payment-plan-discount" id="app-plan-annual-discount">${L.planAnnualDiscount}</span>
                                        </span>
                                        <span class="app-payment-plan-sub" id="app-plan-annual-sub1">${L.planAnnualSub1}</span>
                                        <span class="app-payment-plan-sub" id="app-plan-annual-sub2">${L.planAnnualSub2}</span>
                                    </span>
                                </button>
                            </div>
                            <details id="app-whats-included-details" class="app-whats-included-details">
                                <summary>${L.whatsIncludedSummary}</summary>
                                <div id="app-whats-included-body" class="app-whats-included-body">
                                    <p class="app-whats-included-subhead" id="app-whats-included-global-head"></p>
                                    <ul id="app-whats-included-global-ul"></ul>
                                    <div id="app-whats-included-plan-block">
                                        <p class="app-whats-included-subhead" id="app-whats-included-plan-head"></p>
                                        <ul id="app-whats-included-plan-ul"></ul>
                                    </div>
                                </div>
                            </details>
                            <div id="app-payment-placeholder" class="app-payment-placeholder">
                                <p>${L.paymentPlaceholderNoSelection}</p>
                            </div>
                            <div class="app-payment-slot-wrap">
                                <slot name="app-stripe-mount"></slot>
                            </div>
                            <div id="app-payment-hint-wrap" class="app-payment-hint-wrap" aria-busy="false">
                                <div id="app-payment-loading" class="app-payment-loading" hidden aria-hidden="true">
                                    <span class="app-payment-spinner" role="presentation"></span>
                                </div>
                                <p id="app-payment-hint" aria-live="polite"></p>
                            </div>
                            <div class="app-form-actions">
                                <button type="button" class="app-btn app-btn--primary" id="app-pay-submit" disabled hidden>${L.payAndSubmitApplication}</button>
                            </div>
                            <p class="app-payment-support">
                                ${L.paymentSupportPrefix}
                                <a class="app-payment-mail" href="mailto:info@fusionart.world">info@fusionart.world</a>${L.paymentSupportSuffix}
                            </p>
                        </div>
                    </form>
                </div>

                <p id="app-form-status" class="app-form-status" role="status" aria-live="polite"></p>

                <div id="app-submit-success" class="app-submit-success" hidden>
                    <h3 id="app-submit-success-title"></h3>
                    <p id="app-submit-success-body"></p>
                </div>
            </div>
        `;
    }

}

customElements.define('app-application-form', ApplicationFormComponent);

export { ApplicationFormComponent };
