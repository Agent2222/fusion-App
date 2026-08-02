/**
 * Public `/join-network` — membership conversion landing (uses site header + footer).
 */
import '../styles/joinNetworkPage.css';
import '../components/subComponents/joinNetwork.js';
import '../components/subComponents/audioRow.js';
import {
    filterProgramsBlockToPublicListing,
    getAllProgramsBlock,
    getArtists,
    getContentBundleForStudio,
} from '../utils/database.js';
import {
    artistHasPublicPlayableAudio,
    getApprovedAudioEntries,
    getArtistCardArtworkUrl,
    getArtistCardProfileUrl,
    isArtistHeroProfileImageApproved,
} from '../utils/artistCardImageMode.js';
import { applyDocumentSeo } from '../utils/documentSeo.js';

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
    const includes = (Array.isArray(copy.includes) ? copy.includes : [])
        .filter(Boolean)
        .map((line) => `<li>${esc(line)}</li>`)
        .join('');
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
          <ul class="join-network-page__includes" aria-label="${esc(copy.includesTitle || 'Includes')}">${includes}</ul>
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

/** @param {unknown} url */
function isUsableImageUrl(url) {
    const u = String(url ?? '').trim();
    if (!u) return false;
    if (/^(blob:|data:)/i.test(u)) return false;
    if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u)) return false;
    return true;
}

/**
 * @param {Set<string>} out
 * @param {unknown} url
 */
function pushImageUrl(out, url) {
    if (isUsableImageUrl(url)) out.add(String(url).trim());
}

/**
 * Collect program card + gallery stills (skips video heroes).
 * @param {unknown} program
 * @returns {string[]}
 */
function collectProgramImageUrls(program) {
    const out = new Set();
    if (!program || typeof program !== 'object') return [];
    const p = /** @type {Record<string, any>} */ (program);
    pushImageUrl(out, p.imageSrc);
    pushImageUrl(out, p.heroMediaSrc);
    const page = p.programPage && typeof p.programPage === 'object' ? p.programPage : null;
    if (page) {
        for (const u of Array.isArray(page.fadeGalleryImages) ? page.fadeGalleryImages : []) {
            pushImageUrl(out, u);
        }
        for (const u of Array.isArray(page.stripGalleryImages) ? page.stripGalleryImages : []) {
            pushImageUrl(out, u);
        }
        for (const card of Array.isArray(page.offeringCards) ? page.offeringCards : []) {
            for (const u of Array.isArray(card?.gallery) ? card.gallery : []) {
                pushImageUrl(out, u);
            }
        }
        const facilities = page.programDetails?.facilities;
        if (Array.isArray(facilities)) {
            for (const f of facilities) {
                for (const u of Array.isArray(f?.gallery) ? f.gallery : []) {
                    pushImageUrl(out, u);
                }
            }
        }
    }
    return [...out];
}

/**
 * Prefer approved profile headshot when available; otherwise artwork.
 * @param {unknown} artist
 * @returns {string}
 */
function artistCollageImageUrl(artist) {
    if (isArtistHeroProfileImageApproved(artist)) {
        const profile = getArtistCardProfileUrl(artist, { fallbackToArtwork: false });
        if (isUsableImageUrl(profile)) return profile;
    }
    const artwork = getArtistCardArtworkUrl(artist);
    return isUsableImageUrl(artwork) ? artwork : '';
}

/**
 * @template T
 * @param {T[]} items
 * @param {number} n
 * @returns {T[]}
 */
function pickRandomUnique(items, n) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = copy[i];
        copy[i] = copy[j];
        copy[j] = tmp;
    }
    return copy.slice(0, Math.max(0, Math.min(n, copy.length)));
}

/**
 * Fade out → swap src → fade in once the new image has loaded.
 * @param {HTMLImageElement} img
 * @param {string} url
 * @param {string} [alt]
 * @returns {Promise<void>}
 */
function swapCollageImage(img, url, alt) {
    const next = String(url || '').trim();
    if (!next) return Promise.resolve();

    const current = String(img.currentSrc || img.src || '').trim();
    if (current === next || current.endsWith(next) || next.endsWith(current)) {
        if (alt != null && alt !== '') img.alt = alt;
        return Promise.resolve();
    }

    const waitOpacity = () =>
        new Promise((resolve) => {
            let done = false;
            const finish = () => {
                if (done) return;
                done = true;
                img.removeEventListener('transitionend', onEnd);
                window.clearTimeout(fallback);
                resolve();
            };
            const onEnd = (/** @type {TransitionEvent} */ e) => {
                if (e.target === img && e.propertyName === 'opacity') finish();
            };
            img.addEventListener('transitionend', onEnd);
            const fallback = window.setTimeout(finish, 500);
        });

    const waitLoad = () =>
        new Promise((resolve) => {
            let done = false;
            const finish = () => {
                if (done) return;
                done = true;
                img.removeEventListener('load', finish);
                img.removeEventListener('error', finish);
                resolve();
            };
            img.addEventListener('load', finish);
            img.addEventListener('error', finish);
            img.src = next;
            if (alt != null && alt !== '') img.alt = alt;
            if (img.complete) finish();
        });

    return (async () => {
        img.classList.add('is-swapping');
        await waitOpacity();
        await waitLoad();
        // Ensure the browser paints opacity:0 before fading back in.
        void img.offsetWidth;
        img.classList.remove('is-swapping');
    })();
}

/**
 * Left: random program gallery / program image.
 * Right two: random artist profile (if available) or artwork — distinct artists when possible.
 * @param {HTMLElement} root
 * @param {unknown[]} [artistsPrefetch]
 */
async function hydrateCollageImages(root, artistsPrefetch) {
    const imgs = /** @type {HTMLImageElement[]} */ (
        [0, 1, 2].map((i) => root.querySelector(`[data-jnp-collage="${i}"]`)).filter((el) => el instanceof HTMLImageElement)
    );
    if (imgs.length < 3) return;

    try {
        const [block, artists] = await Promise.all([
            getAllProgramsBlock(),
            artistsPrefetch ? Promise.resolve(artistsPrefetch) : getArtists(),
        ]);
        const publicBlock = filterProgramsBlockToPublicListing(block);
        const programs = Array.isArray(publicBlock?.programs?.en) ? publicBlock.programs.en : [];
        const programPool = [];
        for (const p of programs) {
            programPool.push(...collectProgramImageUrls(p));
        }
        const uniquePrograms = [...new Set(programPool)];
        /** @type {Promise<void>[]} */
        const swaps = [];
        if (uniquePrograms.length) {
            const left = uniquePrograms[Math.floor(Math.random() * uniquePrograms.length)];
            swaps.push(swapCollageImage(imgs[0], left, imgs[0].alt || 'FUSION program'));
        }

        const artistPool = (Array.isArray(artists) ? artists : [])
            .map((a) => {
                const url = artistCollageImageUrl(a);
                if (!url) return null;
                const name =
                    String(/** @type {any} */ (a)?.locales?.en?.name ?? '').trim() ||
                    String(/** @type {any} */ (a)?.slug ?? '').trim() ||
                    'Artist';
                return { url, name, id: String(/** @type {any} */ (a)?.id ?? name) };
            })
            .filter(Boolean);
        const picked = pickRandomUnique(/** @type {{ url: string, name: string, id: string }[]} */ (artistPool), 2);
        picked.forEach((item, i) => {
            const img = imgs[i + 1];
            if (!img || !item) return;
            swaps.push(swapCollageImage(img, item.url, item.name));
        });
        await Promise.all(swaps);
    } catch {
        /* keep CMS / default collage srcs */
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
        const pool = (Array.isArray(artists) ? artists : []).filter((a) => artistHasPublicPlayableAudio(a));
        if (!pool.length) {
            mount.hidden = true;
            mount.innerHTML = '';
            return;
        }
        const artist = pool[Math.floor(Math.random() * pool.length)];
        const entries = getApprovedAudioEntries(artist);
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
        title: copy.seoTitle || 'Join FUSION | Membership',
        description:
            copy.seoDescription ||
            'Join a curated network connecting artists, galleries, curators, and collectors through programs rooted in Japan.',
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
        await Promise.all([hydrateCollageImages(root, artists), mountRandomArtistAudio(root, artists)]);
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
    });

    const accessToggle = /** @type {HTMLButtonElement | null} */ (root.querySelector('#jnpAccessToggle'));
    const accessPanel = /** @type {HTMLElement | null} */ (root.querySelector('#jnpAccessPanel'));
    const accessInput = /** @type {HTMLInputElement | null} */ (root.querySelector('#jnpAccessCode'));
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
