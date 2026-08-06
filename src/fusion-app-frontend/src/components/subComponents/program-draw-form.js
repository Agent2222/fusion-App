/**
 * Program Draw entry form: contact, world URL, about + award credit / PayPal $50.
 * Visual language matches `<app-application-form>` (same cards, fields, buttons).
 */

import {
    assertProgramApplicationSubmissionReady,
    enterProgramAward,
    ensureMyLinkedArtistProfileForApplication,
    exitProgramAward,
    getAwardCreditsForCaller,
    getMembershipAccessForCaller,
    getMyProgramAwardEntryDetailed,
    getMyProgramPath,
    getProgramDrawConfigPublic,
    invalidateProgramDrawProgressCache,
    PROGRAM_APPLICATION_ERROR_CODE,
    setMyAccountContactForCaller,
} from '../../utils/database.js';
import { categoryToUserRole } from '../../utils/authHeader.js';
import { ERROR_USER_INTERRUPT } from '@dfinity/auth-client';
import {
    dispatchFusionAuthChange,
    getAuthSnapshot,
    loginInternetIdentity,
} from '../../utils/icAuth.js';
import {
    clearAuthenticatedFusionBackendActorCache,
    getAuthenticatedFusionBackendActor,
    submitEarlyAccessToCanister,
} from '../../utils/earlyAccessSubscribe.js';
import {
    confirmPayPalOneTimePayment,
    createPayPalOneTimePayment,
    fetchPaymentConfig,
    getIntegrationBaseUrl,
    linkPayPalSubscriptionToPrincipal,
    savePendingMembershipPayload,
    setPendingPaymentEmailLocal,
    setStoredBillingEmailForPrincipal,
    syncPayPalSubscription,
} from '../../utils/integrationApi.js';
import {
    mountPayPalAdvancedOneTimeCheckout,
    mountPayPalSubscriptionButtons,
} from '../../utils/paymentCheckout.js';
import {
    clearProgramApplicationDraft,
    getProgramApplicationDraft,
    saveProgramApplicationDraft,
} from '../../utils/programApplicationDraft.js';
import { DRAW_ENTRY_FEE_CENTS } from '../../utils/applicantsDrawModel.js';
import { emptyApplicationPaymentOptions } from '../../utils/programApplicationFormContext.js';
import { MEMBERSHIP_TIER_META, planIdForTier } from '../../utils/membershipPlanChange.js';
import { programFormFieldLabels } from '../../utils/programFormCopy.js';
import { getMissingContactFields } from '../../utils/programFormContact.js';
import {
    PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX,
    revealProgramApplicationOrOpenJoin,
    scrollElementTopToViewportGap,
} from '../../utils/scrollAnchorToViewportGap.js';
import { syncPosthogConversionPerson } from '../../utils/posthogConversionIdentity.js';
import { metaTrack } from '../../utils/metaPixel.js';
import { navigate } from '../../router.js';
import posthog from 'posthog-js';
import './program-draw-display.js';
import { invalidateProgramDrawDisplayCache } from './program-draw-display.js';
import './program-draw-notify-modal.js';
import './program-draw-paid-modal.js';
import { ensureProgramDrawFinishModal } from './program-draw-finish-modal.js';
import paymentCardIcon from '../../assets/icons/fusion_svg_icons_b2/payment-card.svg';
import benefitCheckIcon from '../../assets/icons/fusion_svg_icons_b2/benefit-check.svg';
import popularCrownIcon from '../../assets/icons/fusion_svg_icons_b2/popular-crown.svg';
import annualDiamondIcon from '../../assets/icons/fusion_svg_icons_b2/annual-diamond.svg';

/**
 * Remap formal-application payment copy for the draw form.
 * @param {string} text
 * @returns {string}
 */
function remapDrawPaymentLabel(text) {
    return String(text ?? '')
        .replace(/Single\s+Application\s+Payment/gi, 'Program Draw Payment')
        .replace(/Single\s+application\s+processing/gi, 'Program Draw entry processing')
        .replace(/[Rr]esidency\s+[Aa]pplication\s+[Ss]ubmission/g, 'Program Draw entry')
        .replace(/This\s+application\s+included/gi, 'Program Draw entry')
        .replace(/application\s+submission/gi, 'Program Draw entry')
        .replace(/Residency/g, 'Program Draw')
        .replace(/レジデンシー/g, 'プログラム抽選');
}

/**
 * Title-only remap: also turns "Application" → "Entry".
 * @param {string} text
 * @returns {string}
 */
function remapDrawTitle(text) {
    return remapDrawPaymentLabel(text).replace(/\bApplication\b/g, 'Entry');
}

/**
 * @param {string} iconUrl
 * @param {string} [extraClass]
 * @returns {string}
 */
function appFeeIconHtml(iconUrl, extraClass = '') {
    const cls = ['app-fee-icon', extraClass].filter(Boolean).join(' ');
    const url = String(iconUrl || '').replace(/"/g, '');
    return `<span class="${cls}" style="--app-fee-icon-url: url(&quot;${url}&quot;)" aria-hidden="true"></span>`;
}

const DRAW_FORM_COPY = {
    en: {
        title: 'Enter the Program Draw',
        titleInactive: 'Fusion Program Draw',
        aboutSectionTitle: 'About you',
        completeHeading: 'Complete your Program Draw entry',
        paymentHeading: 'Program Draw Payment',
        productCardTitle: 'Program Draw Payment',
        productCardBadge: 'One-time payment',
        creditBadge: 'Award credit',
        creditPriceLabel: 'Included',
        planOneTimeTitle: 'Program Draw Payment – {{price}}',
        planOneTimeSub: 'Draw entry only',
        productCardBullets: [
            'Program Draw entry and review',
            'One entry for this round',
            'No recurring payment',
            'Pay now — sign in after payment to finish entry',
        ],
        paymentPlanGroupLabel: 'Program Draw payment options',
        exploreMembershipsExpand: 'Explore memberships',
        exploreMembershipsCollapse: 'Hide membership options',
        suggestedBadge: 'Recommended',
        planMonthlyTitle: 'Monthly membership',
        planMonthlyPriceLine: '$30',
        planMonthlyEvery: 'per month',
        planQuarterlyTitle: 'Quarterly membership',
        planQuarterlyPriceLine: '$75',
        planQuarterlyEvery: 'per quarter',
        planAnnualTitle: 'Annual membership',
        planAnnualPriceLine: '$260',
        planAnnualEvery: 'per year',
        footerQuestionsPrefix: 'Questions?',
        footerContactUs: 'Contact us',
        useCredit: 'Enter with 1 Program Award entry',
        creditCalloutTitle: 'You’re using 1 Program Award entry',
        creditCalloutBody: (n) =>
            n <= 1
                ? 'This entry uses your available Program Award credit. No payment is required.'
                : `This entry uses 1 of your ${n} Program Award entries. No payment is required.`,
        creditRemainingHint: (n) =>
            n <= 1
                ? 'After this entry you will have 0 left until your next membership grant.'
                : `After this entry you will have ${n - 1} left.`,
        payHint: (dollars) =>
            `No Program Award entries left. Purchase a $${dollars} entry for this round.`,
        creditHint: (n) =>
            `You have ${n} Program Award entr${n === 1 ? 'y' : 'ies'} available.`,
        needMembership:
            'Memberships include Program Award entries. Or complete a one-time Program Draw Payment below.',
        needSignIn: 'Sign in with Internet Identity to complete your Program Draw entry.',
        paidSignInToFinish:
            'Payment received. Continue to sign up with Internet Identity to finish your Program Draw entry.',
        paidSignInCancelled:
            'Payment received. Sign-in was cancelled — use Continue to sign up or Retry enter to finish your entry.',
        paidCheckoutNotCompleted:
            'Checkout was not completed. You were not charged. Try payment again when you are ready.',
        paidCapturing: 'Confirming your payment…',
        paidFinishing: 'Finishing your Program Draw entry…',
        viewProgramDetails: 'View program details',
        submitNoAccount: 'This sign-in is not linked to a Fusion member account.',
        submitNoLinkedArtist: 'Your account is not linked to an artist profile.',
        accountGateNoAccountTitle: 'A Fusion account is needed to enter',
        accountGateNoAccountBody:
            'You’re signed in, but this Internet Identity isn’t connected to a Fusion member account yet — so we can’t complete your Program Draw entry.',
        accountGateNoAccountSolution:
            'Finish joining with this sign-in, or sign in with the Internet Identity you used to register. Then try again.',
        accountGateNoLinkedTitle: 'Artist profile not linked',
        accountGateNoLinkedBody:
            'You have a Fusion account, but it isn’t linked to an artist profile yet.',
        accountGateNoLinkedSolution:
            'Ask the Fusion team to link your roster row, or sign in with the identity that’s already linked. Then try again.',
        accountGateContactLead: 'Need help?',
        accountGateContactCta: 'info@fusionart.world',
        accountGateJoinCta: 'Join Fusion',
        accountGateClose: 'Close',
        withdrawFirst:
            'You already have a formal application for this program. Withdraw it in Settings (My programs) before entering the Program Draw. Application credits are not refunded.',
        entered: 'You are entered in this Program Draw round.',
        enteredTitle: 'You’re entered',
        enteredBody:
            'Your Program Draw entry for this program is active. We’ll include you when the round fills. You can withdraw anytime — consumed award credits or payments are not refunded.',
        exitDraw: 'Withdraw entry',
        exitHint:
            'Withdrawing does not refund a consumed award entry or payment. You can then submit a formal application or re-enter the draw later.',
        exitConfirm:
            'Withdraw your Program Draw entry? Consumed award credits or payments are not refunded.',
        exiting: 'Withdrawing…',
        entering: 'Entering…',
        success: 'You are entered in the Program Draw.',
        inactive: 'Program Draw is not active for this program.',
        validationTitle: 'A few details needed',
        paymentPreparing: 'Preparing payment…',
        paymentPlaceholderTitle: 'Select Program Draw Payment above to continue.',
        paymentPlaceholderSub: 'We’ll check your contact details, then show secure card fields.',
        paymentCardHint: 'Enter your card details below, then click Pay now.',
        membershipPreparing: 'Preparing membership checkout…',
        membershipApproved: 'Membership active. Completing your Program Draw entry…',
        membershipSignInToFinish:
            'Subscription approved. Sign in with Internet Identity to finish creating your Fusion account and enter the draw.',
        membershipSignInCancelled:
            'Subscription is approved, but sign-in was cancelled. Sign in to finish linking your membership, then try entering again.',
        membershipSignInCta: 'Sign in to finish entry',
        membershipFinishing: 'Linking membership and completing entry…',
        retryEnter: 'Retry enter',
        paidEnterFailed:
            'Payment received, but we could not complete your draw entry. Tap Retry enter — you will not be charged again.',
        selectMembershipPlan: 'Approve your membership with PayPal below.',
    },
    ja: {
        title: 'プログラム抽選に参加',
        titleInactive: 'Fusion プログラム抽選',
        aboutSectionTitle: 'あなたについて',
        completeHeading: 'プログラム抽選のエントリーを完了',
        paymentHeading: 'プログラム抽選の支払い',
        productCardTitle: 'プログラム抽選の支払い',
        productCardBadge: '一回払い',
        creditBadge: 'アワードクレジット',
        creditPriceLabel: '含まれます',
        planOneTimeTitle: 'プログラム抽選の支払い – {{price}}',
        planOneTimeSub: '抽選エントリーのみ',
        productCardBullets: [
            'プログラム抽選のエントリーと審査',
            'このラウンドへの1回のエントリー',
            '継続課金なし',
            'お支払い後にサインインしてエントリー完了',
        ],
        paymentPlanGroupLabel: 'プログラム抽選の支払いオプション',
        exploreMembershipsExpand: 'メンバーシップを見る',
        exploreMembershipsCollapse: 'メンバーシップを閉じる',
        suggestedBadge: 'おすすめ',
        planMonthlyTitle: '月額メンバーシップ',
        planMonthlyPriceLine: '$30',
        planMonthlyEvery: '毎月',
        planQuarterlyTitle: '四半期メンバーシップ',
        planQuarterlyPriceLine: '$75',
        planQuarterlyEvery: '四半期ごと',
        planAnnualTitle: '年額メンバーシップ',
        planAnnualPriceLine: '$260',
        planAnnualEvery: '毎年',
        footerQuestionsPrefix: 'ご質問は',
        footerContactUs: 'お問い合わせ',
        useCredit: 'アワードエントリー1回で参加する',
        creditCalloutTitle: 'プログラムアワードエントリーを1回使用します',
        creditCalloutBody: (n) =>
            n <= 1
                ? '利用可能なアワードクレジットでエントリーします。お支払いは不要です。'
                : `${n} 回あるアワードエントリーのうち1回を使います。お支払いは不要です。`,
        creditRemainingHint: (n) =>
            n <= 1
                ? 'このエントリー後、次回のメンバーシップ付与まで残高は0になります。'
                : `このエントリー後の残高は ${n - 1} 回です。`,
        payHint: (dollars) =>
            `利用可能なアワードエントリーがありません。このラウンドは $${dollars} で購入できます。`,
        creditHint: (n) =>
            `プログラムアワードエントリーが ${n} 回利用可能です。`,
        needMembership:
            'メンバーシップにはプログラムアワードエントリーが含まれます。または下の一回払いで完了できます。',
        needSignIn: 'プログラム抽選のエントリーを完了するには Internet Identity でサインインしてください。',
        paidSignInToFinish:
            'お支払いを確認しました。Internet Identity でサインアップを続けて抽選エントリーを完了してください。',
        paidSignInCancelled:
            'お支払いを確認済みです。サインインがキャンセルされました。「サインアップへ進む」または「エントリーを再試行」で完了してください。',
        paidCheckoutNotCompleted:
            'チェックアウトは完了していません。この試行では課金されていません。準備ができたらもう一度お支払いください。',
        paidCapturing: 'お支払いを確認しています…',
        paidFinishing: 'プログラム抽選のエントリーを完了しています…',
        viewProgramDetails: 'プログラム詳細を見る',
        submitNoAccount: 'このサインインは Fusion メンバーアカウントに紐づいていません。',
        submitNoLinkedArtist: 'アカウントがアーティストプロフィールに紐づいていません。',
        accountGateNoAccountTitle: 'エントリーには Fusion アカウントが必要です',
        accountGateNoAccountBody:
            'サインイン済みですが、この Internet Identity はまだ Fusion メンバーアカウントに接続されていないため、プログラム抽選のエントリーを完了できません。',
        accountGateNoAccountSolution:
            'このサインインで参加手続きを完了するか、登録時に使った Internet Identity でサインインしてから、もう一度お試しください。',
        accountGateNoLinkedTitle: 'アーティストプロフィール未連携',
        accountGateNoLinkedBody:
            'Fusion アカウントはありますが、アーティストプロフィールにまだ紐づいていません。',
        accountGateNoLinkedSolution:
            'Fusion チームに名簿の連携を依頼するか、すでに連携済みの Identity でサインインしてから、もう一度お試しください。',
        accountGateContactLead: 'お困りですか？',
        accountGateContactCta: 'info@fusionart.world',
        accountGateJoinCta: 'Fusion に参加',
        accountGateClose: '閉じる',
        withdrawFirst:
            'このプログラムにはすでに正式応募があります。プログラム抽選に進む前に、設定（My programs）で応募を取り下げてください。応募クレジットは返金されません。',
        entered: 'このプログラム抽選ラウンドにエントリー済みです。',
        enteredTitle: 'エントリー済み',
        enteredBody:
            'このプログラムの抽選エントリーは有効です。ラウンドが埋まると抽選対象に含まれます。いつでも取り消しできますが、消費済みクレジットや支払いの返金はありません。',
        exitDraw: 'エントリーを取り消す',
        exitHint:
            '取り消しても消費済みのアワードエントリーや支払いは返金されません。その後、正式応募や再エントリーが可能になります。',
        exitConfirm:
            'プログラム抽選のエントリーを取り消しますか？消費済みのアワードクレジットや支払いの返金はありません。',
        exiting: '取り消し中…',
        entering: 'エントリー中…',
        success: 'プログラム抽選にエントリーしました。',
        inactive: 'このプログラムではプログラム抽選は有効ではありません。',
        validationTitle: '入力が必要です',
        paymentPreparing: '決済を準備しています…',
        paymentPlaceholderTitle: '上の「プログラム抽選の支払い」を選択して続行してください。',
        paymentPlaceholderSub: '連絡先を確認したあと、安全なカード入力欄を表示します。',
        paymentCardHint: '下のカード情報を入力し、「Pay now」を押してください。',
        membershipPreparing: 'メンバーシップ決済を準備しています…',
        membershipApproved: 'メンバーシップが有効になりました。抽選エントリーを完了しています…',
        membershipSignInToFinish:
            'サブスクリプションが承認されました。Internet Identity でサインインしてアカウント作成と抽選エントリーを完了してください。',
        membershipSignInCancelled:
            'サブスクリプションは承認済みですが、サインインがキャンセルされました。サインインしてメンバーシップを連携してから、再度エントリーしてください。',
        membershipSignInCta: 'サインインしてエントリーを完了',
        membershipFinishing: 'メンバーシップを連携し、エントリーを完了しています…',
        retryEnter: 'エントリーを再試行',
        paidEnterFailed:
            'お支払いを確認済みですが、抽選エントリーを完了できませんでした。「エントリーを再試行」を押してください（再課金されません）。',
        selectMembershipPlan: '下の PayPal でメンバーシップを承認してください。',
    },
};

const DRAW_PAID_ORDER_SESSION_PREFIX = 'fusion-draw-paid-order:';

/**
 * @param {string} programId
 * @returns {string}
 */
function drawPaidOrderSessionKey(programId) {
    return `${DRAW_PAID_ORDER_SESSION_PREFIX}${String(programId || '').trim()}`;
}

/**
 * @param {string} programId
 * @param {string} orderId
 * @param {Record<string, string> | null | undefined} [payload]
 */
function persistCapturedDrawOrder(programId, orderId, payload) {
    const id = String(programId || '').trim();
    const oid = String(orderId || '').trim();
    if (!id || !oid || typeof sessionStorage === 'undefined') return;
    try {
        const body = {
            orderId: oid,
            payload:
                payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {},
            savedAt: new Date().toISOString(),
        };
        sessionStorage.setItem(drawPaidOrderSessionKey(id), JSON.stringify(body));
    } catch {
        /* ignore */
    }
}

/**
 * @param {string} programId
 * @returns {{ orderId: string, payload: Record<string, string> }}
 */
function readCapturedDrawOrderState(programId) {
    const id = String(programId || '').trim();
    if (!id || typeof sessionStorage === 'undefined') {
        return { orderId: '', payload: {} };
    }
    try {
        const raw = String(sessionStorage.getItem(drawPaidOrderSessionKey(id)) || '').trim();
        if (!raw) return { orderId: '', payload: {} };
        if (raw.startsWith('{')) {
            const parsed = JSON.parse(raw);
            const orderId = String(parsed?.orderId || '').trim();
            const payload =
                parsed?.payload && typeof parsed.payload === 'object' && !Array.isArray(parsed.payload)
                    ? /** @type {Record<string, string>} */ (parsed.payload)
                    : {};
            return { orderId, payload };
        }
        // Legacy: bare order id string
        return { orderId: raw, payload: {} };
    } catch {
        return { orderId: '', payload: {} };
    }
}

/**
 * @param {string} programId
 * @returns {string}
 */
function readCapturedDrawOrder(programId) {
    return readCapturedDrawOrderState(programId).orderId;
}

/**
 * @param {string} programId
 */
function clearCapturedDrawOrder(programId) {
    const id = String(programId || '').trim();
    if (!id || typeof sessionStorage === 'undefined') return;
    try {
        sessionStorage.removeItem(drawPaidOrderSessionKey(id));
    } catch {
        /* ignore */
    }
}

function drawLocaleCopy() {
    const loc =
        typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
    return DRAW_FORM_COPY[loc];
}

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

class ProgramDrawFormComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        /** @type {AbortController | null} */
        this._abort = null;
        this._renderToken = 0;
        this._membershipsExpanded = false;
        /** @type {'monthly' | 'quarterly' | 'annual' | null} */
        this._membershipTier = null;
        /** @type {number} */
        this._paypalPrepareGen = 0;
        /** @type {{ destroy?: () => void, usesCardFields?: boolean } | null} */
        this._paypalCheckoutController = null;
        /** Last successful PayPal one-time order — used to retry enter without recharging. */
        this._lastPaidOrderId = '';
        /** @type {string} */
        this._fusionPendingId = '';
        /** @type {string} */
        this._fusionSubscriptionId = '';
        /**
         * Pending membership finish after PayPal approve (guest may still need II).
         * @type {{ email: string, programId: string, payload: Record<string, string>, subscriptionId: string } | null}
         */
        this._membershipFinishCtx = null;
        /** When true after paid confirm, show Retry enter until Motoko enter succeeds. */
        this._paidEnterPending = false;
        /** Last email successfully written to the subscriber store (dedupe upsert + PH event). */
        this._subscriberSyncedEmail = '';
        /** Gate snapshot for pay mount (set each refresh). */
        this._payGate = {
            canPay: false,
            onApplicationPath: false,
            entered: false,
            programId: '',
        };
        /** @type {{ applicationPaymentOptions?: ReturnType<typeof emptyApplicationPaymentOptions> }} */
        this._programFormContext = {
            applicationPaymentOptions: emptyApplicationPaymentOptions(),
        };
    }

    /**
     * Same context shape as `<app-application-form>` (one_time payment copy reused with remaps).
     * @param {Record<string, unknown>} ctx
     */
    setProgramFormContext(ctx) {
        const next = ctx && typeof ctx === 'object' ? ctx : {};
        const apo =
            next.applicationPaymentOptions && typeof next.applicationPaymentOptions === 'object'
                ? next.applicationPaymentOptions
                : emptyApplicationPaymentOptions();
        this._programFormContext = {
            ...this._programFormContext,
            ...next,
            applicationPaymentOptions: apo,
        };
        if (this.getAttribute('active') === 'true' && !this.hasAttribute('hidden')) {
            void this._refresh();
        }
    }

    get active() {
        return this.getAttribute('active') || 'false';
    }

    set active(val) {
        const next = val === true || val === 'true' ? 'true' : 'false';
        if (this.getAttribute('active') === next) return;
        this.setAttribute('active', next);
    }

    static get observedAttributes() {
        return ['active', 'data-program-id', 'hidden'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (prop === 'hidden') return;
        if ((prop === 'active' || prop === 'data-program-id') && oldVal !== newVal) {
            void this._refresh();
        }
    }

    /**
     * Resolve product + CTA labels from program payment options (remapped for draw).
     * @param {ReturnType<typeof drawLocaleCopy>} D
     * @param {number} feeDollars
     */
    _drawPaymentLabels(D, feeDollars) {
        const apo = this._programFormContext?.applicationPaymentOptions;
        const one =
            apo && typeof apo === 'object' && apo.one_time && typeof apo.one_time === 'object'
                ? apo.one_time
                : {};
        const priceStr =
            String(one.displayPrice ?? '').trim() || `$${feeDollars}`;
        const titleRaw = remapDrawTitle(String(one.title ?? '').trim());
        const productTitle =
            (titleRaw
                ? titleRaw.replace(/\{\{price\}\}/g, '').replace(/[–—-]\s*$/, '').trim()
                : '') || D.productCardTitle;
        const titleBase = titleRaw || D.planOneTimeTitle;
        const planButtonTitle = titleBase.includes('{{price}}')
            ? titleBase.replace(/\{\{price\}\}/g, priceStr)
            : `${titleBase}${titleBase.includes(priceStr) ? '' : ` – ${priceStr}`}`;
        const planSub =
            remapDrawPaymentLabel(String(one.subtext ?? '').trim()) || D.planOneTimeSub;
        const drawFeat = this._programFormContext?.programDrawFeatures;
        const studioDrawBullets = Array.isArray(drawFeat?.includedBullets)
            ? drawFeat.includedBullets.map((b) => String(b ?? '').trim()).filter(Boolean)
            : [];
        const bulletsSrc = studioDrawBullets.length
            ? studioDrawBullets
            : Array.isArray(one.includedBullets) && one.includedBullets.length
              ? one.includedBullets.map((b) => remapDrawPaymentLabel(String(b)))
              : D.productCardBullets;
        return {
            productTitle,
            productPrice: priceStr,
            productBadge: D.productCardBadge,
            planButtonTitle,
            planSub,
            bullets: bulletsSrc,
        };
    }

    /**
     * Membership plan card labels from program payment options (Residency → Program Draw).
     * @param {ReturnType<typeof drawLocaleCopy>} D
     */
    _membershipPlanLabels(D) {
        const apo = this._programFormContext?.applicationPaymentOptions || {};
        /** @type {Array<'monthly' | 'quarterly' | 'annual'>} */
        const tiers = ['monthly', 'quarterly', 'annual'];
        /** @type {Record<string, { title: string, price: string, every: string, bullets: string[] }>} */
        const out = {};
        for (const tier of tiers) {
            const legacy = tier === 'monthly' ? apo.bimonthly : null;
            const slice =
                (apo[tier] && typeof apo[tier] === 'object' ? apo[tier] : null) ||
                (legacy && typeof legacy === 'object' ? legacy : {}) ||
                {};
            const meta = MEMBERSHIP_TIER_META[tier] || {};
            const defaultTitle =
                tier === 'monthly'
                    ? D.planMonthlyTitle
                    : tier === 'quarterly'
                      ? D.planQuarterlyTitle
                      : D.planAnnualTitle;
            const defaultPrice =
                tier === 'monthly'
                    ? D.planMonthlyPriceLine
                    : tier === 'quarterly'
                      ? D.planQuarterlyPriceLine
                      : D.planAnnualPriceLine;
            const defaultEvery =
                tier === 'monthly'
                    ? D.planMonthlyEvery
                    : tier === 'quarterly'
                      ? D.planQuarterlyEvery
                      : D.planAnnualEvery;
            const title = remapDrawTitle(String(slice.title ?? '').trim()) || defaultTitle;
            const price =
                String(slice.displayPrice ?? '').trim() ||
                defaultPrice ||
                (meta.priceLine ? String(meta.priceLine).replace(/ per .+$/, '') : '—');
            const sub1 = remapDrawPaymentLabel(String(slice.subtext ?? '').trim());
            const every = sub1 || defaultEvery;
            const bullets =
                Array.isArray(slice.includedBullets) && slice.includedBullets.length
                    ? slice.includedBullets.map((b) => remapDrawPaymentLabel(String(b)))
                    : [remapDrawPaymentLabel(String(meta.entitlement || ''))].filter(Boolean);
            out[tier] = { title, price, every, bullets };
        }
        return out;
    }

    /**
     * @param {ReturnType<typeof drawLocaleCopy>} D
     */
    _syncMembershipExploreUi(D) {
        const root = this.shadowRoot;
        if (!root) return;
        const toggle = root.querySelector('#draw-explore-memberships-toggle');
        const panel = root.querySelector('#draw-membership-plans-panel');
        if (toggle instanceof HTMLElement) {
            toggle.textContent = this._membershipsExpanded
                ? D.exploreMembershipsCollapse
                : D.exploreMembershipsExpand;
            toggle.setAttribute('aria-expanded', this._membershipsExpanded ? 'true' : 'false');
        }
        if (panel instanceof HTMLElement) {
            panel.hidden = !this._membershipsExpanded;
        }
        root.querySelectorAll('[data-draw-membership-tier]').forEach((btn) => {
            if (!(btn instanceof HTMLElement)) return;
            const tier = btn.getAttribute('data-draw-membership-tier') || '';
            const selected = Boolean(this._membershipTier && tier === this._membershipTier);
            btn.classList.toggle('is-selected', selected);
            btn.setAttribute('aria-checked', selected ? 'true' : 'false');
        });
        const payCta = root.querySelector('[data-draw-pay-plan]');
        if (payCta instanceof HTMLElement && this._membershipTier) {
            payCta.classList.remove('is-selected');
            payCta.setAttribute('aria-checked', 'false');
        }
    }

    /**
     * Light-DOM mount so PayPal card-field CSS (global) applies — same pattern as application form.
     * @returns {HTMLElement}
     */
    _ensurePaySlotEl() {
        let el = this.querySelector('[slot="draw-pay-mount"]');
        if (!el) {
            el = document.createElement('div');
            el.slot = 'draw-pay-mount';
            el.className = 'app-draw-pay-mount';
            this.appendChild(el);
        }
        return el;
    }

    _teardownPayCheckout() {
        this._paypalPrepareGen += 1;
        try {
            this._paypalCheckoutController?.destroy?.();
        } catch {
            /* ignore */
        }
        this._paypalCheckoutController = null;
        const mount = this.querySelector('[slot="draw-pay-mount"]');
        if (mount) mount.textContent = '';
        const root = this.shadowRoot;
        const wrap = root?.querySelector('#draw-payment-slot-wrap');
        if (wrap instanceof HTMLElement) wrap.hidden = true;
        const ph = root?.querySelector('#draw-payment-placeholder');
        if (ph instanceof HTMLElement) ph.hidden = false;
        const cta = root?.querySelector('[data-draw-pay-plan]');
        if (cta instanceof HTMLElement) {
            cta.classList.remove('is-selected');
            cta.setAttribute('aria-checked', 'false');
        }
    }

    /**
     * @param {number} ms
     * @returns {Promise<void>}
     */
    _sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    /**
     * Enter with short retries after a successful PayPal capture.
     * @param {boolean} paidEntryReceipt
     * @param {{
     *   skipAccountCheck?: boolean,
     *   retries?: number,
     *   paypalOrderId?: string,
     *   skipFinishModal?: boolean,
     * }} [opts]
     * @returns {Promise<boolean>}
     */
    async _enterWithRetry(paidEntryReceipt, opts = {}) {
        const retries = Math.max(1, Number(opts.retries) || 3);
        let lastErr = /** @type {unknown} */ (null);
        for (let i = 0; i < retries; i += 1) {
            try {
                const ok = await this._enter(paidEntryReceipt, {
                    skipAccountCheck: opts.skipAccountCheck,
                    suppressErrorMsg: true,
                    paypalOrderId: opts.paypalOrderId || this._lastPaidOrderId,
                    skipFinishModal: opts.skipFinishModal,
                });
                if (ok) return true;
                return false;
            } catch (e) {
                lastErr = e;
                if (i < retries - 1) await this._sleep(400 * (i + 1));
            }
        }
        if (paidEntryReceipt) {
            this._paidEnterPending = true;
            const D = drawLocaleCopy();
            this._setMsg(D.paidEnterFailed, 'error');
            this._showRetryEnterControl();
        } else if (lastErr) {
            this._setMsg(lastErr instanceof Error ? lastErr.message : String(lastErr), 'error');
        }
        return false;
    }

    _showRetryEnterControl() {
        const root = this.shadowRoot;
        if (!root) return;
        let row = root.querySelector('#draw-retry-enter-row');
        if (!(row instanceof HTMLElement)) {
            const status = root.querySelector('#draw-form-status');
            row = document.createElement('div');
            row.id = 'draw-retry-enter-row';
            row.className = 'app-form-actions';
            row.innerHTML = `<button type="button" class="app-btn app-btn--primary" id="draw-retry-enter"></button>`;
            status?.parentElement?.insertBefore(row, status);
            row.querySelector('#draw-retry-enter')?.addEventListener('click', () => {
                void this._finishPaidEntryAfterCheckout({
                    orderId: this._lastPaidOrderId,
                    programId: this._programId(),
                    promptLogin: true,
                });
            });
        }
        const D = drawLocaleCopy();
        const btn = row.querySelector('#draw-retry-enter');
        if (btn instanceof HTMLElement) btn.textContent = D.retryEnter;
        row.hidden = false;
    }

    /**
     * After CTA click: validate contact, then mount PayPal into the light-DOM slot.
     * @returns {Promise<void>}
     */
    async _preparePayCheckout() {
        const D = drawLocaleCopy();
        const L = programFormFieldLabels();
        const gate = this._payGate;
        if (!gate.canPay) {
            this._setMsg(gate.onApplicationPath ? D.withdrawFirst : D.entered, 'error');
            return;
        }
        if (!this._ensureContactOrPrompt()) return;

        const contactPayload = this._collectPayload();
        void this._syncDrawSubscriber(contactPayload);
        this._captureDrawEvent('program_draw_started', {
            entry_path: 'paid',
            ads_conversion: 'InitiateCheckout',
        });
        try {
            metaTrack('InitiateCheckout', {
                currency: 'USD',
                value: DRAW_ENTRY_FEE_CENTS / 100,
                content_name: 'program_draw_entry',
                content_ids: [gate.programId || this._programId()].filter(Boolean),
            });
        } catch {
            /* ignore */
        }

        this._teardownPayCheckout();
        const myGen = ++this._paypalPrepareGen;

        const root = this.shadowRoot;
        const cta = root?.querySelector('[data-draw-pay-plan]');
        if (cta instanceof HTMLElement) {
            cta.classList.add('is-selected');
            cta.setAttribute('aria-checked', 'true');
        }
        const ph = root?.querySelector('#draw-payment-placeholder');
        if (ph instanceof HTMLElement) ph.hidden = true;
        const wrap = root?.querySelector('#draw-payment-slot-wrap');
        if (wrap instanceof HTMLElement) wrap.hidden = false;

        this._setMsg(D.paymentPreparing, 'neutral');

        if (!getIntegrationBaseUrl()) {
            this._setMsg('Checkout unavailable. Configure Integration API URL and try again.', 'error');
            return;
        }

        try {
            const payConfig = await fetchPaymentConfig();
            if (myGen !== this._paypalPrepareGen) return;
            const clientId = String(payConfig?.paypalClientId || payConfig?.clientId || '').trim();
            if (!clientId) {
                this._setMsg('PayPal is not configured for draw entry checkout.', 'error');
                return;
            }
            const mountEl = this._ensurePaySlotEl();
            await new Promise((r) => requestAnimationFrame(r));
            if (myGen !== this._paypalPrepareGen) return;

            const programId = gate.programId || this._programId();
            this._membershipTier = null;
            this._syncMembershipExploreUi(D);
            this._paypalCheckoutController = await mountPayPalAdvancedOneTimeCheckout(mountEl, {
                clientId,
                mode: payConfig.mode === 'live' ? 'live' : 'sandbox',
                amountCents: DRAW_ENTRY_FEE_CENTS,
                metadata: {
                    programId,
                    purpose: 'program_award_entry',
                    paymentType: 'program_award_entry',
                    applicationId: `award:${programId}`,
                },
                showPayNowButton: true,
                createOrder: async (body) => {
                    if (!this._payGate.canPay) {
                        throw new Error(
                            this._payGate.onApplicationPath ? D.withdrawFirst : D.entered,
                        );
                    }
                    if (!this._ensureContactOrPrompt()) {
                        throw new Error(L.contactRequiredHint);
                    }
                    // Guests may start PayPal without a Fusion account (pay-first).
                    // Principal is attached on confirm after II login when needed.
                    const snap = await getAuthSnapshot();
                    const principal = snap?.authenticated
                        ? String(snap.principal?.toText?.() || '').trim()
                        : '';
                    const payload = this._collectPayload();
                    const applicantName = [payload.firstName, payload.lastName]
                        .filter(Boolean)
                        .join(' ')
                        .trim();
                    return createPayPalOneTimePayment({
                        amountCents: body.amountCents,
                        ...(principal ? { principal } : {}),
                        programId,
                        applicationId: `award:${programId}`,
                        paymentType: 'program_award_entry',
                        purpose: 'program_award_entry',
                        email: payload.email || undefined,
                        applicantEmail: payload.email || undefined,
                        applicantName: applicantName || undefined,
                        payloadJson: JSON.stringify(payload),
                        metadata: {
                            ...(body.metadata || {}),
                            programId,
                            purpose: 'program_award_entry',
                            paymentType: 'program_award_entry',
                            applicationId: `award:${programId}`,
                            ...(principal ? { principal } : {}),
                        },
                    });
                },
                onApproved: async (orderId) => {
                    // Return quickly so the PayPal popup can close, then capture + modal.
                    // Do not open II inside onApprove (stuck popup) and do not claim paid
                    // until capture succeeds.
                    this._lastPaidOrderId = String(orderId || '');
                    const payPayload = this._collectPayload();
                    void this._syncDrawSubscriber(payPayload);
                    this._setMsg(D.paidCapturing, 'neutral');
                    const finishOrderId = this._lastPaidOrderId;
                    const finishProgramId = programId;
                    queueMicrotask(() => {
                        void this._handlePayPalApprovedAfterPopup({
                            orderId: finishOrderId,
                            programId: finishProgramId,
                            payload: payPayload,
                        });
                    });
                },
                onError: (err) => {
                    this._captureDrawEvent('program_draw_payment_failed', {
                        payment_plan: 'one_time',
                    });
                    this._setMsg(
                        err instanceof Error ? err.message : 'PayPal checkout failed.',
                        'error',
                    );
                },
            });
            if (myGen !== this._paypalPrepareGen) {
                try {
                    this._paypalCheckoutController?.destroy?.();
                } catch {
                    /* ignore */
                }
                this._paypalCheckoutController = null;
                return;
            }
            this._captureDrawEvent('program_draw_payment_elements_ready', {
                payment_plan: 'one_time',
                ads_conversion: 'AddPaymentInfo',
            });
            try {
                metaTrack('AddPaymentInfo', {
                    currency: 'USD',
                    value: DRAW_ENTRY_FEE_CENTS / 100,
                    content_name: 'program_draw_entry',
                    content_ids: [programId].filter(Boolean),
                });
            } catch {
                /* ignore */
            }
            this._setMsg(
                this._paypalCheckoutController?.usesCardFields ? D.paymentCardHint : '',
                'neutral',
            );
            wrap?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (e) {
            if (myGen !== this._paypalPrepareGen) return;
            this._captureDrawEvent('program_draw_payment_prepare_failed', {
                payment_plan: 'one_time',
            });
            this._setMsg(
                e instanceof Error
                    ? e.message
                    : 'Checkout unavailable. Use an included award entry or try again later.',
                'error',
            );
            const failWrap = this.shadowRoot?.querySelector('#draw-payment-slot-wrap');
            if (failWrap instanceof HTMLElement) failWrap.hidden = true;
            const failPh = this.shadowRoot?.querySelector('#draw-payment-placeholder');
            if (failPh instanceof HTMLElement) failPh.hidden = false;
            const failCta = this.shadowRoot?.querySelector('[data-draw-pay-plan]');
            if (failCta instanceof HTMLElement) {
                failCta.classList.remove('is-selected');
                failCta.setAttribute('aria-checked', 'false');
            }
        }
    }

    /**
     * Show / hide “Sign in to finish entry” after guest membership approve.
     * @param {boolean} show
     */
    _syncMembershipFinishSignInUi(show) {
        const root = this.shadowRoot;
        if (!root) return;
        let row = root.querySelector('#draw-membership-finish-row');
        const D = drawLocaleCopy();
        if (!show) {
            if (row instanceof HTMLElement) row.hidden = true;
            return;
        }
        if (!(row instanceof HTMLElement)) {
            const status = root.querySelector('#draw-form-status');
            row = document.createElement('div');
            row.id = 'draw-membership-finish-row';
            row.className = 'app-form-actions';
            row.innerHTML = `<button type="button" class="app-btn app-btn--primary" id="draw-membership-finish-signin"></button>`;
            status?.parentElement?.insertBefore(row, status);
            row.querySelector('#draw-membership-finish-signin')?.addEventListener('click', () => {
                void this._finishMembershipEntry({ promptLogin: true });
            });
        }
        const btn = row.querySelector('#draw-membership-finish-signin');
        if (btn instanceof HTMLElement) btn.textContent = D.membershipSignInCta;
        row.hidden = false;
    }

    /**
     * After PayPal membership approve: II login if needed, register account, link/sync, enter draw.
     * @param {{
     *   email?: string,
     *   programId?: string,
     *   payload?: Record<string, string>,
     *   subscriptionId?: string,
     *   promptLogin?: boolean,
     * }} [opts]
     * @returns {Promise<boolean>}
     */
    async _finishMembershipEntry(opts = {}) {
        const D = drawLocaleCopy();
        const ctx = this._membershipFinishCtx || {
            email: String(opts.email || '').trim(),
            programId: String(opts.programId || this._programId() || '').trim(),
            payload: opts.payload && typeof opts.payload === 'object' ? opts.payload : this._collectPayload(),
            subscriptionId: String(opts.subscriptionId || this._fusionSubscriptionId || '').trim(),
        };
        const email = String(ctx.email || '').trim();
        const programId = String(ctx.programId || '').trim();
        const subscriptionId = String(ctx.subscriptionId || '').trim();
        const payload =
            ctx.payload && typeof ctx.payload === 'object' ? ctx.payload : this._collectPayload();
        if (!email.includes('@') || !programId || !subscriptionId) {
            this._setMsg(D.needSignIn, 'error');
            return false;
        }
        this._membershipFinishCtx = { email, programId, payload, subscriptionId };
        this._fusionSubscriptionId = subscriptionId;

        let snap = await getAuthSnapshot();
        if (!snap?.authenticated) {
            if (opts.promptLogin === false) {
                this._setMsg(D.membershipSignInToFinish, 'neutral');
                this._syncMembershipFinishSignInUi(true);
                return false;
            }
            this._setMsg(D.membershipSignInToFinish, 'neutral');
            try {
                await loginInternetIdentity({ source: 'join-link' });
            } catch (e) {
                if (e === ERROR_USER_INTERRUPT) {
                    this._setMsg(D.membershipSignInCancelled, 'error');
                    this._syncMembershipFinishSignInUi(true);
                    return false;
                }
                this._setMsg(e instanceof Error ? e.message : String(e), 'error');
                this._syncMembershipFinishSignInUi(true);
                return false;
            }
            snap = await getAuthSnapshot();
            if (!snap?.authenticated) {
                this._setMsg(D.membershipSignInCancelled, 'error');
                this._syncMembershipFinishSignInUi(true);
                return false;
            }
        }

        this._syncMembershipFinishSignInUi(false);
        this._setMsg(D.membershipFinishing, 'neutral');
        this._openFinishModal('finishing');
        const principal = snap.principal.toText();
        const finishRetry = () => {
            void this._finishMembershipEntry({ promptLogin: true });
        };

        try {
            savePendingMembershipPayload({
                email,
                fusionPendingId: this._fusionPendingId || '',
                subscriptionId,
                paymentCompleted: true,
            });
            setStoredBillingEmailForPrincipal(principal, email);
            try {
                await setMyAccountContactForCaller({
                    email,
                    firstName: String(payload.firstName || ''),
                    lastName: String(payload.lastName || ''),
                });
            } catch {
                /* contact sidecar optional */
            }

            // Create UserAccount before link — integration traps without an account.
            const actor = await getAuthenticatedFusionBackendActor();
            if (actor && typeof actor.registerOrUpdateAccount === 'function') {
                await actor.registerOrUpdateAccount(categoryToUserRole('artist'));
                await this._refreshAuthUiAfterAccount();
            }

            try {
                if (this._fusionPendingId) {
                    await linkPayPalSubscriptionToPrincipal({
                        fusionPendingId: this._fusionPendingId,
                        email,
                        principal,
                        subscriptionId,
                    });
                }
            } catch {
                /* sync by subscription id may still succeed */
            }
            await syncPayPalSubscription({ principal, subscriptionId });

            try {
                await ensureMyLinkedArtistProfileForApplication();
            } catch {
                /* enter may still work for award path */
            }

            try {
                const credits = await getAwardCreditsForCaller();
                const bal = Number(credits?.balance) || 0;
                if (bal >= 1 && !this._payGate.onApplicationPath) {
                    this._setMsg(D.entering, 'neutral');
                    await enterProgramAward(programId, {
                        paypalOrderId: '',
                        payload,
                    });
                    void this._syncDrawSubscriber(payload);
                    this._captureDrawEvent('program_draw_entered', {
                        entry_path: 'membership',
                        ads_conversion: 'SubmitApplication',
                    });
                    try {
                        metaTrack('SubmitApplication', {
                            content_ids: [programId].filter(Boolean),
                            content_name: 'program_draw_entry',
                        });
                    } catch {
                        /* ignore */
                    }
                    this._setMsg(D.success, 'ok');
                    this._invalidateDrawProgressCaches(programId);
                    this._membershipFinishCtx = null;
                    await this._refreshAuthUiAfterAccount();
                    await this._refresh();
                    this._notifyDrawEntryChange('entered', programId);
                    this._setFinishModalPhase('success');
                } else {
                    this._setMsg(D.membershipApproved, 'ok');
                    this._membershipFinishCtx = null;
                    await this._refreshAuthUiAfterAccount();
                    await this._refresh();
                    this._setFinishModalPhase('success');
                }
                return true;
            } catch (enterErr) {
                this._captureDrawEvent('program_draw_failed', {
                    entry_path: 'membership',
                    error_code: 'enter_failed',
                });
                const msg = enterErr instanceof Error ? enterErr.message : String(enterErr);
                this._setMsg(msg, 'error');
                this._setFinishModalPhase('error', { errorMessage: msg, onRetry: finishRetry });
                return false;
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            this._setMsg(msg, 'error');
            this._syncMembershipFinishSignInUi(true);
            this._setFinishModalPhase('error', { errorMessage: msg, onRetry: finishRetry });
            return false;
        }
    }

    /**
     * Mount PayPal subscription buttons for a membership tier (in-place, not join-network).
     * Guests may subscribe without an existing Fusion account (same as application-form).
     * @param {'monthly' | 'quarterly' | 'annual'} tier
     * @returns {Promise<void>}
     */
    async _prepareMembershipCheckout(tier) {
        const D = drawLocaleCopy();
        const L = programFormFieldLabels();
        const gate = this._payGate;
        if (!gate.canPay) {
            this._setMsg(gate.onApplicationPath ? D.withdrawFirst : D.entered, 'error');
            return;
        }
        if (!this._ensureContactOrPrompt()) return;

        const contactPayload = this._collectPayload();
        void this._syncDrawSubscriber(contactPayload);
        this._captureDrawEvent('program_draw_started', {
            entry_path: 'membership',
            membership_tier: tier,
            ads_conversion: 'InitiateCheckout',
        });
        try {
            metaTrack('InitiateCheckout', {
                currency: 'USD',
                content_name: 'program_draw_membership',
                content_ids: [gate.programId || this._programId()].filter(Boolean),
            });
        } catch {
            /* ignore */
        }

        this._teardownPayCheckout();
        const myGen = ++this._paypalPrepareGen;
        this._membershipTier = tier;
        this._membershipsExpanded = true;
        this._syncMembershipExploreUi(D);
        this._syncMembershipFinishSignInUi(false);

        const root = this.shadowRoot;
        const ph = root?.querySelector('#draw-payment-placeholder');
        if (ph instanceof HTMLElement) ph.hidden = true;
        const wrap = root?.querySelector('#draw-payment-slot-wrap');
        if (wrap instanceof HTMLElement) wrap.hidden = false;

        this._setMsg(D.membershipPreparing, 'neutral');

        if (!getIntegrationBaseUrl()) {
            this._setMsg('Checkout unavailable. Configure Integration API URL and try again.', 'error');
            return;
        }

        try {
            // Do not call _ensureAccountReadyForPay — membership is the account-creation path.
            const payConfig = await fetchPaymentConfig();
            if (myGen !== this._paypalPrepareGen) return;
            const clientId = String(payConfig?.paypalClientId || payConfig?.clientId || '').trim();
            if (!clientId) {
                this._setMsg('PayPal is not configured for membership checkout.', 'error');
                return;
            }
            const planId = planIdForTier(tier, payConfig);
            if (!planId) {
                throw new Error(`PayPal ${tier} plan is not configured on the integration server.`);
            }

            const payload = this._collectPayload();
            const email = String(payload.email || '').trim();
            if (!email.includes('@')) {
                throw new Error(L.contactRequiredHint || 'Email is required for membership checkout.');
            }

            const programId = gate.programId || this._programId();
            const fusionPendingId = crypto.randomUUID();
            this._fusionPendingId = fusionPendingId;
            this._fusionSubscriptionId = '';
            this._membershipFinishCtx = null;
            setPendingPaymentEmailLocal({
                email,
                source: 'join',
                fusionPendingId,
                subscriptionId: '',
                programId,
            });
            savePendingMembershipPayload({
                email,
                fusionPendingId,
                subscriptionId: '',
            });

            /** @type {Record<string, string>} */
            const customData = {
                fusion_pending_id: fusionPendingId,
                pending_email: email,
                programId,
                purpose: 'membership',
                payment_plan:
                    tier === 'annual'
                        ? 'subscription_annual'
                        : tier === 'quarterly'
                          ? 'subscription_quarterly'
                          : 'subscription_monthly',
            };

            const mountEl = this._ensurePaySlotEl();
            await new Promise((r) => requestAnimationFrame(r));
            if (myGen !== this._paypalPrepareGen) return;

            await mountPayPalSubscriptionButtons(mountEl, {
                clientId,
                mode: payConfig.mode === 'live' ? 'live' : 'sandbox',
                planId,
                email,
                customData,
                onApprove: async (subscriptionId) => {
                    if (myGen !== this._paypalPrepareGen) return;
                    this._fusionSubscriptionId = subscriptionId;
                    this._membershipFinishCtx = {
                        email,
                        programId,
                        payload,
                        subscriptionId,
                    };
                    setPendingPaymentEmailLocal({
                        email,
                        source: 'join',
                        fusionPendingId: this._fusionPendingId || '',
                        subscriptionId,
                        programId,
                    });
                    savePendingMembershipPayload({
                        email,
                        fusionPendingId: this._fusionPendingId || '',
                        subscriptionId,
                        paymentCompleted: true,
                    });
                    void this._syncDrawSubscriber(payload);
                    const paymentPlan =
                        tier === 'annual'
                            ? 'subscription_annual'
                            : tier === 'quarterly'
                              ? 'subscription_quarterly'
                              : 'subscription_monthly';
                    this._setMsg(D.membershipApproved, 'neutral');
                    // Resolve PayPal onApprove immediately so the popup can close; finish II/link after.
                    queueMicrotask(() => {
                        void (async () => {
                            const ok = await this._finishMembershipEntry({ promptLogin: true });
                            if (!ok) return;
                            this._captureDrawEvent('program_draw_payment_completed', {
                                payment_plan: paymentPlan,
                                entry_path: 'membership',
                                ads_conversion: 'Purchase',
                            });
                            try {
                                metaTrack('Purchase', {
                                    currency: 'USD',
                                    content_name: 'program_draw_membership',
                                    content_ids: [programId].filter(Boolean),
                                });
                            } catch {
                                /* ignore */
                            }
                        })();
                    });
                },
                onError: (err) => {
                    this._captureDrawEvent('program_draw_payment_failed', {
                        payment_plan: 'membership',
                        entry_path: 'membership',
                    });
                    this._setMsg(
                        err instanceof Error ? err.message : 'PayPal checkout failed.',
                        'error',
                    );
                },
            });
            if (myGen !== this._paypalPrepareGen) return;
            this._captureDrawEvent('program_draw_payment_elements_ready', {
                payment_plan: 'membership',
                entry_path: 'membership',
                ads_conversion: 'AddPaymentInfo',
            });
            try {
                metaTrack('AddPaymentInfo', {
                    currency: 'USD',
                    content_name: 'program_draw_membership',
                    content_ids: [programId].filter(Boolean),
                });
            } catch {
                /* ignore */
            }
            this._setMsg(D.selectMembershipPlan, 'neutral');
            wrap?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (e) {
            if (myGen !== this._paypalPrepareGen) return;
            this._captureDrawEvent('program_draw_payment_prepare_failed', {
                payment_plan: 'membership',
                entry_path: 'membership',
            });
            this._setMsg(e instanceof Error ? e.message : String(e), 'error');
            const failWrap = this.shadowRoot?.querySelector('#draw-payment-slot-wrap');
            if (failWrap instanceof HTMLElement) failWrap.hidden = true;
            const failPh = this.shadowRoot?.querySelector('#draw-payment-placeholder');
            if (failPh instanceof HTMLElement) failPh.hidden = false;
        }
    }

    connectedCallback() {
        if (!this.shadowRoot) return;
        void this._refresh();
        window.addEventListener('fusion-localechange', this._onLocale);
        window.addEventListener('fusion-auth-change', this._onAuth);
    }

    disconnectedCallback() {
        window.removeEventListener('fusion-localechange', this._onLocale);
        window.removeEventListener('fusion-auth-change', this._onAuth);
        this._abort?.abort();
        this._teardownPayCheckout();
    }

    _onLocale = () => {
        void this._refresh();
    };

    _onAuth = () => {
        void this._refresh();
    };

    /** Public re-render hook used when revealing the form. */
    refresh() {
        return this._refresh();
    }

    _programId() {
        return String(this.getAttribute('data-program-id') || '').trim();
    }

    /**
     * @returns {Record<string, string>}
     */
    _collectPayload() {
        const root = this.shadowRoot;
        const get = (id) => String(root?.querySelector(`#${id}`)?.value ?? '').trim();
        return {
            firstName: get('draw-first-name'),
            lastName: get('draw-last-name'),
            email: get('draw-email'),
            country: get('draw-country'),
            stateProvince: get('draw-state'),
            city: get('draw-city'),
            website: get('draw-website'),
            bioStatement: get('draw-bio'),
        };
    }

    /**
     * Persist contact/about fields (same localStorage key as the formal application form).
     */
    _saveDrawDraftFromForm() {
        const programId = this._programId();
        if (!programId) return;
        const payload = this._collectPayload();
        const existing = getProgramApplicationDraft(programId) || {};
        saveProgramApplicationDraft(programId, {
            ...existing,
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: payload.email,
            country: payload.country,
            stateProvince: payload.stateProvince,
            city: payload.city,
            website: payload.website,
            bioStatement: payload.bioStatement,
        });
    }

    /**
     * Fill empty payload keys from the local draft (server / entered payload wins).
     * @param {string} programId
     * @param {Record<string, string>} payload
     * @returns {Record<string, string>}
     */
    _mergeLocalDraftIntoPayload(programId, payload) {
        const draft = getProgramApplicationDraft(programId);
        if (!draft) return payload;
        /** @type {Record<string, string>} */
        const out = { ...payload };
        const keys = [
            'firstName',
            'lastName',
            'email',
            'country',
            'stateProvince',
            'city',
            'website',
            'bioStatement',
        ];
        for (const key of keys) {
            if (String(out[key] || '').trim()) continue;
            const v = draft[/** @type {keyof typeof draft} */ (key)];
            if (v != null && String(v).trim()) out[key] = String(v).trim();
        }
        return out;
    }

    _bindDrawDraftPersistence(signal) {
        const form = this.shadowRoot?.querySelector('#draw-form-fields');
        if (!(form instanceof HTMLFormElement)) return;
        form.addEventListener(
            'focusout',
            (e) => {
                const t = e.target;
                if (
                    !(t instanceof HTMLInputElement) &&
                    !(t instanceof HTMLTextAreaElement) &&
                    !(t instanceof HTMLSelectElement)
                ) {
                    return;
                }
                this._saveDrawDraftFromForm();
            },
            { signal },
        );
    }

    _analyticsLocale() {
        return typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
    }

    /**
     * Shared PostHog props for Program Draw funnels (no PII).
     * @returns {Record<string, string | number | boolean>}
     */
    _posthogDrawBaseProps() {
        return {
            program_id: this._programId(),
            locale: this._analyticsLocale(),
            draw_entry_fee_cents: DRAW_ENTRY_FEE_CENTS,
            ...(this._membershipTier ? { membership_tier: this._membershipTier } : {}),
        };
    }

    /**
     * Upsert contact email into the on-chain subscriber store (Studio Subscribers)
     * and identify the PostHog person. Safe to call repeatedly; dedupes per email.
     * @param {Record<string, string>} [payload]
     * @returns {Promise<void>}
     */
    async _syncDrawSubscriber(payload) {
        const p = payload && typeof payload === 'object' ? payload : this._collectPayload();
        const email = String(p.email || '').trim();
        if (!email.includes('@')) return;
        const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
        const emailKey = email.toLowerCase();
        const alreadySynced = this._subscriberSyncedEmail === emailKey;
        try {
            syncPosthogConversionPerson({
                email,
                firstName: p.firstName,
                lastName: p.lastName,
            });
        } catch {
            /* ignore */
        }
        if (alreadySynced) return;
        try {
            await submitEarlyAccessToCanister(email, 'Program Draw', fullName, 'program-draw-entry');
            this._subscriberSyncedEmail = emailKey;
            try {
                posthog.capture('newsletter_subscribed', {
                    source: 'program_draw_entry',
                    category: 'Program Draw',
                    ads_conversion: 'Lead',
                    ...this._posthogDrawBaseProps(),
                });
            } catch {
                /* ignore */
            }
        } catch {
            try {
                posthog.capture('newsletter_subscribe_failed', {
                    source: 'program_draw_entry',
                    ...this._posthogDrawBaseProps(),
                });
            } catch {
                /* ignore */
            }
        }
    }

    /**
     * @param {string} eventName
     * @param {Record<string, string | number | boolean | undefined>} [extra]
     */
    _captureDrawEvent(eventName, extra = {}) {
        try {
            const props = { ...this._posthogDrawBaseProps(), ...extra };
            for (const k of Object.keys(props)) {
                if (props[k] === undefined) delete props[k];
            }
            posthog.capture(eventName, props);
        } catch {
            /* ignore */
        }
    }

    /**
     * @returns {boolean}
     */
    _ensureContactOrPrompt() {
        const L = programFormFieldLabels();
        const D = drawLocaleCopy();
        const root = this.shadowRoot;
        const get = (id) => String(root?.querySelector(`#${id}`)?.value ?? '').trim();
        root?.querySelectorAll('.app-field--invalid').forEach((el) => {
            el.classList.remove('app-field--invalid');
        });
        const result = getMissingContactFields({
            getValue: get,
            fields: [
                { id: 'draw-first-name', label: L.firstName },
                { id: 'draw-last-name', label: L.lastName },
                { id: 'draw-email', label: L.email },
                { id: 'draw-country', label: L.country },
                { id: 'draw-city', label: L.city },
            ],
        });
        if (!result.missing.length && !result.invalidEmail) {
            this._setMsg('', 'neutral');
            this._saveDrawDraftFromForm();
            return true;
        }
        const lines = result.missing.map((f) => f.label);
        if (result.invalidEmail) lines.push(L.emailInvalid);
        this._setMsg(
            `${D.validationTitle}: ${lines.join(', ') || L.contactRequiredHint}`,
            'error',
        );
        const firstId = result.missing[0]?.id || (result.invalidEmail ? 'draw-email' : '');
        if (firstId) {
            const el = root?.querySelector(`#${firstId}`);
            if (el instanceof HTMLElement) {
                el.classList.add('app-field--invalid');
                el.focus();
            }
        }
        return false;
    }

    /**
     * @param {string} text
     * @param {'neutral' | 'error' | 'ok'} [tone]
     */
    _setMsg(text, tone = 'neutral') {
        const el = this.shadowRoot?.querySelector('#draw-form-status');
        if (!(el instanceof HTMLElement)) return;
        el.textContent = text || '';
        el.classList.toggle('is-error', tone === 'error');
        el.classList.toggle('is-success', tone === 'ok');
    }

    /**
     * Branded floating notice when pay/enter is blocked by missing account / artist link.
     * @param {'no_account' | 'no_linked_artist'} kind
     */
    _showAccountGateNotice(kind) {
        const root = this.shadowRoot;
        if (!root) return;
        root.querySelector('.app-account-gate-overlay')?.remove();
        const D = drawLocaleCopy();
        const isNoAccount = kind !== 'no_linked_artist';
        const title = isNoAccount ? D.accountGateNoAccountTitle : D.accountGateNoLinkedTitle;
        const body = isNoAccount ? D.accountGateNoAccountBody : D.accountGateNoLinkedBody;
        const solution = isNoAccount
            ? D.accountGateNoAccountSolution
            : D.accountGateNoLinkedSolution;

        const overlay = document.createElement('div');
        overlay.className = 'app-account-gate-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'draw-account-gate-title');

        const card = document.createElement('div');
        card.className = 'app-account-gate-card';
        card.innerHTML = `
            <p class="app-account-gate-eyebrow">Fusion</p>
            <h3 class="app-account-gate-title" id="draw-account-gate-title"></h3>
            <p class="app-account-gate-body"></p>
            <p class="app-account-gate-solution"></p>
            <p class="app-account-gate-contact">
                <span class="app-account-gate-contact-lead"></span>
                <a class="app-account-gate-mail" href="mailto:info@fusionart.world"></a>
            </p>
            <div class="app-account-gate-actions">
                <a class="app-btn app-btn--primary app-account-gate-join" href="/join-network"></a>
                <button type="button" class="app-btn app-btn--ghost app-account-gate-close"></button>
            </div>
        `;
        const titleEl = card.querySelector('.app-account-gate-title');
        const bodyEl = card.querySelector('.app-account-gate-body');
        const solutionEl = card.querySelector('.app-account-gate-solution');
        const leadEl = card.querySelector('.app-account-gate-contact-lead');
        const mailEl = card.querySelector('.app-account-gate-mail');
        const joinEl = card.querySelector('.app-account-gate-join');
        const closeBtn = card.querySelector('.app-account-gate-close');
        if (titleEl) titleEl.textContent = title;
        if (bodyEl) bodyEl.textContent = body;
        if (solutionEl) solutionEl.textContent = solution;
        if (leadEl) leadEl.textContent = `${D.accountGateContactLead} `;
        if (mailEl) mailEl.textContent = D.accountGateContactCta;
        if (joinEl) joinEl.textContent = D.accountGateJoinCta;
        if (closeBtn) closeBtn.textContent = D.accountGateClose;

        overlay.appendChild(card);
        root.appendChild(overlay);

        const close = () => overlay.remove();
        closeBtn?.addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') close();
        });
        joinEl?.addEventListener('click', (e) => {
            e.preventDefault();
            close();
            navigate('/join-network');
        });
        if (closeBtn instanceof HTMLElement) closeBtn.focus();
    }

    /**
     * @param {unknown} err
     * @returns {boolean} true when a gate notice was shown
     */
    _handleAccountGateError(err) {
        const code =
            err && typeof err === 'object' && 'code' in err
                ? String(/** @type {{ code?: unknown }} */ (err).code ?? '')
                : '';
        const D = drawLocaleCopy();
        if (code === PROGRAM_APPLICATION_ERROR_CODE.NO_ACCOUNT) {
            this._setMsg(D.submitNoAccount, 'error');
            this._showAccountGateNotice('no_account');
            return true;
        }
        if (code === PROGRAM_APPLICATION_ERROR_CODE.NO_LINKED_ARTIST) {
            this._setMsg(D.submitNoLinkedArtist, 'error');
            this._showAccountGateNotice('no_linked_artist');
            return true;
        }
        return false;
    }

    /**
     * @param {{ orderId: string, programId: string, captured: boolean }} opts
     */
    _openPaidCompletionModal(opts) {
        const modal = this.shadowRoot?.querySelector('#draw-paid-modal');
        if (!modal || typeof modal.open !== 'function') return;
        modal.open({
            orderId: opts.orderId,
            programId: opts.programId,
            captured: opts.captured,
            onContinue: (detail) => {
                void this._finishPaidEntryAfterCheckout({
                    orderId: detail.orderId || opts.orderId,
                    programId: detail.programId || opts.programId,
                    promptLogin: true,
                });
            },
        });
    }

    _closePaidCompletionModal() {
        const modal = this.shadowRoot?.querySelector('#draw-paid-modal');
        if (modal && typeof modal.close === 'function') modal.close();
    }

    _closeFinishModal() {
        const modal = document.querySelector('app-program-draw-finish-modal');
        if (modal && typeof modal.close === 'function') modal.close();
    }

    /**
     * Body-mounted finish modal (survives `_refresh`).
     * @param {'finishing' | 'success' | 'error'} phase
     * @param {{ errorMessage?: string, onRetry?: () => void }} [opts]
     */
    _openFinishModal(phase, opts = {}) {
        const modal = ensureProgramDrawFinishModal();
        if (typeof modal.open === 'function') {
            modal.open({
                phase,
                errorMessage: opts.errorMessage,
                onRetry: opts.onRetry,
            });
        }
    }

    /**
     * @param {'finishing' | 'success' | 'error'} phase
     * @param {{ errorMessage?: string, onRetry?: () => void }} [opts]
     */
    _setFinishModalPhase(phase, opts = {}) {
        const modal = ensureProgramDrawFinishModal();
        if (typeof modal.setPhase === 'function') {
            modal.setPhase(phase, opts);
        } else if (typeof modal.open === 'function') {
            modal.open({ phase, ...opts });
        }
    }

    /** Scroll to “You’re entered” / withdraw panel inside this form’s shadow. */
    _scrollToEnteredPanel() {
        const panel = this.shadowRoot?.querySelector('#draw-applied-panel');
        scrollElementTopToViewportGap(
            panel instanceof Element ? panel : this,
            PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX,
        );
    }

    /**
     * After register/enter: clear actor cache + refresh header Join → Studio.
     * @returns {Promise<void>}
     */
    async _refreshAuthUiAfterAccount() {
        try {
            clearAuthenticatedFusionBackendActorCache();
            await dispatchFusionAuthChange();
        } catch {
            /* header will catch up on next auth event */
        }
    }

    /**
     * Bust progress caches so remounted display shows updated entered count.
     * @param {string} [programId]
     */
    _invalidateDrawProgressCaches(programId) {
        const id = String(programId || this._programId() || '').trim();
        invalidateProgramDrawDisplayCache();
        invalidateProgramDrawProgressCache(id || undefined);
    }

    /**
     * Notify program page CTAs (Enter Program Draw → Program Draw) after enter/exit.
     * @param {'entered' | 'exited'} status
     * @param {string} [programId]
     */
    _notifyDrawEntryChange(status, programId) {
        const id = String(programId || this._programId() || '').trim();
        try {
            window.dispatchEvent(
                new CustomEvent('fusion-program-draw-entry-change', {
                    detail: { programId: id, status },
                }),
            );
        } catch {
            /* ignore */
        }
    }

    /**
     * After PayPal popup approve: capture first, then modal (guest) or finish enter (signed-in).
     * @param {{
     *   orderId: string,
     *   programId: string,
     *   payload?: Record<string, string>,
     * }} opts
     */
    async _handlePayPalApprovedAfterPopup(opts) {
        const D = drawLocaleCopy();
        const orderId = String(opts?.orderId || this._lastPaidOrderId || '').trim();
        const programId = String(opts?.programId || this._programId() || '').trim();
        const payload =
            opts?.payload && typeof opts.payload === 'object' ? opts.payload : this._collectPayload();
        if (!orderId || !programId) {
            this._paidEnterPending = false;
            this._setMsg(D.paidCheckoutNotCompleted, 'error');
            this._openPaidCompletionModal({ orderId, programId, captured: false });
            return;
        }
        this._lastPaidOrderId = orderId;
        this._setMsg(D.paidCapturing, 'neutral');

        const snap = await getAuthSnapshot();
        const principal = snap?.authenticated
            ? String(snap.principal?.toText?.() || '').trim()
            : '';

        try {
            const confirmResult = await confirmPayPalOneTimePayment(orderId, {
                ...(principal ? { principal } : {}),
                programId,
                applicationId: `award:${programId}`,
                paymentType: 'program_award_entry',
                payload,
            });
            const awaitingPrincipal = Boolean(
                confirmResult &&
                    typeof confirmResult === 'object' &&
                    /** @type {{ awaitingPrincipal?: boolean }} */ (confirmResult).awaitingPrincipal,
            );

            // Capture succeeded (ledger may still await principal for guests).
            this._paidEnterPending = true;
            persistCapturedDrawOrder(programId, orderId, payload);

            const payVal = DRAW_ENTRY_FEE_CENTS / 100;
            this._captureDrawEvent('program_draw_payment_completed', {
                payment_plan: 'one_time',
                value: payVal,
                currency: 'USD',
                ads_conversion: 'Purchase',
            });
            try {
                metaTrack('Purchase', {
                    value: payVal,
                    currency: 'USD',
                    content_name: 'program_draw_entry',
                    content_ids: [programId].filter(Boolean),
                });
            } catch {
                /* ignore */
            }

            const alreadyEntered = Boolean(
                confirmResult &&
                    typeof confirmResult === 'object' &&
                    /** @type {{ entered?: boolean }} */ (confirmResult).entered,
            );

            if (principal && !awaitingPrincipal) {
                this._setMsg(D.paidFinishing, 'neutral');
                await this._finishPaidEntryAfterCheckout({
                    orderId,
                    programId,
                    payload,
                    promptLogin: false,
                    skipCaptureConfirm: true,
                    preferIntegrationEntered: alreadyEntered,
                });
                return;
            }

            this._setMsg(D.paidSignInToFinish, 'neutral');
            this._showRetryEnterControl();
            this._openPaidCompletionModal({ orderId, programId, captured: true });
        } catch (e) {
            this._paidEnterPending = false;
            this._captureDrawEvent('program_draw_payment_failed', {
                payment_plan: 'one_time',
            });
            this._setMsg(
                e instanceof Error ? e.message : D.paidCheckoutNotCompleted,
                'error',
            );
            this._openPaidCompletionModal({ orderId, programId, captured: false });
        }
    }

    /**
     * After $50 PayPal capture: ensure II + Fusion account, confirm order onto ledger, enter draw.
     * Guests pay first (capture); sign-in + ledger happen here.
     * @param {{
     *   orderId: string,
     *   programId?: string,
     *   payload?: Record<string, string>,
     *   promptLogin?: boolean,
     *   skipCaptureConfirm?: boolean,
     *   preferIntegrationEntered?: boolean,
     * }} opts
     * @returns {Promise<boolean>}
     */
    async _finishPaidEntryAfterCheckout(opts) {
        const D = drawLocaleCopy();
        const orderId = String(opts?.orderId || this._lastPaidOrderId || '').trim();
        const programId = String(opts?.programId || this._programId() || '').trim();
        const stored = readCapturedDrawOrderState(programId);
        const payload =
            opts?.payload && typeof opts.payload === 'object'
                ? opts.payload
                : Object.keys(stored.payload || {}).length
                  ? stored.payload
                  : this._collectPayload();
        if (!orderId || !programId) {
            this._setMsg(D.paidCheckoutNotCompleted, 'error');
            return false;
        }
        this._lastPaidOrderId = orderId;
        // Entry unfinished after a confirmed capture (session / Retry).
        this._paidEnterPending = true;
        persistCapturedDrawOrder(programId, orderId, payload);

        this._closePaidCompletionModal();
        this._openFinishModal('finishing');

        const finishRetry = () => {
            void this._finishPaidEntryAfterCheckout({
                orderId,
                programId,
                payload,
                promptLogin: true,
            });
        };

        let snap = await getAuthSnapshot();
        if (!snap?.authenticated) {
            if (opts.promptLogin === false) {
                this._setMsg(D.paidSignInToFinish, 'neutral');
                this._showRetryEnterControl();
                this._closeFinishModal();
                this._openPaidCompletionModal({ orderId, programId, captured: true });
                return false;
            }
            this._setMsg(D.paidSignInToFinish, 'neutral');
            try {
                await loginInternetIdentity({ source: 'join-link' });
            } catch (e) {
                if (e === ERROR_USER_INTERRUPT) {
                    this._setMsg(D.paidSignInCancelled, 'error');
                    this._showRetryEnterControl();
                    this._closeFinishModal();
                    this._openPaidCompletionModal({ orderId, programId, captured: true });
                    return false;
                }
                const msg = e instanceof Error ? e.message : String(e);
                this._setMsg(msg, 'error');
                this._showRetryEnterControl();
                this._setFinishModalPhase('error', { errorMessage: msg, onRetry: finishRetry });
                return false;
            }
            snap = await getAuthSnapshot();
            if (!snap?.authenticated) {
                this._setMsg(D.paidSignInCancelled, 'error');
                this._showRetryEnterControl();
                this._closeFinishModal();
                this._openPaidCompletionModal({ orderId, programId, captured: true });
                return false;
            }
        }

        this._setMsg(D.paidFinishing, 'neutral');
        this._setFinishModalPhase('finishing');
        const principal = String(snap.principal?.toText?.() || '').trim();
        if (!principal) {
            this._setMsg(D.needSignIn, 'error');
            this._showRetryEnterControl();
            this._setFinishModalPhase('error', {
                errorMessage: D.needSignIn,
                onRetry: finishRetry,
            });
            return false;
        }

        try {
            const email = String(payload.email || '').trim();
            if (email.includes('@')) {
                setStoredBillingEmailForPrincipal(principal, email);
                try {
                    await setMyAccountContactForCaller({
                        email,
                        firstName: String(payload.firstName || ''),
                        lastName: String(payload.lastName || ''),
                    });
                } catch {
                    /* contact sidecar optional */
                }
            }

            const actor = await getAuthenticatedFusionBackendActor();
            if (actor && typeof actor.registerOrUpdateAccount === 'function') {
                await actor.registerOrUpdateAccount(categoryToUserRole('artist'));
                await this._refreshAuthUiAfterAccount();
            }
            try {
                await ensureMyLinkedArtistProfileForApplication();
            } catch {
                /* award enter does not require linked artist */
            }

            if (!opts.skipCaptureConfirm) {
                await confirmPayPalOneTimePayment(orderId, {
                    principal,
                    programId,
                    applicationId: `award:${programId}`,
                    paymentType: 'program_award_entry',
                    payload,
                });
            }

            // Integration confirm may already have entered; FE enter is idempotent backup.
            let entered = opts.preferIntegrationEntered === true;
            if (!entered) {
                entered = await this._enterWithRetry(true, {
                    skipAccountCheck: true,
                    retries: 3,
                    paypalOrderId: orderId,
                    skipFinishModal: true,
                });
            } else {
                try {
                    await this._enterWithRetry(true, {
                        skipAccountCheck: true,
                        retries: 1,
                        paypalOrderId: orderId,
                        skipFinishModal: true,
                        suppressErrorMsg: true,
                    });
                } catch {
                    /* already entered via integration */
                }
                entered = true;
            }
            if (entered) {
                this._paidEnterPending = false;
                clearCapturedDrawOrder(programId);
                await this._refreshAuthUiAfterAccount();
                this._setFinishModalPhase('success');
            } else {
                this._setFinishModalPhase('error', {
                    errorMessage: D.paidEnterFailed,
                    onRetry: finishRetry,
                });
            }
            return entered;
        } catch (e) {
            if (this._handleAccountGateError(e)) {
                this._showRetryEnterControl();
                this._setFinishModalPhase('error', {
                    errorMessage: e instanceof Error ? e.message : String(e),
                    onRetry: finishRetry,
                });
                return false;
            }
            const msg = e instanceof Error ? e.message : String(e);
            this._setMsg(msg, 'error');
            this._showRetryEnterControl();
            this._setFinishModalPhase('error', { errorMessage: msg, onRetry: finishRetry });
            return false;
        }
    }

    /**
     * II + Fusion account ready for paid draw entry (members already signed in).
     * Not used for guest PayPal createOrder — guests pay first, then `_finishPaidEntryAfterCheckout`.
     * @returns {Promise<boolean>}
     */
    async _ensureAccountReadyForPay() {
        const D = drawLocaleCopy();
        const snap = await getAuthSnapshot();
        if (!snap?.authenticated) {
            this._setMsg(D.needSignIn, 'error');
            this._showAccountGateNotice('no_account');
            return false;
        }
        try {
            await assertProgramApplicationSubmissionReady();
            return true;
        } catch (err) {
            if (this._handleAccountGateError(err)) return false;
            this._setMsg(err instanceof Error ? err.message : String(err), 'error');
            return false;
        }
    }

    /**
     * @param {boolean} paidEntryReceipt
     * @param {{
     *   skipAccountCheck?: boolean,
     *   suppressErrorMsg?: boolean,
     *   paypalOrderId?: string,
     *   skipFinishModal?: boolean,
     * }} [opts]
     * @returns {Promise<boolean>}
     */
    async _enter(paidEntryReceipt, opts = {}) {
        const id = this._programId();
        if (!id) return false;
        if (!this._ensureContactOrPrompt()) return false;
        const D = drawLocaleCopy();
        if (paidEntryReceipt && !opts.skipAccountCheck) {
            const ready = await this._ensureAccountReadyForPay();
            if (!ready) return false;
        }
        const ownFinishModal = !opts.skipFinishModal;
        if (ownFinishModal) this._openFinishModal('finishing');
        this._setMsg(D.entering, 'neutral');
        const payload = this._collectPayload();
        void this._syncDrawSubscriber(payload);
        if (!paidEntryReceipt) {
            this._captureDrawEvent('program_draw_started', {
                entry_path: 'award_credit',
                ads_conversion: 'InitiateCheckout',
            });
        }
        try {
            const paypalOrderId = paidEntryReceipt
                ? String(opts.paypalOrderId || this._lastPaidOrderId || '').trim()
                : '';
            if (paidEntryReceipt && !paypalOrderId) {
                throw new Error('Missing PayPal order id for paid entry.');
            }
            await enterProgramAward(id, {
                paypalOrderId,
                payload,
            });
            this._paidEnterPending = false;
            this._lastPaidOrderId = '';
            clearProgramApplicationDraft(id);
            this._captureDrawEvent('program_draw_entered', {
                entry_path: paidEntryReceipt ? 'paid' : 'award_credit',
                ads_conversion: 'SubmitApplication',
            });
            try {
                metaTrack('SubmitApplication', {
                    content_ids: [id].filter(Boolean),
                    content_name: 'program_draw_entry',
                });
            } catch {
                /* ignore */
            }
            this._setMsg(D.success, 'ok');
            this._invalidateDrawProgressCaches(id);
            await this._refresh();
            this._notifyDrawEntryChange('entered', id);
            if (ownFinishModal) this._setFinishModalPhase('success');
            return true;
        } catch (e) {
            const code =
                e && typeof e === 'object' && 'code' in e
                    ? String(/** @type {{ code?: unknown }} */ (e).code || '')
                    : '';
            this._captureDrawEvent('program_draw_failed', {
                entry_path: paidEntryReceipt ? 'paid' : 'award_credit',
                error_code: code || 'unknown',
            });
            if (ownFinishModal) {
                this._setFinishModalPhase('error', {
                    errorMessage: e instanceof Error ? e.message : String(e),
                    onRetry: () => {
                        void this._enter(paidEntryReceipt, opts);
                    },
                });
            }
            if (paidEntryReceipt && this._handleAccountGateError(e)) return false;
            if (opts.suppressErrorMsg) throw e;
            this._setMsg(e instanceof Error ? e.message : String(e), 'error');
            return false;
        }
    }

    async _refresh() {
        if (!this.shadowRoot) return;
        if (this.getAttribute('active') !== 'true' || this.hasAttribute('hidden')) {
            this._teardownPayCheckout();
            this.shadowRoot.innerHTML = '';
            return;
        }

        const token = ++this._renderToken;
        this._abort?.abort();
        this._abort = new AbortController();
        const signal = this._abort.signal;
        this._teardownPayCheckout();

        const id = this._programId();
        const L = programFormFieldLabels();
        const D = drawLocaleCopy();
        const feeDollars = Math.round(DRAW_ENTRY_FEE_CENTS / 100);

        let cfg = null;
        try {
            cfg = id ? await getProgramDrawConfigPublic(id) : null;
        } catch {
            cfg = null;
        }
        if (token !== this._renderToken) return;
        if (!cfg?.active) {
            this.shadowRoot.innerHTML = `
        <style>${this._styles()}</style>
        <div class="application-form-root">
          <h2 class="app-form-title">${escapeHtml(D.titleInactive || D.title)}</h2>
          <app-program-draw-display
            id="draw-display"
            data-program-id="${escapeHtml(id || '')}"
            data-draw-active="false"
          ></app-program-draw-display>
          <app-program-draw-notify-modal id="draw-notify-modal"></app-program-draw-notify-modal>
        </div>`;
            this.shadowRoot.querySelector('#draw-display')?.addEventListener(
                'fusion-draw-display-get-notified',
                () => {
                    const modal = this.shadowRoot?.querySelector('#draw-notify-modal');
                    if (modal && typeof modal.open === 'function') modal.open();
                },
                { signal },
            );
            this.shadowRoot.querySelector('#draw-display')?.addEventListener(
                'fusion-draw-display-apply',
                () => {
                    void revealProgramApplicationOrOpenJoin();
                },
                { signal },
            );
            return;
        }

        const snap = await getAuthSnapshot();
        if (token !== this._renderToken) return;
        const authenticated = Boolean(snap?.authenticated);
        let path = '';
        let entry = null;
        /** @type {Record<string, string>} */
        let payload = {};
        let awardBal = 0;
        let membershipGate = 'noAccount';
        if (authenticated && id) {
            try {
                membershipGate = await getMembershipAccessForCaller();
            } catch {
                membershipGate = 'unknown';
            }
            try {
                path = await getMyProgramPath(id);
                const detailed = await getMyProgramAwardEntryDetailed(id);
                entry = detailed?.entry || null;
                if (detailed?.payloadJson) {
                    try {
                        const parsed = JSON.parse(detailed.payloadJson);
                        if (parsed && typeof parsed === 'object') {
                            payload = /** @type {Record<string, string>} */ (parsed);
                        }
                    } catch {
                        /* ignore */
                    }
                }
                const credits = await getAwardCreditsForCaller();
                awardBal = Number(credits?.balance) || 0;
            } catch {
                /* ignore */
            }
        }
        if (id) {
            payload = this._mergeLocalDraftIntoPayload(id, payload);
        }
        if (token !== this._renderToken) return;

        const entered = entry && String(entry.status) === 'entered';
        const onApplicationPath = path === 'application';
        const membershipOk = membershipGate === 'ok' || membershipGate === 'exempt';
        /** Paid $50 path — no membership required (mirror formal single-application payment). */
        const canPay = !onApplicationPath && !entered;
        /** Award-credit path — needs auth + balance; membership implied by having a credit. */
        const canUseCredit =
            authenticated && awardBal >= 1 && !onApplicationPath && !entered;
        const useCredit = canUseCredit;
        this._payGate = {
            canPay,
            onApplicationPath,
            entered: Boolean(entered),
            programId: id || '',
        };

        let gateHtml = '';
        /** Only hard-block fields when path mutex — guests can fill before pay. */
        let formDisabled = false;
        const showPayment = !entered && !onApplicationPath;

        if (onApplicationPath) {
            gateHtml = `<div class="app-selection-intro"><p>${escapeHtml(D.withdrawFirst)}</p></div>`;
            formDisabled = true;
        } else if (!entered && !membershipOk && authenticated) {
            gateHtml = `<div class="app-selection-intro"><p>${escapeHtml(D.needMembership)}</p></div>`;
        }

        const v = (key) => escapeHtml(String(payload[key] ?? ''));

        if (entered) {
            this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <div class="application-form-root">
        <h2 class="app-form-title">${escapeHtml(D.title)}</h2>
        <app-program-draw-display
          id="draw-display"
          data-program-id="${escapeHtml(id || '')}"
          data-draw-active="true"
          data-user-entered="true"
        ></app-program-draw-display>
        <div class="app-view-details-row">
          <button type="button" class="app-btn app-btn--ghost" id="draw-view-program-details">${escapeHtml(D.viewProgramDetails)}</button>
        </div>
        <div class="app-form-card app-form-card--spaced draw-applied-panel" id="draw-applied-panel">
          <h3 class="app-step-heading">${escapeHtml(D.enteredTitle)}</h3>
          <p class="app-step-lead">${escapeHtml(D.enteredBody)}</p>
          <p class="app-step-lead studio-muted">${escapeHtml(D.exitHint)}</p>
          <div class="app-form-actions">
            <button type="button" class="app-btn app-btn--ghost" data-draw-exit>${escapeHtml(D.exitDraw)}</button>
          </div>
        </div>
        <p id="draw-form-status" class="app-form-status" role="status" aria-live="polite"></p>
      </div>`;
            this.shadowRoot.querySelector('#draw-view-program-details')?.addEventListener(
                'click',
                () => {
                    const detailsId =
                        this._programFormContext?.detailsSectionId || 'programDetailsSection';
                    scrollElementTopToViewportGap(
                        document.getElementById(detailsId),
                        PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX,
                    );
                },
                { signal },
            );
            this.shadowRoot.querySelector('#draw-display')?.addEventListener(
                'fusion-draw-display-apply',
                () => {
                    this._scrollToEnteredPanel();
                },
                { signal },
            );
            this.shadowRoot.querySelector('#draw-display')?.addEventListener(
                'fusion-draw-display-view-all',
                () => {
                    navigate('/artists?connection=drawRecipients');
                },
                { signal },
            );
            this.shadowRoot.querySelector('[data-draw-exit]')?.addEventListener(
                'click',
                async () => {
                    if (!window.confirm(D.exitConfirm)) return;
                    this._setMsg(D.exiting, 'neutral');
                    try {
                        await exitProgramAward(id);
                        this._invalidateDrawProgressCaches(id);
                        await this._refresh();
                        this._notifyDrawEntryChange('exited', id);
                    } catch (e) {
                        this._setMsg(e instanceof Error ? e.message : String(e), 'error');
                    }
                },
                { signal },
            );
            return;
        }

        this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <div class="application-form-root">
        <h2 class="app-form-title">${escapeHtml(D.title)}</h2>
        <app-program-draw-display
          id="draw-display"
          data-program-id="${escapeHtml(id || '')}"
          data-draw-active="true"
          data-user-entered="false"
        ></app-program-draw-display>
        ${gateHtml}
        <div class="app-view-details-row">
          <button type="button" class="app-btn app-btn--ghost" id="draw-view-program-details">${escapeHtml(D.viewProgramDetails)}</button>
        </div>
        <form id="draw-form-fields" novalidate ${formDisabled ? 'inert' : ''}>
          <div class="app-form-card" id="draw-contact">
            <h3 class="app-step-heading">${escapeHtml(L.contactSectionTitle)}</h3>
            <div class="app-field app-field--card-row">
              <div>
                <label for="draw-first-name">${escapeHtml(L.firstName)} <span aria-hidden="true">*</span></label>
                <input id="draw-first-name" name="firstName" type="text" autocomplete="given-name" value="${v('firstName')}" />
              </div>
              <div>
                <label for="draw-last-name">${escapeHtml(L.lastName)} <span aria-hidden="true">*</span></label>
                <input id="draw-last-name" name="lastName" type="text" autocomplete="family-name" value="${v('lastName')}" />
              </div>
            </div>
            <div class="app-field">
              <label for="draw-email">${escapeHtml(L.email)} <span aria-hidden="true">*</span></label>
              <input id="draw-email" name="email" type="text" inputmode="email" autocomplete="email" value="${v('email')}" />
            </div>
            <div class="app-field">
              <label for="draw-country">${escapeHtml(L.country)} <span aria-hidden="true">*</span></label>
              <input id="draw-country" name="country" type="text" autocomplete="country-name" value="${v('country')}" />
            </div>
            <div class="app-field">
              <label for="draw-state">${escapeHtml(L.state)}</label>
              <input id="draw-state" name="stateProvince" type="text" autocomplete="address-level1" value="${v('stateProvince')}" />
            </div>
            <div class="app-field">
              <label for="draw-city">${escapeHtml(L.city)} <span aria-hidden="true">*</span></label>
              <input id="draw-city" name="city" type="text" autocomplete="address-level2" value="${v('city')}" />
            </div>
          </div>

          <div class="app-form-card app-form-card--spaced">
            <h3 class="app-step-heading">${escapeHtml(D.aboutSectionTitle)}</h3>
            <div class="app-field">
              <label for="draw-website">${escapeHtml(L.website)}</label>
              <p class="app-field-byline">${escapeHtml(L.websiteByline)}</p>
              <input id="draw-website" name="website" type="text" inputmode="url" autocomplete="url" placeholder="https://" value="${v('website')}" />
            </div>
            <div class="app-field">
              <label for="draw-bio">${escapeHtml(L.bioStatement)}</label>
              <p class="app-field-byline">${escapeHtml(L.bioStatementByline)}</p>
              <textarea id="draw-bio" name="bioStatement" rows="5">${v('bioStatement')}</textarea>
            </div>
          </div>
        </form>

        ${
            showPayment
                ? (() => {
                      const showMembershipExplore = !useCredit && !membershipOk;
                      const pay = this._drawPaymentLabels(D, feeDollars);
                      const bulletsHtml = (pay.bullets || [])
                          .map(
                              (t) =>
                                  `<li>${appFeeIconHtml(benefitCheckIcon, 'app-fee-icon app-fee-icon--check')}<span>${escapeHtml(t)}</span></li>`,
                          )
                          .join('');
                      const mem = this._membershipPlanLabels(D);
                      const memBulletHtml = (items) =>
                          (items || [])
                              .map(
                                  (t) =>
                                      `<li>${appFeeIconHtml(benefitCheckIcon, 'app-fee-icon app-fee-icon--check')}<span>${escapeHtml(t)}</span></li>`,
                              )
                              .join('');

                      if (useCredit) {
                          const bodyFn =
                              typeof D.creditCalloutBody === 'function'
                                  ? D.creditCalloutBody
                                  : () => D.creditHint(awardBal);
                          const remainFn =
                              typeof D.creditRemainingHint === 'function'
                                  ? D.creditRemainingHint
                                  : () => '';
                          return `<div class="app-form-card app-form-card--spaced" id="draw-complete">
            <h3 class="app-step-heading">${escapeHtml(D.completeHeading)}</h3>
            <div class="draw-credit-callout" role="status">
              <p class="draw-credit-callout__eyebrow">${escapeHtml(D.creditBadge)}</p>
              <p class="draw-credit-callout__title">${escapeHtml(D.creditCalloutTitle)}</p>
              <p class="draw-credit-callout__body">${escapeHtml(bodyFn(awardBal))}</p>
              <p class="draw-credit-callout__meta">${escapeHtml(remainFn(awardBal))}</p>
            </div>
            <div class="app-form-actions">
              <button type="button" class="app-btn app-btn--primary" data-draw-credit>${escapeHtml(D.useCredit)}</button>
            </div>
            <footer class="app-fee-footer">
              <div class="app-fee-footer-right">
                <span>${escapeHtml(D.footerQuestionsPrefix)}</span>
                <a href="mailto:info@fusionart.world">${escapeHtml(D.footerContactUs)}</a>
              </div>
            </footer>
          </div>`;
                      }

                      const membershipToggleHtml = showMembershipExplore
                          ? `<button type="button" class="app-payment-cta app-payment-cta--secondary" id="draw-explore-memberships-toggle" aria-expanded="${this._membershipsExpanded ? 'true' : 'false'}">
                  ${escapeHtml(this._membershipsExpanded ? D.exploreMembershipsCollapse : D.exploreMembershipsExpand)}
                </button>`
                          : '';
                      const membershipPanelHtml = showMembershipExplore
                          ? `<div id="draw-membership-plans-panel" class="app-membership-plans-panel" ${this._membershipsExpanded ? '' : 'hidden'}>
                <button type="button" class="app-payment-membership-card" data-draw-membership-tier="monthly">
                  <span class="app-payment-plan-radio" aria-hidden="true"></span>
                  <span class="app-payment-plan-icon-wrap">${appFeeIconHtml(paymentCardIcon, 'app-fee-icon app-fee-icon--plan')}</span>
                  <span class="app-payment-membership-card-body">
                    <span class="app-payment-membership-head">
                      <span class="app-payment-membership-title">${escapeHtml(mem.monthly.title)}</span>
                      <span class="app-payment-membership-price">${escapeHtml(mem.monthly.price)}</span>
                      <span class="app-payment-membership-every">${escapeHtml(mem.monthly.every)}</span>
                    </span>
                    <ul class="app-payment-plan-bullets">${memBulletHtml(mem.monthly.bullets)}</ul>
                  </span>
                </button>
                <div class="app-payment-plan-wrap app-payment-plan-wrap--suggested">
                  <span class="app-payment-plan-suggested-badge">${escapeHtml(D.suggestedBadge)}</span>
                  <button type="button" class="app-payment-membership-card" data-draw-membership-tier="quarterly">
                    <span class="app-payment-plan-radio" aria-hidden="true"></span>
                    <span class="app-payment-plan-icon-wrap">${appFeeIconHtml(popularCrownIcon, 'app-fee-icon app-fee-icon--plan')}</span>
                    <span class="app-payment-membership-card-body">
                      <span class="app-payment-membership-head">
                        <span class="app-payment-membership-title">${escapeHtml(mem.quarterly.title)}</span>
                        <span class="app-payment-membership-price">${escapeHtml(mem.quarterly.price)}</span>
                        <span class="app-payment-membership-every">${escapeHtml(mem.quarterly.every)}</span>
                      </span>
                      <ul class="app-payment-plan-bullets">${memBulletHtml(mem.quarterly.bullets)}</ul>
                    </span>
                  </button>
                </div>
                <button type="button" class="app-payment-membership-card" data-draw-membership-tier="annual">
                  <span class="app-payment-plan-radio" aria-hidden="true"></span>
                  <span class="app-payment-plan-icon-wrap">${appFeeIconHtml(annualDiamondIcon, 'app-fee-icon app-fee-icon--plan')}</span>
                  <span class="app-payment-membership-card-body">
                    <span class="app-payment-membership-head">
                      <span class="app-payment-membership-title">${escapeHtml(mem.annual.title)}</span>
                      <span class="app-payment-membership-price">${escapeHtml(mem.annual.price)}</span>
                      <span class="app-payment-membership-every">${escapeHtml(mem.annual.every)}</span>
                    </span>
                    <ul class="app-payment-plan-bullets">${memBulletHtml(mem.annual.bullets)}</ul>
                  </span>
                </button>
              </div>`
                          : '';

                      const memberPayHint =
                          membershipOk && !useCredit
                              ? `<p class="draw-member-pay-hint">${escapeHtml(D.payHint(feeDollars))}</p>`
                              : '';

                      return `<div class="app-form-card app-form-card--payment" id="draw-complete">
            <div class="app-fee-choose">
              <h4 class="app-fee-choose-title">${escapeHtml(D.completeHeading)}</h4>
            </div>
            ${memberPayHint}
            <div class="app-fee-product-card" id="draw-fee-product-card">
              <div class="app-fee-product-card__main">
                <span class="app-fee-product-card__icon">${appFeeIconHtml(paymentCardIcon, 'app-fee-icon app-fee-icon--plan')}</span>
                <div class="app-fee-product-card__copy">
                  <p class="app-fee-product-card__title" id="draw-fee-product-title">${escapeHtml(pay.productTitle)}</p>
                  <p class="app-fee-product-card__price" id="draw-fee-product-price">${escapeHtml(pay.productPrice)}</p>
                  <span class="app-fee-product-card__badge">${escapeHtml(pay.productBadge)}</span>
                </div>
              </div>
              <ul class="app-fee-product-card__list">${bulletsHtml}</ul>
            </div>
            <div class="app-payment-cta-stack" role="radiogroup" aria-label="${escapeHtml(D.paymentPlanGroupLabel)}">
              <div class="app-payment-cta-row">
                <button type="button" class="app-payment-cta app-payment-cta--primary" role="radio" aria-checked="false" data-draw-pay-plan>
                  <span class="app-payment-cta-title">${escapeHtml(pay.planButtonTitle)}</span>
                  <span class="app-payment-cta-sub">${escapeHtml(pay.planSub)}</span>
                </button>
                ${membershipToggleHtml}
              </div>
              ${membershipPanelHtml}
            </div>
            <div id="draw-payment-placeholder" class="app-payment-placeholder">
              <div class="app-payment-placeholder-head">
                <p class="app-payment-placeholder-title">${escapeHtml(D.paymentPlaceholderTitle)}</p>
              </div>
              <p class="app-payment-placeholder-sub">${escapeHtml(D.paymentPlaceholderSub)}</p>
            </div>
            <div id="draw-payment-slot-wrap" class="app-payment-slot-wrap" hidden>
              <slot name="draw-pay-mount"></slot>
            </div>
            <footer class="app-fee-footer">
              <div class="app-fee-footer-right">
                <span>${escapeHtml(D.footerQuestionsPrefix)}</span>
                <a href="mailto:info@fusionart.world">${escapeHtml(D.footerContactUs)}</a>
              </div>
            </footer>
          </div>`;
                  })()
                : ''
        }

        <app-program-draw-paid-modal id="draw-paid-modal"></app-program-draw-paid-modal>
        <p id="draw-form-status" class="app-form-status" role="status" aria-live="polite"></p>
      </div>
    `;

        this.shadowRoot.querySelector('#draw-view-program-details')?.addEventListener(
            'click',
            () => {
                const detailsId =
                    this._programFormContext?.detailsSectionId || 'programDetailsSection';
                scrollElementTopToViewportGap(
                    document.getElementById(detailsId),
                    PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX,
                );
            },
            { signal },
        );
        this.shadowRoot.querySelector('#draw-display')?.addEventListener(
            'fusion-draw-display-submit',
            () => {
                // Scroll-only: bring the draw form into view (details row near top). No navigate.
                const anchor =
                    this.shadowRoot?.querySelector('.app-view-details-row') ||
                    this.shadowRoot?.querySelector('#draw-contact') ||
                    this.shadowRoot?.querySelector('#draw-form-fields');
                if (anchor instanceof HTMLElement) {
                    scrollElementTopToViewportGap(
                        anchor,
                        PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX,
                    );
                }
            },
            { signal },
        );
        this.shadowRoot.querySelector('#draw-display')?.addEventListener(
            'fusion-draw-display-apply',
            () => {
                if (entered || path === 'award') {
                    this._scrollToEnteredPanel();
                    return;
                }
                void revealProgramApplicationOrOpenJoin();
            },
            { signal },
        );
        this.shadowRoot.querySelector('#draw-display')?.addEventListener(
            'fusion-draw-display-view-all',
            () => {
                navigate('/artists?connection=drawRecipients');
            },
            { signal },
        );
        this.shadowRoot.querySelector('[data-draw-credit]')?.addEventListener(
            'click',
            () => {
                if (!canUseCredit) {
                    this._setMsg(
                        onApplicationPath
                            ? D.withdrawFirst
                            : entered
                              ? D.entered
                              : !authenticated
                                ? D.needSignIn
                                : D.needMembership,
                        'error',
                    );
                    return;
                }
                void this._enter(false);
            },
            { signal },
        );
        this.shadowRoot.querySelector('[data-draw-pay-plan]')?.addEventListener(
            'click',
            () => {
                if (!canPay) {
                    this._setMsg(onApplicationPath ? D.withdrawFirst : D.entered, 'error');
                    return;
                }
                this._membershipTier = null;
                this._membershipsExpanded = false;
                this._syncMembershipExploreUi(D);
                void this._preparePayCheckout();
            },
            { signal },
        );
        this.shadowRoot.querySelector('#draw-explore-memberships-toggle')?.addEventListener(
            'click',
            () => {
                this._membershipsExpanded = !this._membershipsExpanded;
                if (this._membershipsExpanded) {
                    this._teardownPayCheckout();
                    this._membershipTier = null;
                }
                this._syncMembershipExploreUi(D);
            },
            { signal },
        );
        this.shadowRoot.querySelectorAll('[data-draw-membership-tier]').forEach((btn) => {
            btn.addEventListener(
                'click',
                () => {
                    if (!canPay) {
                        this._setMsg(onApplicationPath ? D.withdrawFirst : D.entered, 'error');
                        return;
                    }
                    const tier = btn.getAttribute('data-draw-membership-tier') || '';
                    if (tier !== 'monthly' && tier !== 'quarterly' && tier !== 'annual') return;
                    void this._prepareMembershipCheckout(
                        /** @type {'monthly' | 'quarterly' | 'annual'} */ (tier),
                    );
                },
                { signal },
            );
        });
        const stored = id ? readCapturedDrawOrderState(id) : { orderId: '', payload: {} };
        if (stored.orderId) {
            this._lastPaidOrderId = stored.orderId;
            this._paidEnterPending = true;
            // Restore contact fields so Retry finish has a valid payload after a closed tab.
            if (stored.payload && typeof stored.payload === 'object') {
                for (const [key, value] of Object.entries(stored.payload)) {
                    const el = this.shadowRoot?.querySelector(`[name="${key}"]`);
                    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                        if (!String(el.value || '').trim() && value != null) {
                            el.value = String(value);
                        }
                    }
                }
            }
        }
        if (this._paidEnterPending && this._lastPaidOrderId) {
            // If they already entered (e.g. integration enter succeeded before close), clear pending.
            try {
                const detailed = await getMyProgramAwardEntryDetailed(id);
                const status = String(detailed?.entry?.status || '');
                if (status === 'entered') {
                    this._paidEnterPending = false;
                    clearCapturedDrawOrder(id);
                }
            } catch {
                /* keep retry affordance */
            }
        }
        if (this._paidEnterPending && this._lastPaidOrderId) {
            this._showRetryEnterControl();
            this._setMsg(D.paidSignInToFinish, 'neutral');
        }

        this._bindDrawDraftPersistence(signal);
    }

    _styles() {
        return `
      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;
        padding: clamp(2rem, 5vw, 3.5rem) 0 clamp(3rem, 8vw, 5rem);
      }

      :host([hidden]) {
        display: none !important;
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

      .app-selection-intro p {
        margin: 0 0 0.5rem;
      }

      .app-selection-intro p:last-child {
        margin-bottom: 0;
      }

      .app-view-details-row {
        max-width: 820px;
        margin: 0 auto clamp(1.5rem, 4vw, 2.25rem);
        display: flex;
        justify-content: center;
      }

      .app-form-card {
        max-width: 820px;
        margin: 0 auto;
        padding: clamp(1.25rem, 3vw, 2rem);
        box-sizing: border-box;
        background: var(--c3);
        border: 1px solid var(--c2);
        touch-action: manipulation;
      }

      .app-form-card--spaced {
        margin-top: clamp(1.25rem, 3vw, 2rem);
      }

      .app-form-card--payment {
        margin-top: clamp(1.25rem, 3vw, 2rem);
        padding: clamp(1.5rem, 3.5vw, 2.35rem);
      }

      .app-fee-icon {
        display: inline-block;
        flex-shrink: 0;
        width: 1.35rem;
        height: 1.35rem;
        background: currentColor;
        color: inherit;
        mask: var(--app-fee-icon-url) center / contain no-repeat;
        -webkit-mask: var(--app-fee-icon-url) center / contain no-repeat;
      }

      .app-fee-icon--check {
        width: 0.95rem;
        height: 0.95rem;
        margin-top: 0.12rem;
      }

      .app-fee-icon--plan {
        width: 1.65rem;
        height: 1.65rem;
      }

      .app-fee-choose {
        text-align: center;
        margin: 0 0 clamp(1rem, 2vw, 1.25rem);
      }

      .app-fee-choose-title {
        margin: 0 0 0.35rem;
        font-size: clamp(1.05rem, 1.4vw, 1.25rem);
        font-variation-settings: var(--fv-title);
        color: var(--c2);
        letter-spacing: 0.02em;
      }

      .app-fee-product-card {
        display: grid;
        grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
        gap: clamp(1rem, 2.2vw, 1.75rem);
        align-items: center;
        margin: 0 0 clamp(1rem, 2vw, 1.25rem);
        padding: clamp(1.1rem, 2vw, 1.45rem) clamp(1.15rem, 2.2vw, 1.6rem);
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 10px;
        background: color-mix(in srgb, var(--c3) 92%, #f3f3f3);
        box-sizing: border-box;
      }

      @media (max-width: 640px) {
        .app-fee-product-card {
          grid-template-columns: 1fr;
        }
      }

      .app-fee-product-card__main {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        min-width: 0;
      }

      .app-fee-product-card__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 3.25rem;
        height: 3.25rem;
        flex-shrink: 0;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.06);
      }

      .app-fee-product-card__copy {
        min-width: 0;
      }

      .app-fee-product-card__title {
        margin: 0 0 0.15rem;
        font-size: clamp(1rem, 1.25vw, 1.12rem);
        font-variation-settings: var(--fv-title);
        font-weight: 700;
        color: var(--c2);
      }

      .app-fee-product-card__price {
        margin: 0 0 0.45rem;
        font-size: clamp(1.05rem, 1.5vw, 1.35rem);
        font-variation-settings: var(--fv-emphasis);
        font-weight: 700;
        color: var(--c2);
        line-height: 1.25;
      }

      .app-fee-product-card__badge {
        display: inline-block;
        padding: 0.28rem 0.65rem;
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.07);
        color: var(--c2);
        font-size: clamp(0.62rem, 0.75vw, 0.7rem);
        font-variation-settings: var(--fv-label-strong);
        font-weight: 700;
        letter-spacing: 0.07em;
        text-transform: uppercase;
      }

      .app-fee-product-card__list {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .app-fee-product-card__list li {
        display: flex;
        align-items: flex-start;
        gap: 0.45rem;
        margin: 0 0 0.4rem;
        font-size: clamp(0.82rem, 0.98vw, 0.92rem);
        font-variation-settings: var(--fv-body-wide);
        line-height: 1.4;
        color: var(--c2);
      }

      .app-fee-product-card__list li:last-child {
        margin-bottom: 0;
      }

      .app-payment-cta-stack {
        display: flex;
        flex-direction: column;
        gap: clamp(1rem, 2vw, 1.35rem);
        margin: 0 0 clamp(1.25rem, 2.5vw, 1.75rem);
      }

      .app-payment-cta-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: clamp(0.75rem, 1.6vw, 1rem);
        width: 100%;
      }

      @media (max-width: 720px) {
        .app-payment-cta-row {
          grid-template-columns: 1fr;
        }
      }

      .app-payment-cta {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.2rem;
        width: 100%;
        min-height: 3.6rem;
        margin: 0;
        padding: clamp(0.95rem, 1.8vw, 1.15rem) clamp(0.85rem, 1.6vw, 1.25rem);
        box-sizing: border-box;
        border: 1.5px solid var(--c2);
        border-radius: 6px;
        background: var(--c3);
        color: var(--c2);
        text-align: center;
        cursor: pointer;
        font-family: inherit;
        transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
      }

      .app-payment-cta:hover:not([disabled]) {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
      }

      .app-payment-cta[disabled] {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .app-payment-cta--primary {
        background: var(--c2);
        color: var(--c3);
        border-color: var(--c2);
        font-size: clamp(0.78rem, 0.95vw, 0.9rem);
        font-variation-settings: var(--fv-label-strong);
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .app-payment-cta--primary:hover:not([disabled]) {
        background: color-mix(in srgb, var(--c2) 88%, #000);
        border-color: color-mix(in srgb, var(--c2) 88%, #000);
      }

      .app-payment-cta--primary.is-selected {
        border-color: var(--c4);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--c4, #c45) 55%, transparent);
      }

      .app-payment-cta--secondary {
        background: var(--c3);
        color: var(--c2);
        border-color: var(--c2);
        font-size: clamp(0.78rem, 0.95vw, 0.9rem);
        font-variation-settings: var(--fv-label-strong);
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .app-payment-cta--secondary:hover:not([disabled]) {
        background: color-mix(in srgb, var(--c2) 4%, var(--c3));
      }

      .app-payment-cta--secondary[aria-expanded='true'] {
        background: color-mix(in srgb, var(--c2) 6%, var(--c3));
        border-color: var(--c4);
      }

      .app-payment-cta-title {
        display: block;
        line-height: 1.25;
      }

      .app-payment-cta-sub {
        display: none;
      }

      .app-membership-plans-panel {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: clamp(0.85rem, 1.8vw, 1.25rem);
        align-items: stretch;
        width: 100%;
        padding-top: 0.85rem;
      }

      .app-membership-plans-panel[hidden] {
        display: none !important;
      }

      @media (max-width: 720px) {
        .app-membership-plans-panel {
          grid-template-columns: 1fr;
        }
      }

      .app-payment-plan-wrap {
        position: relative;
        min-height: 100%;
      }

      .app-payment-plan-suggested-badge {
        position: absolute;
        top: -0.55rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        background: var(--c4, #8b2942);
        color: var(--c3, #fff);
        font-size: clamp(0.58rem, 0.7vw, 0.66rem);
        font-variation-settings: var(--fv-label-strong);
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .app-payment-membership-card {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        width: 100%;
        min-height: 100%;
        margin: 0;
        padding: clamp(1.35rem, 2.2vw, 1.75rem) clamp(0.85rem, 1.4vw, 1.15rem) clamp(1.1rem, 1.8vw, 1.4rem);
        box-sizing: border-box;
        border: 1px solid rgba(0, 0, 0, 0.16);
        border-radius: 8px;
        background: var(--c3);
        color: var(--c2);
        text-align: center;
        cursor: pointer;
        font-family: inherit;
        transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
      }

      .app-payment-plan-wrap--suggested .app-payment-membership-card {
        border-color: var(--c4);
      }

      .app-payment-membership-card:hover {
        border-color: var(--c4);
        transform: translateY(-2px);
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
      }

      .app-payment-membership-card.is-selected {
        border: 2px solid var(--c4);
        background: color-mix(in srgb, var(--c4) 12%, var(--c3));
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--c4) 40%, transparent);
      }

      .app-payment-membership-card.is-selected .app-payment-plan-radio {
        border-color: var(--c4);
        box-shadow: inset 0 0 0 3px var(--c3);
        background: var(--c4);
      }

      .draw-applied-panel .app-step-heading {
        margin-bottom: 0.5rem;
      }

      .draw-applied-panel .app-step-lead {
        margin: 0 0 0.75rem;
      }

      .draw-credit-callout {
        margin: 0 0 1.15rem;
        padding: 1rem 1.1rem;
        border: 1px solid color-mix(in srgb, #3f7e5a 35%, transparent);
        border-radius: 8px;
        background: color-mix(in srgb, #3f7e5a 10%, #fff);
      }

      .draw-credit-callout__eyebrow {
        margin: 0 0 0.35rem;
        font-size: 0.72rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #3f7e5a;
        font-weight: 650;
      }

      .draw-credit-callout__title {
        margin: 0 0 0.4rem;
        font-size: 1.15rem;
        line-height: 1.3;
        font-weight: 700;
        color: var(--c2, #0f172a);
      }

      .draw-credit-callout__body,
      .draw-credit-callout__meta {
        margin: 0;
        font-size: 0.92rem;
        line-height: 1.45;
        color: color-mix(in srgb, var(--c2, #0f172a) 78%, transparent);
      }

      .draw-credit-callout__meta {
        margin-top: 0.45rem;
        font-size: 0.82rem;
      }

      .draw-member-pay-hint {
        margin: 0 0 0.85rem;
        font-size: 0.92rem;
        line-height: 1.45;
        color: color-mix(in srgb, var(--c2, #0f172a) 72%, transparent);
      }

      #draw-retry-enter-row {
        margin: 0.75rem 0 0;
      }

      .app-payment-plan-radio {
        position: absolute;
        top: 0.75rem;
        left: 0.75rem;
        width: 0.95rem;
        height: 0.95rem;
        border-radius: 50%;
        border: 1.5px solid rgba(0, 0, 0, 0.28);
        box-sizing: border-box;
      }

      .app-payment-plan-icon-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 3rem;
        height: 3rem;
        margin: 0.35rem auto 0.55rem;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.06);
      }

      .app-payment-membership-card-body {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.35rem;
        width: 100%;
      }

      .app-payment-membership-head {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.2rem;
        width: 100%;
      }

      .app-payment-membership-title {
        font-size: clamp(0.86rem, 1.02vw, 0.98rem);
        font-variation-settings: var(--fv-body-wide);
        font-weight: 600;
        line-height: 1.35;
        max-width: 12.5rem;
        min-height: 2.6em;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .app-payment-membership-price {
        font-size: clamp(1.15rem, 1.5vw, 1.4rem);
        font-variation-settings: var(--fv-emphasis);
        line-height: 1.2;
      }

      .app-payment-membership-every {
        font-size: clamp(0.74rem, 0.9vw, 0.84rem);
        font-variation-settings: var(--fv-caption);
        opacity: 0.9;
        line-height: 1.35;
      }

      .app-payment-plan-bullets {
        list-style: none;
        margin: 0.65rem 0 0;
        padding: 0;
        width: 100%;
        text-align: left;
      }

      .app-payment-plan-bullets li {
        display: flex;
        align-items: flex-start;
        gap: 0.4rem;
        margin: 0 0 0.35rem;
        font-size: clamp(0.72rem, 0.88vw, 0.82rem);
        font-variation-settings: var(--fv-caption);
        line-height: 1.35;
      }

      .app-fee-footer {
        display: flex;
        justify-content: center;
        margin-top: clamp(1.25rem, 2.5vw, 1.65rem);
        padding-top: 1rem;
        border-top: 1px solid rgba(0, 0, 0, 0.1);
      }

      .app-fee-footer-right {
        text-align: center;
        font-size: clamp(0.72rem, 0.88vw, 0.82rem);
        font-variation-settings: var(--fv-caption);
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--c2);
      }

      .app-fee-footer-right a {
        color: inherit;
        text-decoration: underline;
        text-underline-offset: 0.14em;
        margin-left: 0.35rem;
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

      .app-field input.app-field--invalid,
      .app-field textarea.app-field--invalid {
        border-color: #8b2942;
        box-shadow: 0 0 0 2px rgba(139, 41, 66, 0.18);
        background: rgba(139, 41, 66, 0.04);
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

      .app-form-status {
        max-width: 820px;
        margin: 1rem auto 0;
        font-size: clamp(0.85rem, 1vw, 0.95rem);
        font-variation-settings: var(--fv-body-wide);
        color: var(--c2);
        min-height: 1.25em;
        text-align: center;
      }

      .app-form-status.is-error {
        color: #8b2942;
      }

      .app-form-status.is-success {
        opacity: 0.9;
      }

      .app-payment-placeholder {
        margin: 0.75rem 0 1rem;
        padding: clamp(1.5rem, 3vw, 2.1rem) 1.1rem;
        border: 1px dashed rgba(0, 0, 0, 0.28);
        border-radius: 6px;
        text-align: center;
        color: var(--c2);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.4rem;
      }

      .app-payment-placeholder[hidden] {
        display: none !important;
      }

      .app-payment-placeholder-head {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.55rem;
      }

      .app-payment-placeholder-title {
        margin: 0;
        font-size: clamp(0.86rem, 1.05vw, 0.98rem);
        font-variation-settings: var(--fv-body-wide);
        font-weight: 600;
        color: var(--c2);
        line-height: 1.4;
      }

      .app-payment-placeholder-sub {
        margin: 0;
        font-size: clamp(0.78rem, 0.95vw, 0.88rem);
        font-variation-settings: var(--fv-caption);
        color: var(--c2);
        line-height: 1.45;
        opacity: 0.72;
        max-width: 28rem;
      }

      .app-payment-slot-wrap {
        margin: 0.25rem 0 0.75rem;
        min-height: 100px;
        width: 100%;
      }

      .app-payment-slot-wrap[hidden] {
        display: none !important;
      }

      ::slotted(.app-draw-pay-mount) {
        display: block;
        width: 100%;
        min-height: 100px;
      }

      ::slotted(.app-draw-pay-mount) .paypal-advanced-checkout {
        width: 100%;
      }

      @keyframes app-validation-fade {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .app-account-gate-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483000;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding: clamp(1rem, 4vw, 2.5rem);
        background: rgba(15, 23, 42, 0.28);
        animation: app-validation-fade 0.18s ease;
      }

      .app-account-gate-card {
        width: min(22.5rem, 100%);
        box-sizing: border-box;
        padding: 1.35rem 1.35rem 1.2rem;
        border: 1px solid rgba(250, 243, 244, 0.22);
        background: var(--c2, #0f172a);
        color: var(--c3, #faf3f4);
        box-shadow: 0 22px 60px rgba(15, 23, 42, 0.35);
        font-family: inherit;
      }

      .app-account-gate-eyebrow {
        margin: 0 0 0.55rem;
        font-size: 0.68rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-variation-settings: var(--fv-label);
        opacity: 0.72;
      }

      .app-account-gate-title {
        margin: 0 0 0.55rem;
        font-size: clamp(1.05rem, 1.5vw, 1.22rem);
        line-height: 1.25;
        font-variation-settings: var(--fv-title);
      }

      .app-account-gate-body,
      .app-account-gate-solution {
        margin: 0 0 0.65rem;
        font-size: clamp(0.84rem, 1vw, 0.92rem);
        line-height: 1.45;
        font-variation-settings: var(--fv-body);
        opacity: 0.92;
      }

      .app-account-gate-solution {
        opacity: 0.78;
      }

      .app-account-gate-contact {
        margin: 0 0 1.15rem;
        font-size: 0.8rem;
        line-height: 1.4;
        font-variation-settings: var(--fv-label);
      }

      .app-account-gate-mail {
        color: var(--c3, #faf3f4);
        text-decoration: underline;
        text-underline-offset: 0.14em;
      }

      .app-account-gate-mail:hover {
        opacity: 0.88;
      }

      .app-account-gate-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem;
        justify-content: flex-end;
      }

      .app-account-gate-card .app-btn--primary {
        background: var(--c3, #faf3f4);
        color: var(--c2, #0f172a);
        border-color: var(--c3, #faf3f4);
      }

      .app-account-gate-card .app-btn--primary:hover {
        background: transparent;
        color: var(--c3, #faf3f4);
      }

      .app-account-gate-card .app-btn--ghost {
        color: var(--c3, #faf3f4);
        border-color: rgba(250, 243, 244, 0.45);
      }

      .app-account-gate-card .app-btn--ghost:hover {
        background: rgba(250, 243, 244, 0.08);
      }

      @media (max-width: 720px) {
        .app-account-gate-overlay {
          justify-content: center;
          align-items: flex-end;
          padding: 0.85rem;
        }
      }
    `;
    }
}

customElements.define('app-program-draw-form', ProgramDrawFormComponent);
