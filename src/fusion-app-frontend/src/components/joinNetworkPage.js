/**
 * Public `/join-network` — membership conversion landing (uses site header + footer).
 */
import '../styles/joinNetworkPage.css';
import '../components/subComponents/joinNetwork.js';
import '../components/subComponents/audioRow.js';
import { getArtists, getContentBundleForStudio } from '../utils/database.js';
import {
    artistHasFullSitePlayableAudio,
    getFullSiteAudioEntries,
} from '../utils/artistCardImageMode.js';
import { applyDocumentSeo } from '../utils/documentSeo.js';
import { startJoinCollageRotation } from '../utils/joinCollageRotate.js';
import { trialAccessCodeFromSearch } from '../utils/trialAccessCode.js';

const ROLE_KEYS = ['Artist', 'Gallery', 'Curator', 'Collector'];

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Allow a small HTML subset for payment footer (strong/em only). */
function sanitizePayFoot(html) {
    const raw = String(html ?? '');
    if (!raw) return '';
    return raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/&lt;(\/?(?:strong|em|b|i))&gt;/gi, '<$1>');
}

/** Allow path-only links (+ strong/em) for story proof copy. */
function sanitizeStoryLinks(html) {
    const raw = String(html ?? '');
    if (!raw) return '';
    return raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/&lt;(\/?(?:strong|em|b|i))&gt;/gi, '<$1>')
        .replace(/&lt;a href="(\/[a-zA-Z0-9\-/_]*)"&gt;/g, '<a href="$1">')
        .replace(/&lt;\/a&gt;/gi, '</a>');
}

function readLocale() {
    try {
        if (typeof window.getLocale === 'function' && window.getLocale() === 'ja') return 'ja';
    } catch {
        /* ignore */
    }
    return 'en';
}

/**
 * @param {unknown} bundle
 * @param {'en'|'ja'} loc
 */
function pickLocale(bundle, loc) {
    const obj = bundle && typeof bundle === 'object' ? /** @type {any} */ (bundle) : {};
    const primary = obj[loc] && typeof obj[loc] === 'object' ? obj[loc] : null;
    const en = obj.en && typeof obj.en === 'object' ? obj.en : {};
    return { ...en, ...(primary || {}) };
}

function proofIcon(kind) {
    const k = String(kind || '').toLowerCase();
    if (k === 'people') {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="9" cy="8" r="2.4"/><circle cx="16" cy="9" r="2"/><path d="M4.5 18c.6-2.4 2.4-3.6 4.5-3.6s3.9 1.2 4.5 3.6"/><path d="M13.2 18c.35-1.55 1.4-2.45 2.8-2.45 1.2 0 2.15.7 2.55 1.9"/></svg>`;
    }
    if (k === 'doc') {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 3.5h6.2L18.5 8v12.5H8z"/><path d="M14.2 3.5V8H18.5"/><path d="M10.5 12h5M10.5 15.5h5"/></svg>`;
    }
    /* japan / torii default */
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 8.5h16M5.5 8.5V18M18.5 8.5V18M4 5.5h16M8.5 5.5v3M15.5 5.5v3"/></svg>`;
}

/**
 * Benefits for a plan; falls back to legacy shared `includes` when plan bullets are empty.
 * @param {Record<string, any>} copy
 * @param {'monthly'|'quarterly'|'annual'} plan
 * @returns {string[]}
 */
function benefitsForPlan(copy, plan) {
    const key =
        plan === 'quarterly' ? 'planQuarterly' : plan === 'annual' ? 'planAnnual' : 'planMonthly';
    const planObj = copy[key] && typeof copy[key] === 'object' ? copy[key] : {};
    const fromPlan = Array.isArray(planObj.includedBullets)
        ? planObj.includedBullets.map((x) => String(x ?? '').trim()).filter(Boolean)
        : [];
    if (fromPlan.length) return fromPlan;
    return (Array.isArray(copy.includes) ? copy.includes : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
}

/**
 * @param {string[]} lines
 * @returns {string}
 */
function includesListHtml(lines) {
    return lines.map((line) => `<li>${esc(line)}</li>`).join('');
}

/**
 * @param {HTMLElement} root
 * @param {Record<string, any>} copy
 * @param {'monthly'|'quarterly'|'annual'} plan
 */
function syncIncludesList(root, copy, plan) {
    const ul = root.querySelector('#jnpIncludes');
    if (!(ul instanceof HTMLElement)) return;
    ul.innerHTML = includesListHtml(benefitsForPlan(copy, plan));
}

/**
 * @param {Record<string, any>} copy
 * @param {'en'|'ja'} loc
 */
function pageHtml(copy, loc) {
    const roles = Array.isArray(copy.roles) && copy.roles.length ? copy.roles : ROLE_KEYS;
    const collageSlots = Array.isArray(copy.collage) ? copy.collage : [];
    const collage = [0, 1, 2]
        .map((i) => {
            const c = collageSlots[i] || {};
            return `<img data-jnp-collage="${i}" src="${esc(c.src || '')}" alt="${esc(c.alt || '')}" loading="lazy" decoding="async" />`;
        })
        .join('');
    const includes = includesListHtml(benefitsForPlan(copy, 'monthly'));
    const proof = (Array.isArray(copy.proof) ? copy.proof : [])
        .map((p, i) => {
            const icons = ['japan', 'people', 'doc'];
            const icon = p.icon || icons[i] || 'japan';
            const line = p.line ? `<span>${esc(p.line)}</span>` : '<span></span>';
            return `
            <div class="join-network-page__proof-item">
                <span class="join-network-page__proof-icon">${proofIcon(icon)}</span>
                <div>
                  <strong>${esc(p.title)}</strong>
                  ${line}
                </div>
            </div>`;
        })
        .join('');
    const mo = copy.planMonthly || {};
    const qu = copy.planQuarterly || {};
    const an = copy.planAnnual || {};
    const payFoot =
        copy.paymentFooterHtml
            ? sanitizePayFoot(copy.paymentFooterHtml)
            : esc(copy.paymentFooter || 'Secure payment by PayPal or card · Cancel anytime');
    const programsProof = sanitizeStoryLinks(
        copy.storyProgramsHtml ||
            'Explore <a href="/programs">Japan artist residency programs</a> and the <a href="/program/kaga-ishikawa">Kaga, Ishikawa residency</a> — proof of programs rooted in Japan.',
    );

    const moBadge = mo.badge
        ? `<span class="join-network-page__plan-badge">${esc(mo.badge)}</span>`
        : '';
    const anBadge = an.badge
        ? `<span class="join-network-page__plan-badge join-network-page__plan-badge--save">${esc(an.badge)}</span>`
        : '';

    return `
    <div class="join-network-page page-content" id="joinNetworkPageRoot" data-locale="${esc(loc)}">
      <div class="join-network-page__main">
        <section class="join-network-page__story" aria-label="Why join">
          <h1 class="join-network-page__story-headline">${esc(copy.storyHeadline)}</h1>
          <p class="join-network-page__story-sub">${esc(copy.storySubheadline)}</p>
          <p class="join-network-page__story-sec">${esc(copy.storySecondary)}</p>
          <p class="join-network-page__story-programs">${programsProof}</p>
          <div class="join-network-page__media">
            <div class="join-network-page__collage">${collage}</div>
            <div class="join-network-page__audio" id="jnpAudioMount" hidden></div>
          </div>
        </section>
        <section class="join-network-page__form-card" aria-label="Join FUSION">
          <h2 class="join-network-page__form-title">${esc(copy.formTitle)}</h2>
          <p class="join-network-page__form-sub">${esc(copy.formSubtitle)}</p>
          <span class="join-network-page__label">${esc(copy.roleLabel || 'I am a')}</span>
          <div class="join-network-page__roles" id="jnpRoles" role="group">
            ${roles
                .map(
                    (label, i) => `
              <button type="button" class="join-network-page__role${i === 0 ? ' is-active' : ''}" data-jnp-role="${esc(ROLE_KEYS[i] || label)}" aria-pressed="${i === 0 ? 'true' : 'false'}">${esc(label)}</button>`,
                )
                .join('')}
          </div>
          <div class="join-network-page__fields">
            <input type="text" id="jnpFirstName" name="firstName" autocomplete="given-name" placeholder="${esc(copy.firstNamePlaceholder || 'First name')}" />
            <input type="text" id="jnpLastName" name="lastName" autocomplete="family-name" placeholder="${esc(copy.lastNamePlaceholder || 'Last name')}" />
            <input class="join-network-page__field--full" type="email" id="jnpEmail" name="email" autocomplete="email" placeholder="${esc(copy.emailPlaceholder || 'Email')}" />
            <div class="join-network-page__field--full join-network-page__access">
              <button type="button" class="join-network-page__access-toggle" id="jnpAccessToggle" aria-expanded="false" aria-controls="jnpAccessPanel">
                ${esc(copy.accessCodePrompt || 'Have an access code?')}
              </button>
              <div class="join-network-page__access-panel" id="jnpAccessPanel" hidden>
                <label class="join-network-page__label" for="jnpAccessCode">${esc(copy.accessCodeLabel || 'Access code (optional)')}</label>
                <input type="text" id="jnpAccessCode" name="accessCode" inputmode="numeric" maxlength="8" placeholder="${esc(copy.accessCodePlaceholder || '8-digit code')}" autocomplete="one-time-code" />
              </div>
            </div>
          </div>
          <span class="join-network-page__label">${esc(copy.planGroupLabel || 'Choose your membership')}</span>
          <div class="join-network-page__plans" id="jnpPlans" role="radiogroup" aria-label="${esc(copy.planGroupLabel || 'Choose your membership')}">
            <button type="button" class="join-network-page__plan is-active" data-jnp-plan="monthly" role="radio" aria-checked="true" aria-pressed="true">
              <span class="join-network-page__plan-radio" aria-hidden="true"></span>
              <span class="join-network-page__plan-body">
                ${moBadge}
                <p class="join-network-page__plan-title">${esc(mo.title || 'Monthly')}</p>
                <p class="join-network-page__plan-price">${esc(mo.displayPrice || '$30')} ${esc(mo.every || 'per month')}</p>
                <p class="join-network-page__plan-sub">${esc(mo.subtext || '')}</p>
              </span>
            </button>
            <button type="button" class="join-network-page__plan" data-jnp-plan="quarterly" role="radio" aria-checked="false" aria-pressed="false">
              <span class="join-network-page__plan-radio" aria-hidden="true"></span>
              <span class="join-network-page__plan-body">
                <p class="join-network-page__plan-title">${esc(qu.title || 'Quarterly')}</p>
                <p class="join-network-page__plan-price">${esc(qu.displayPrice || '$75')} ${esc(qu.every || 'per quarter')}</p>
                <p class="join-network-page__plan-sub">${esc(qu.subtext || '')}</p>
              </span>
            </button>
            <button type="button" class="join-network-page__plan" data-jnp-plan="annual" role="radio" aria-checked="false" aria-pressed="false">
              <span class="join-network-page__plan-radio" aria-hidden="true"></span>
              <span class="join-network-page__plan-body">
                <p class="join-network-page__plan-title">${esc(an.title || 'Annual')}</p>
                <p class="join-network-page__plan-price">${esc(an.displayPrice || '$260')} ${esc(an.every || 'per year')}</p>
                ${anBadge}
                <p class="join-network-page__plan-sub">${esc(an.subtext || '')}</p>
              </span>
            </button>
          </div>
          <ul class="join-network-page__includes" id="jnpIncludes" aria-label="${esc(copy.includesTitle || 'Includes')}">${includes}</ul>
          <button type="button" class="join-network-page__cta" id="jnpCheckout">${esc(copy.ctaLabel || 'Continue to secure checkout')}</button>
          <p class="join-network-page__pay-foot">${payFoot}</p>
          <p class="join-network-page__err" id="jnpErr" role="alert"></p>
        </section>
      </div>
      <section class="join-network-page__proof" aria-label="Membership highlights">${proof}</section>
      <div class="join-network-page__bridge" aria-hidden="true">
        <app-join-network data-modal-type="membership" data-header-bridge="true" context="join-network" active="true"></app-join-network>
      </div>
    </div>
  `;
}

function suppressSoundEnvironment() {
    document.documentElement.setAttribute('data-fusion-page', 'join-network');
    document.querySelectorAll('app-sound-environment').forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        el.setAttribute('hidden', '');
        if (typeof /** @type {any} */ (el).setMasterEnabled === 'function') {
            /** @type {any} */ (el).setMasterEnabled(false);
        }
    });
    const host = document.getElementById('fusionSoundEnvHost');
    if (host instanceof HTMLElement) {
        host.setAttribute('hidden', '');
        host.style.display = 'none';
    }
}

/**
 * Mount a journal-style random artist audio bite under the collage.
 * @param {HTMLElement} root
 * @param {unknown[]} [artistsPrefetch]
 */
async function mountRandomArtistAudio(root, artistsPrefetch) {
    const mount = root.querySelector('#jnpAudioMount');
    if (!(mount instanceof HTMLElement)) return;
    try {
        const artists = artistsPrefetch || (await getArtists());
        const pool = (Array.isArray(artists) ? artists : []).filter((a) => artistHasFullSitePlayableAudio(a));
        if (!pool.length) {
            mount.hidden = true;
            mount.innerHTML = '';
            return;
        }
        const artist = pool[Math.floor(Math.random() * pool.length)];
        const entries = getFullSiteAudioEntries(artist);
        const artistSlug = String(/** @type {any} */ (artist)?.slug ?? '').trim();
        const row = document.createElement('app-audio-row');
        row.setAttribute('active', 'true');
        row.setAttribute('data-layout', 'join-network');
        if (artistSlug) {
            row.setAttribute('data-artist-href', `/profile/${artistSlug}`);
        }
        if (entries.length > 1) {
            row.setAttribute('data-audio-sources', JSON.stringify(entries));
        } else if (entries.length === 1) {
            row.setAttribute('data-audio-src', entries[0].url);
            row.setAttribute('data-audio-title', entries[0].title || 'Artist audio');
        } else {
            const src = String(/** @type {any} */ (artist).audioUrl ?? '').trim();
            if (!src) {
                mount.hidden = true;
                return;
            }
            const title =
                String(/** @type {any} */ (artist).audioTitle ?? '').trim() ||
                String(/** @type {any} */ (artist)?.locales?.en?.name ?? '').trim() ||
                'Artist audio';
            row.setAttribute('data-audio-src', src);
            row.setAttribute('data-audio-title', title);
        }
        mount.hidden = false;
        mount.replaceChildren(row);
    } catch {
        mount.hidden = true;
        mount.innerHTML = '';
    }
}

export function generateJoinNetworkPageContent() {
    return pageHtml({}, 'en');
}

export default async function initJoinNetworkPage() {
    suppressSoundEnvironment();

    const loc = readLocale();
    let bundle = {};
    try {
        bundle = await getContentBundleForStudio('join-network-page', { forStudio: false });
    } catch {
        try {
            const { testData } = await import('../testData.js');
            bundle = testData.joinNetworkPage || {};
        } catch {
            bundle = {};
        }
    }
    // Live mode with empty canister: fall back to bundled defaults for the conversion page.
    const rawEn = bundle && typeof bundle === 'object' ? /** @type {any} */ (bundle).en : null;
    const hasStory =
        rawEn &&
        typeof rawEn === 'object' &&
        !Array.isArray(rawEn) &&
        String(rawEn.storyHeadline || '').trim();
    if (!hasStory) {
        try {
            const { testData } = await import('../testData.js');
            if (testData.joinNetworkPage) bundle = testData.joinNetworkPage;
        } catch {
            /* keep */
        }
    }
    const copy = pickLocale(bundle, loc);

    applyDocumentSeo({
        title: copy.seoTitle || 'Curated Art Network | Join FUSION',
        description:
            copy.seoDescription ||
            'Join a curated art network connecting artists, galleries, curators, and collectors through programs rooted in Japan.',
        path: '/join-network',
        robots: '',
        homeOrganizationJsonLd: false,
    });

    const rootParent = document.getElementById('mainContent');
    if (rootParent) {
        rootParent.innerHTML = pageHtml(copy, loc);
    }

    const root = document.getElementById('joinNetworkPageRoot');
    if (!root) return;

    suppressSoundEnvironment();
    requestAnimationFrame(suppressSoundEnvironment);

    void (async () => {
        let artists = [];
        try {
            artists = await getArtists();
        } catch {
            artists = [];
        }
        startJoinCollageRotation(root, {
            attrName: 'data-jnp-collage',
            artistsPrefetch: artists,
            intervalMs: 10000,
        });
        await mountRandomArtistAudio(root, artists);
    })();

    /** @type {string} */
    let role = ROLE_KEYS[0];
    /** @type {'monthly'|'quarterly'|'annual'} */
    let plan = 'monthly';

    root.querySelector('#jnpRoles')?.addEventListener('click', (e) => {
        const btn = /** @type {HTMLElement} */ (e.target)?.closest?.('[data-jnp-role]');
        if (!(btn instanceof HTMLButtonElement)) return;
        role = btn.getAttribute('data-jnp-role') || ROLE_KEYS[0];
        root.querySelectorAll('[data-jnp-role]').forEach((el) => {
            const on = el === btn;
            el.classList.toggle('is-active', on);
            el.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    });

    root.querySelector('#jnpPlans')?.addEventListener('click', (e) => {
        const btn = /** @type {HTMLElement} */ (e.target)?.closest?.('[data-jnp-plan]');
        if (!(btn instanceof HTMLButtonElement)) return;
        const p = btn.getAttribute('data-jnp-plan');
        if (p !== 'monthly' && p !== 'quarterly' && p !== 'annual') return;
        plan = p;
        root.querySelectorAll('[data-jnp-plan]').forEach((el) => {
            const on = el === btn;
            el.classList.toggle('is-active', on);
            el.setAttribute('aria-pressed', on ? 'true' : 'false');
            el.setAttribute('aria-checked', on ? 'true' : 'false');
        });
        syncIncludesList(root, copy, plan);
    });

    const accessToggle = /** @type {HTMLButtonElement | null} */ (root.querySelector('#jnpAccessToggle'));
    const accessPanel = /** @type {HTMLElement | null} */ (root.querySelector('#jnpAccessPanel'));
    const accessInput = /** @type {HTMLInputElement | null} */ (root.querySelector('#jnpAccessCode'));
    const prefilledCode = trialAccessCodeFromSearch();
    if (prefilledCode && accessInput && accessPanel && accessToggle) {
        accessInput.value = prefilledCode;
        accessPanel.removeAttribute('hidden');
        accessToggle.setAttribute('aria-expanded', 'true');
        accessToggle.classList.add('is-open');
    }
    accessToggle?.addEventListener('click', () => {
        if (!accessPanel || !accessToggle) return;
        const open = accessPanel.hasAttribute('hidden');
        if (open) {
            accessPanel.removeAttribute('hidden');
            accessToggle.setAttribute('aria-expanded', 'true');
            accessToggle.classList.add('is-open');
            accessInput?.focus();
        } else {
            accessPanel.setAttribute('hidden', '');
            accessToggle.setAttribute('aria-expanded', 'false');
            accessToggle.classList.remove('is-open');
            if (accessInput) accessInput.value = '';
        }
    });

    const errEl = root.querySelector('#jnpErr');
    const cta = /** @type {HTMLButtonElement | null} */ (root.querySelector('#jnpCheckout'));
    cta?.addEventListener('click', () => {
        if (errEl) errEl.textContent = '';
        const firstName = String(/** @type {HTMLInputElement | null} */ (root.querySelector('#jnpFirstName'))?.value || '').trim();
        const lastName = String(/** @type {HTMLInputElement | null} */ (root.querySelector('#jnpLastName'))?.value || '').trim();
        const email = String(/** @type {HTMLInputElement | null} */ (root.querySelector('#jnpEmail'))?.value || '').trim();
        const accessCode = String(/** @type {HTMLInputElement | null} */ (root.querySelector('#jnpAccessCode'))?.value || '')
            .replace(/\D/g, '')
            .slice(0, 8);
        if (!role) {
            if (errEl) errEl.textContent = loc === 'ja' ? '役割を選択してください。' : 'Please select a role.';
            return;
        }
        if (!firstName || !lastName) {
            if (errEl) errEl.textContent = loc === 'ja' ? '姓名を入力してください。' : 'Please enter your first and last name.';
            return;
        }
        if (!email || !email.includes('@')) {
            if (errEl) errEl.textContent = loc === 'ja' ? '有効なメールを入力してください。' : 'Please enter a valid email.';
            return;
        }

        const hasCode = accessCode.length === 8;
        window.dispatchEvent(
            new CustomEvent('fusion-open-join-network', {
                detail: {
                    firstName,
                    lastName,
                    email,
                    accessCode: hasCode ? accessCode : '',
                    category: role,
                    subscriptionTier: plan,
                    stage: hasCode ? 'linkAccount' : 'payment',
                    fromJoinNetworkPage: true,
                },
            }),
        );
    });
}
