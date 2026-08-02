/**
 * In-Studio Join Fusion unlock panel (applicant / locked-nav destination).
 */

import collage1 from '../assets/dev/program_hero-1.jpg';
import collage2 from '../assets/dev/fa-1.jpg';
import collage3 from '../assets/dev/fa-2.jpg';
import {
    joinNetworkPlansFromBundle,
    joinPlanCardToPaymentOption,
} from './resolveApplicationPaymentOptions.js';
import { startJoinCollageRotation } from './joinCollageRotate.js';

/**
 * @param {string} s
 */
function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {unknown} bundle
 * @param {'en'|'ja'} loc
 */
function pickJoinPageLocale(bundle, loc) {
    const obj = bundle && typeof bundle === 'object' ? /** @type {Record<string, unknown>} */ (bundle) : {};
    const nested =
        obj.value && typeof obj.value === 'object'
            ? /** @type {Record<string, unknown>} */ (obj.value)
            : obj;
    const en = nested.en && typeof nested.en === 'object' ? /** @type {Record<string, unknown>} */ (nested.en) : {};
    const primary =
        nested[loc] && typeof nested[loc] === 'object'
            ? /** @type {Record<string, unknown>} */ (nested[loc])
            : {};
    return { ...en, ...primary };
}

/**
 * @param {unknown} planCard
 * @returns {string[]}
 */
function bulletsFromPlanCard(planCard) {
    const o =
        planCard && typeof planCard === 'object' && !Array.isArray(planCard)
            ? /** @type {Record<string, unknown>} */ (planCard)
            : {};
    const raw = o.includedBullets ?? o.includes;
    return Array.isArray(raw) ? raw.map((x) => String(x ?? '').trim()).filter(Boolean) : [];
}

/**
 * @param {'en'|'ja'} loc
 */
function defaultPlans(loc) {
    if (loc === 'ja') {
        return {
            monthly: {
                title: '月額メンバーシップ',
                displayPrice: '$30',
                every: '月額',
                subtext: '',
                badge: 'フレキシブル',
                includedBullets: [
                    'フルのアーティストプロフィール',
                    'FUSION限定コンテンツ',
                    'メンバー料金での応募',
                    'いつでも解約可能',
                ],
            },
            quarterly: {
                title: '四半期メンバーシップ',
                displayPrice: '$75',
                every: '3か月ごと',
                subtext: '月あたり約 $25 · 17%お得',
                badge: 'おすすめ',
                includedBullets: [
                    'フルのアーティストプロフィール',
                    'FUSION限定コンテンツ',
                    '四半期ごとに1回のレジデンシー応募クレジット',
                    '四半期ごとに1回のプログラム抽選',
                    '追加応募は $35',
                ],
            },
            annual: {
                title: '年間メンバーシップ',
                displayPrice: '$260',
                every: '年額',
                subtext: '月あたり約 $21.67 · 28%お得',
                badge: 'お得',
                includedBullets: [
                    'フルのアーティストプロフィール',
                    'FUSION限定コンテンツ',
                    'レジデンシー応募無制限',
                    '年間4回のプログラム抽選',
                    'マーケティング機会の拡大',
                ],
            },
        };
    }
    return {
        monthly: {
            title: 'Monthly Membership',
            displayPrice: '$30',
            every: 'per month',
            subtext: '',
            badge: 'Flexible',
            includedBullets: [
                'Full artist profile',
                'Exclusive FUSION content',
                'Applications available at member rate',
                'Cancel anytime',
            ],
        },
        quarterly: {
            title: 'Quarterly Membership',
            displayPrice: '$75',
            every: 'every 3 months',
            subtext: '$25/month · Save 17%',
            badge: 'Recommended',
            includedBullets: [
                'Full artist profile',
                'Exclusive FUSION content',
                '1 residency application credit per quarter',
                '1 Program Draw entry per quarter',
                'Additional applications $35',
            ],
        },
        annual: {
            title: 'Annual Membership',
            displayPrice: '$260',
            every: 'per year',
            subtext: '$21.67/month · Save 28%',
            badge: 'Best value',
            includedBullets: [
                'Full artist profile',
                'Exclusive FUSION content',
                'Unlimited residency applications',
                '4 Program Draw entries per year',
                'Increased marketing opportunities',
            ],
        },
    };
}

/**
 * @param {ReturnType<typeof joinPlanCardToPaymentOption>} pagePlan
 * @param {ReturnType<typeof joinPlanCardToPaymentOption>} flowPlan
 * @param {unknown} pageCard
 * @param {string[]} sharedIncludes
 * @param {{ title: string, displayPrice: string, every: string, subtext: string, includedBullets: string[] }} fallback
 */
function mergePlan(pagePlan, flowPlan, pageCard, sharedIncludes, fallback) {
    const card =
        pageCard && typeof pageCard === 'object'
            ? /** @type {Record<string, unknown>} */ (pageCard)
            : {};
    const fromCard = bulletsFromPlanCard(pageCard);
    const every =
        String(card.every ?? '').trim() ||
        pagePlan.subtext2 ||
        flowPlan.subtext2 ||
        fallback.every;
    const includedBullets =
        fromCard.length > 0
            ? fromCard
            : pagePlan.includedBullets.length > 0
              ? pagePlan.includedBullets
              : flowPlan.includedBullets.length > 0
                ? flowPlan.includedBullets
                : sharedIncludes.length > 0
                  ? sharedIncludes
                  : [...fallback.includedBullets];
    return {
        title: pagePlan.title || flowPlan.title || fallback.title,
        displayPrice: pagePlan.displayPrice || flowPlan.displayPrice || fallback.displayPrice,
        every,
        subtext: pagePlan.subtext || flowPlan.subtext || fallback.subtext,
        subtext2: pagePlan.subtext2 || flowPlan.subtext2 || '',
        includedBullets,
    };
}

/**
 * @param {unknown} joinPageBundle
 * @param {unknown} joinFlowBundle
 * @param {'en'|'ja'} locale
 */
export function buildApplicantJoinUnlockModel(joinPageBundle, joinFlowBundle, locale = 'en') {
    const loc = locale === 'ja' ? 'ja' : 'en';
    const page = pickJoinPageLocale(joinPageBundle, loc);
    const fromFlow = joinNetworkPlansFromBundle(joinFlowBundle, loc);
    const pageMo = joinPlanCardToPaymentOption(page.planMonthly);
    const pageQu = joinPlanCardToPaymentOption(page.planQuarterly);
    const pageAn = joinPlanCardToPaymentOption(page.planAnnual);
    const sharedIncludes = Array.isArray(page.includes)
        ? page.includes.map((x) => String(x ?? '').trim()).filter(Boolean)
        : [];
    const defaults = defaultPlans(loc);

    const monthly = mergePlan(pageMo, fromFlow.monthly, page.planMonthly, sharedIncludes, defaults.monthly);
    const quarterly = mergePlan(
        pageQu,
        fromFlow.quarterly,
        page.planQuarterly,
        sharedIncludes,
        defaults.quarterly,
    );
    const annual = mergePlan(pageAn, fromFlow.annual, page.planAnnual, sharedIncludes, defaults.annual);

    const moBadge = String(
        page.planMonthly && typeof page.planMonthly === 'object'
            ? /** @type {Record<string, unknown>} */ (page.planMonthly).badge ?? ''
            : '',
    ).trim();
    const quBadge = String(
        page.planQuarterly && typeof page.planQuarterly === 'object'
            ? /** @type {Record<string, unknown>} */ (page.planQuarterly).badge ?? ''
            : '',
    ).trim();
    const anBadge = String(
        page.planAnnual && typeof page.planAnnual === 'object'
            ? /** @type {Record<string, unknown>} */ (page.planAnnual).badge ?? ''
            : '',
    ).trim();

    const collageFromCms = Array.isArray(page.collage)
        ? page.collage
              .map((c) => {
                  if (!c || typeof c !== 'object') return null;
                  const src = String(/** @type {Record<string, unknown>} */ (c).src ?? '').trim();
                  if (!src) return null;
                  return {
                      src,
                      alt: String(/** @type {Record<string, unknown>} */ (c).alt ?? '').trim(),
                  };
              })
              .filter(Boolean)
        : [];

    const collageFallback = [
        { src: collage1, alt: loc === 'ja' ? 'プログラム' : 'Programs rooted in Japan' },
        { src: collage2, alt: loc === 'ja' ? 'スタジオ実践' : 'Studio practice' },
        { src: collage3, alt: loc === 'ja' ? 'ネットワーク' : 'Network and place' },
    ];
    const collage = [0, 1, 2].map((i) => collageFromCms[i] || collageFallback[i]);

    const copyDefaults =
        loc === 'ja'
            ? {
                  eyebrow: 'スタジオをアンロック',
                  headline: 'あなたの実践は、より広い文脈に属しています。',
                  support:
                      'FUSIONメンバーになると、フルのアーティストプロフィール、限定コンテンツ、日本をルーツにしたプログラムへの参加が開きます。',
                  notice: 'メンバーシップがなくても、プログラム応募状況は確認できます。',
                  cta: '安全なチェックアウトへ',
                  foot: '安全なお支払い · いつでも解約可能',
              }
            : {
                  eyebrow: 'Unlock your studio',
                  headline: 'Your practice belongs in a wider context.',
                  support:
                      'Become a FUSION member to open your full artist profile, access exclusive content, and participate in programs rooted in Japan.',
                  notice: 'You can continue to access Programs without membership.',
                  cta: 'Continue to secure checkout',
                  foot: 'Secure payment · Cancel anytime',
              };

    return {
        eyebrow: copyDefaults.eyebrow,
        headline: String(page.storyHeadline ?? '').trim() || copyDefaults.headline,
        support: String(page.storySubheadline ?? '').trim() || copyDefaults.support,
        notice: copyDefaults.notice,
        ctaLabel: String(page.ctaLabel ?? '').trim() || copyDefaults.cta,
        foot: copyDefaults.foot,
        collage,
        plans: {
            monthly: {
                ...monthly,
                badge: moBadge || defaults.monthly.badge,
                tier: 'monthly',
            },
            quarterly: {
                ...quarterly,
                badge: quBadge || defaults.quarterly.badge,
                tier: 'quarterly',
                recommended: true,
            },
            annual: {
                ...annual,
                badge: anBadge || defaults.annual.badge,
                tier: 'annual',
            },
        },
    };
}

/**
 * @param {ReturnType<typeof buildApplicantJoinUnlockModel>} model
 * @returns {string}
 */
export function applicantJoinUnlockHtml(model) {
    const collageHtml = (model.collage || [])
        .map(
            (c, i) =>
                `<img class="mpd-join-unlock__thumb" data-mpd-join-collage="${i}" src="${esc(c.src)}" alt="${esc(c.alt)}" loading="lazy" decoding="async" />`,
        )
        .join('');

    /** @param {typeof model.plans.monthly & { recommended?: boolean, tier: string, every?: string, badge?: string }} plan */
    const cardHtml = (plan) => {
        const bullets = (plan.includedBullets || [])
            .slice(0, 6)
            .map((b) => `<li><span class="mpd-join-unlock__check" aria-hidden="true"></span><span>${esc(b)}</span></li>`)
            .join('');
        const every =
            plan.every ||
            (plan.tier === 'monthly'
                ? 'per month'
                : plan.tier === 'quarterly'
                  ? 'every 3 months'
                  : 'per year');
        const selectedClass = plan.recommended ? ' is-recommended is-selected' : '';
        return `
      <button type="button" class="mpd-join-unlock__plan${selectedClass}" data-mpd-join-tier="${esc(plan.tier)}" role="radio" aria-checked="${plan.recommended ? 'true' : 'false'}">
        ${plan.badge ? `<span class="mpd-join-unlock__badge">${esc(plan.badge)}</span>` : ''}
        <span class="mpd-join-unlock__plan-title">${esc(plan.title || plan.tier)}</span>
        <span class="mpd-join-unlock__plan-price">${esc(plan.displayPrice)}</span>
        <span class="mpd-join-unlock__plan-every">${esc(every)}</span>
        ${plan.subtext ? `<span class="mpd-join-unlock__plan-sub">${esc(plan.subtext)}</span>` : ''}
        <span class="mpd-join-unlock__rule" aria-hidden="true"></span>
        <ul class="mpd-join-unlock__bullets">${bullets}</ul>
      </button>`;
    };

    return `
    <div class="mpd-join-unlock" id="mpdJoinUnlockInner">
      <p class="mpd-join-unlock__eyebrow">${esc(model.eyebrow)}</p>
      <div class="mpd-join-unlock__hero">
        <div class="mpd-join-unlock__copy">
          <h2 class="mpd-join-unlock__headline">${esc(model.headline)}</h2>
          <p class="mpd-join-unlock__support">${esc(model.support)}</p>
          <p class="mpd-join-unlock__notice">
            <span class="mpd-join-unlock__notice-icon" aria-hidden="true"></span>
            <span>${esc(model.notice)}</span>
          </p>
        </div>
        <div class="mpd-join-unlock__collage">${collageHtml}</div>
      </div>
      <div class="mpd-join-unlock__plans" id="mpdJoinUnlockPlans" role="radiogroup" aria-label="Membership plans">
        ${cardHtml(model.plans.monthly)}
        ${cardHtml(model.plans.quarterly)}
        ${cardHtml(model.plans.annual)}
      </div>
      <button type="button" class="mpd-join-unlock__cta" id="mpdJoinUnlockCta">${esc(model.ctaLabel)}</button>
      <p class="mpd-join-unlock__foot">${esc(model.foot)}</p>
    </div>`;
}

/**
 * @param {HTMLElement} root
 * @param {{
 *   defaultTier?: 'monthly'|'quarterly'|'annual',
 *   getBillingEmail?: () => string,
 * }} [opts]
 * @returns {() => void} cleanup
 */
export function wireApplicantJoinUnlock(root, opts = {}) {
    let tier =
        opts.defaultTier === 'monthly' || opts.defaultTier === 'annual'
            ? opts.defaultTier
            : 'quarterly';
    const plans = root.querySelector('#mpdJoinUnlockPlans');
    const sync = () => {
        plans?.querySelectorAll('[data-mpd-join-tier]').forEach((el) => {
            const t = el.getAttribute('data-mpd-join-tier');
            const on = t === tier;
            el.classList.toggle('is-selected', on);
            el.setAttribute('aria-checked', on ? 'true' : 'false');
        });
    };
    const onPlanClick = (e) => {
        const btn = /** @type {HTMLElement} */ (e.target)?.closest?.('[data-mpd-join-tier]');
        if (!(btn instanceof HTMLElement)) return;
        const t = btn.getAttribute('data-mpd-join-tier');
        if (t !== 'monthly' && t !== 'quarterly' && t !== 'annual') return;
        tier = t;
        sync();
    };
    const onCta = () => {
        const email =
            typeof opts.getBillingEmail === 'function'
                ? String(opts.getBillingEmail() || '').trim()
                : '';
        window.dispatchEvent(
            new CustomEvent('fusion-open-join-network', {
                detail: {
                    mode: 'resubscribe',
                    subscriptionTier: tier,
                    fromJoinNetworkPage: true,
                    stage: 'payment',
                    ...(email.includes('@') ? { email } : {}),
                },
            }),
        );
    };
    plans?.addEventListener('click', onPlanClick);
    root.querySelector('#mpdJoinUnlockCta')?.addEventListener('click', onCta);
    sync();
    const stopCollage = startJoinCollageRotation(root, {
        attrName: 'data-mpd-join-collage',
        intervalMs: 10000,
    });
    return () => {
        stopCollage();
        plans?.removeEventListener('click', onPlanClick);
        root.querySelector('#mpdJoinUnlockCta')?.removeEventListener('click', onCta);
    };
}
