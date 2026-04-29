/**
 * Studio → Content → Community: tabbed editor for `/community` JSON blob.
 */
import {
    adminGetCommunityPageStudio,
    adminSetCommunityPageStudio,
} from '../../../utils/database.js';
import { uploadBlobToS3 } from '../../../utils/studioS3Upload.js';
import { studioPageHeaderHtml } from '../../../utils/studioCategoryLayout.js';

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** @returns {string} */
export function renderCommunitySection() {
    return `
        <div class="studio-section-stack studio-category-page studio-community">
            ${studioPageHeaderHtml({
                title: 'Community',
                subtitle: '/community landing — hero video, exclusive row, connect, network cards, sessions, promo',
                countId: 'studio-community-header-count',
                countLabel: '',
            })}
            <p id="studio-community-msg" class="studio-banner studio-banner--info" style="display:none"></p>
            <div class="studio-community__stack">
                <section class="studio-community__section" aria-labelledby="studio-community-hero-title">
                    <div class="studio-community__section-head">
                        <h3 id="studio-community-hero-title" class="studio-subheading">Hero</h3>
                        <p class="studio-muted">Primary video and CTA copy shown on `/community`.</p>
                    </div>
                    <div id="studio-com-form-hero" class="studio-community__form"></div>
                </section>
                <section class="studio-community__section" aria-labelledby="studio-community-exclusive-title">
                    <div class="studio-community__section-head">
                        <h3 id="studio-community-exclusive-title" class="studio-subheading">Exclusive</h3>
                        <p class="studio-muted">Three featured cards with image, locale copy, and destination.</p>
                    </div>
                    <div id="studio-com-form-exc" class="studio-community__form"></div>
                </section>
                <section class="studio-community__section" aria-labelledby="studio-community-connect-title">
                    <div class="studio-community__section-head">
                        <h3 id="studio-community-connect-title" class="studio-subheading">Connect</h3>
                        <p class="studio-muted">Section headings, links, and three info bites.</p>
                    </div>
                    <div id="studio-com-form-con" class="studio-community__form"></div>
                </section>
                <section class="studio-community__section" aria-labelledby="studio-community-footer-title">
                    <div class="studio-community__section-head">
                        <h3 id="studio-community-footer-title" class="studio-subheading">Promo, Network, Sessions</h3>
                        <p class="studio-muted">Promo copy plus repeatable network cards and session rows.</p>
                    </div>
                    <div id="studio-com-form-foot" class="studio-community__form"></div>
                </section>
            </div>
            <div class="studio-community__actions">
                <div class="studio-toolbar-actions">
                    <button type="button" class="studio-btn-primary" id="studio-community-save">Save community page</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * @param {Record<string, unknown>} bundle
 */
function renderHeroForm(bundle) {
    const h = bundle.hero && typeof bundle.hero === 'object' ? /** @type {Record<string, unknown>} */ (bundle.hero) : {};
    const field = (id, label, val) => `
        <label class="studio-field">
            <span>${escapeHtml(label)}</span>
            <input type="text" id="${id}" class="studio-input" value="${escapeHtml(String(val ?? ''))}" />
        </label>`;
    return `
        <p class="studio-muted">Primary CTA on the public site switches between <strong>Join</strong> and <strong>Watch</strong> based on membership — labels below are used for those modes.</p>
        ${field('st-com-hero-video', 'Video URL (mp4)', h.videoUrl)}
        ${field('st-com-hero-poster', 'Poster image URL', h.posterUrl)}
        ${field('st-com-hero-ov-title', 'Overlay — line 1 (e.g. In Conversation)', h.overlayTitle)}
        ${field('st-com-hero-ov-guests', 'Overlay — guests', h.overlayGuests)}
        ${field('st-com-hero-ov-dur', 'Overlay — duration text', h.overlayDuration)}
        ${field('st-com-hero-k-en', 'Kicker EN', h.kickerEn)}
        ${field('st-com-hero-k-ja', 'Kicker JA', h.kickerJa)}
        ${field('st-com-hero-h-en', 'Headline EN', h.headlineEn)}
        ${field('st-com-hero-h-ja', 'Headline JA', h.headlineJa)}
        <label class="studio-field"><span>Body EN</span><textarea id="st-com-hero-b-en" class="studio-input" rows="3">${escapeHtml(String(h.bodyEn ?? ''))}</textarea></label>
        <label class="studio-field"><span>Body JA</span><textarea id="st-com-hero-b-ja" class="studio-input" rows="3">${escapeHtml(String(h.bodyJa ?? ''))}</textarea></label>
        ${field('st-com-hero-cta-join-en', 'CTA Join EN', h.ctaJoinLabelEn)}
        ${field('st-com-hero-cta-join-ja', 'CTA Join JA', h.ctaJoinLabelJa)}
        ${field('st-com-hero-cta-watch-en', 'CTA Watch EN', h.ctaWatchLabelEn)}
        ${field('st-com-hero-cta-watch-ja', 'CTA Watch JA', h.ctaWatchLabelJa)}
        <label class="studio-file-label studio-btn-ghost">
            <input type="file" id="st-com-hero-poster-file" accept="image/*" class="studio-file-input" />
            Upload poster to S3
        </label>
    `;
}

/**
 * @param {Record<string, unknown>} bundle
 */
function renderExclusiveForm(bundle) {
    const ex = Array.isArray(bundle.exclusive) ? bundle.exclusive : [{}, {}, {}];
    while (ex.length < 3) ex.push({});
    const cards = ex.slice(0, 3).map((raw, i) => {
        const c = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
        const n = i + 1;
        return `
            <fieldset class="studio-field-group studio-community__card">
                <legend>Card ${n}</legend>
                <label class="studio-field"><span>Image URL</span><input type="text" id="st-com-ex-${i}-img" class="studio-input" value="${escapeHtml(String(c.imageUrl ?? ''))}" /></label>
                <label class="studio-field"><span>Line EN</span><input type="text" id="st-com-ex-${i}-en" class="studio-input" value="${escapeHtml(String(c.lineEn ?? ''))}" /></label>
                <label class="studio-field"><span>Line JA</span><input type="text" id="st-com-ex-${i}-ja" class="studio-input" value="${escapeHtml(String(c.lineJa ?? ''))}" /></label>
                <label class="studio-field"><span>Link href</span><input type="text" id="st-com-ex-${i}-href" class="studio-input" value="${escapeHtml(String(c.href ?? ''))}" placeholder="/journal" /></label>
                <label class="studio-file-label studio-btn-ghost">
                    <input type="file" id="st-com-ex-${i}-file" accept="image/*" class="studio-file-input" data-card-idx="${i}" />
                    Upload image
                </label>
            </fieldset>`;
    });
    return cards.join('');
}

/**
 * @param {Record<string, unknown>} bundle
 */
function renderConnectForm(bundle) {
    const d = bundle.connect && typeof bundle.connect === 'object' ? /** @type {Record<string, unknown>} */ (bundle.connect) : {};
    const bites = Array.isArray(d.bites) ? d.bites : [];
    while (bites.length < 3) bites.push({});
    const biteFields = bites.slice(0, 3).map((raw, i) => {
        const b = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
        return `
            <fieldset class="studio-field-group studio-community__card">
                <legend>Bite ${i + 1}</legend>
                <label class="studio-field"><span>Title EN</span><input type="text" id="st-com-cn-b${i}-ten" class="studio-input" value="${escapeHtml(String(b.titleEn ?? ''))}" /></label>
                <label class="studio-field"><span>Title JA</span><input type="text" id="st-com-cn-b${i}-tja" class="studio-input" value="${escapeHtml(String(b.titleJa ?? ''))}" /></label>
                <label class="studio-field"><span>Body EN</span><textarea id="st-com-cn-b${i}-ben" class="studio-input" rows="2">${escapeHtml(String(b.bodyEn ?? ''))}</textarea></label>
                <label class="studio-field"><span>Body JA</span><textarea id="st-com-cn-b${i}-bja" class="studio-input" rows="2">${escapeHtml(String(b.bodyJa ?? ''))}</textarea></label>
            </fieldset>`;
    });
    return `
        <label class="studio-field"><span>Section title EN</span><input type="text" id="st-com-cn-t-en" class="studio-input" value="${escapeHtml(String(d.titleEn ?? ''))}" /></label>
        <label class="studio-field"><span>Section title JA</span><input type="text" id="st-com-cn-t-ja" class="studio-input" value="${escapeHtml(String(d.titleJa ?? ''))}" /></label>
        <label class="studio-field"><span>How it works URL</span><input type="text" id="st-com-cn-hiw-h" class="studio-input" value="${escapeHtml(String(d.howItWorksHref ?? ''))}" /></label>
        <label class="studio-field"><span>How it works label EN</span><input type="text" id="st-com-cn-hiw-en" class="studio-input" value="${escapeHtml(String(d.howItWorksLabelEn ?? ''))}" /></label>
        <label class="studio-field"><span>How it works label JA</span><input type="text" id="st-com-cn-hiw-ja" class="studio-input" value="${escapeHtml(String(d.howItWorksLabelJa ?? ''))}" /></label>
        <label class="studio-field"><span>Browse href</span><input type="text" id="st-com-cn-br-h" class="studio-input" value="${escapeHtml(String(d.browseHref ?? ''))}" /></label>
        <label class="studio-field"><span>Browse label EN</span><input type="text" id="st-com-cn-br-en" class="studio-input" value="${escapeHtml(String(d.browseLabelEn ?? ''))}" /></label>
        <label class="studio-field"><span>Browse label JA</span><input type="text" id="st-com-cn-br-ja" class="studio-input" value="${escapeHtml(String(d.browseLabelJa ?? ''))}" /></label>
        ${biteFields.join('')}
    `;
}

/**
 * @param {Record<string, unknown>} bundle
 */
function renderFootForm(bundle) {
    const net = Array.isArray(bundle.networkCards) ? bundle.networkCards : [];
    const sess = Array.isArray(bundle.sessions) ? bundle.sessions : [];
    const pr = bundle.promo && typeof bundle.promo === 'object' ? /** @type {Record<string, unknown>} */ (bundle.promo) : {};

    const netRows = net
        .map((raw) => {
            const c = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
            return `
            <tr>
                <td><input type="text" class="studio-input st-com-net-name" value="${escapeHtml(String(c.name ?? ''))}" placeholder="Name" /></td>
                <td><input type="text" class="studio-input st-com-net-role" value="${escapeHtml(String(c.role ?? ''))}" /></td>
                <td><input type="text" class="studio-input st-com-net-loc" value="${escapeHtml(String(c.location ?? ''))}" /></td>
                <td><input type="text" class="studio-input st-com-net-av" value="${escapeHtml(String(c.avatarUrl ?? ''))}" placeholder="Avatar URL" /></td>
                <td><input type="text" class="studio-input st-com-net-href" value="${escapeHtml(String(c.connectHref ?? ''))}" placeholder="/…" /></td>
                <td><button type="button" class="studio-btn-ghost st-com-net-del">Remove</button></td>
            </tr>`;
        })
        .join('');

    const sessRows = sess
        .map((raw) => {
            const s = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
            return `
            <tr>
                <td><input type="text" class="studio-input st-com-ss-thumb" value="${escapeHtml(String(s.thumbUrl ?? ''))}" placeholder="Thumb URL" /></td>
                <td><input type="text" class="studio-input st-com-ss-kind" value="${escapeHtml(String(s.kindLabel ?? ''))}" /></td>
                <td><input type="text" class="studio-input st-com-ss-title" value="${escapeHtml(String(s.title ?? ''))}" /></td>
                <td><input type="text" class="studio-input st-com-ss-dt" value="${escapeHtml(String(s.datetimeLine ?? ''))}" /></td>
                <td><input type="text" class="studio-input st-com-ss-rlab" value="${escapeHtml(String(s.registerLabel ?? ''))}" /></td>
                <td><input type="text" class="studio-input st-com-ss-rhref" value="${escapeHtml(String(s.registerHref ?? ''))}" /></td>
                <td><button type="button" class="studio-btn-ghost st-com-ss-del">Remove</button></td>
            </tr>`;
        })
        .join('');

    return `
        <h3 class="studio-subheading">Promo block</h3>
        <label class="studio-field"><span>Headline EN</span><textarea id="st-com-pr-h-en" class="studio-input" rows="2">${escapeHtml(String(pr.headlineEn ?? ''))}</textarea></label>
        <label class="studio-field"><span>Headline JA</span><textarea id="st-com-pr-h-ja" class="studio-input" rows="2">${escapeHtml(String(pr.headlineJa ?? ''))}</textarea></label>
        <label class="studio-field"><span>Subline EN</span><input type="text" id="st-com-pr-s-en" class="studio-input" value="${escapeHtml(String(pr.sublineEn ?? ''))}" /></label>
        <label class="studio-field"><span>Subline JA</span><input type="text" id="st-com-pr-s-ja" class="studio-input" value="${escapeHtml(String(pr.sublineJa ?? ''))}" /></label>

        <h3 class="studio-subheading studio-community__subhead">Network cards</h3>
        <div class="studio-table-wrap studio-table-wrap--rounded studio-community__table-wrap">
            <table class="studio-table studio-table--dense">
                <thead><tr><th>Name</th><th>Role</th><th>Location</th><th>Avatar URL</th><th>Connect href</th><th></th></tr></thead>
                <tbody id="st-com-net-tbody">${netRows || ''}</tbody>
            </table>
        </div>
        <div class="studio-community__inline-actions">
            <button type="button" class="studio-btn-ghost" id="st-com-net-add">Add network card</button>
        </div>

        <h3 class="studio-subheading studio-community__subhead">Upcoming sessions</h3>
        <div class="studio-table-wrap studio-table-wrap--rounded studio-community__table-wrap">
            <table class="studio-table studio-table--dense">
                <thead><tr><th>Thumb</th><th>Kind</th><th>Title</th><th>Date/time line</th><th>Reg label</th><th>Reg href</th><th></th></tr></thead>
                <tbody id="st-com-ss-tbody">${sessRows || ''}</tbody>
            </table>
        </div>
        <div class="studio-community__inline-actions">
            <button type="button" class="studio-btn-ghost" id="st-com-ss-add">Add session</button>
        </div>
    `;
}

/**
 * @param {HTMLElement} mainEl
 */
export async function initCommunitySection(mainEl) {
    const msg = mainEl.querySelector('#studio-community-msg');
    const show = (text, kind = 'info') => {
        if (!msg) return;
        msg.style.display = text ? 'block' : 'none';
        msg.textContent = text || '';
        msg.className = `studio-banner studio-banner--${kind}`;
    };

    /** @type {Record<string, unknown>} */
    let bundle = {};

    const root = mainEl.querySelector('[data-studio-tabs="community"]');
    if (root) {
        const tabs = root.querySelectorAll('.studio-tabs__tab[role="tab"]');
        const panels = root.querySelectorAll('.studio-tabs__panel[role="tabpanel"]');
        tabs.forEach((tab, i) => {
            tab.addEventListener('click', () => {
                tabs.forEach((t, j) => {
                    const on = j === i;
                    t.classList.toggle('is-active', on);
                    t.setAttribute('aria-selected', on ? 'true' : 'false');
                    if (panels[j]) {
                        panels[j].classList.toggle('is-active', on);
                        panels[j].toggleAttribute('hidden', !on);
                    }
                });
            });
        });
    }

    function collectFromDom() {
        const val = (id) => {
            const el = mainEl.querySelector(`#${id}`);
            return el && 'value' in el ? String(/** @type {HTMLInputElement} */ (el).value) : '';
        };

        const hero = {
            videoUrl: val('st-com-hero-video'),
            posterUrl: val('st-com-hero-poster'),
            overlayTitle: val('st-com-hero-ov-title'),
            overlayGuests: val('st-com-hero-ov-guests'),
            overlayDuration: val('st-com-hero-ov-dur'),
            kickerEn: val('st-com-hero-k-en'),
            kickerJa: val('st-com-hero-k-ja'),
            headlineEn: val('st-com-hero-h-en'),
            headlineJa: val('st-com-hero-h-ja'),
            bodyEn: val('st-com-hero-b-en'),
            bodyJa: val('st-com-hero-b-ja'),
            ctaJoinLabelEn: val('st-com-hero-cta-join-en'),
            ctaJoinLabelJa: val('st-com-hero-cta-join-ja'),
            ctaWatchLabelEn: val('st-com-hero-cta-watch-en'),
            ctaWatchLabelJa: val('st-com-hero-cta-watch-ja'),
        };

        const exclusive = [0, 1, 2].map((i) => ({
            imageUrl: val(`st-com-ex-${i}-img`),
            lineEn: val(`st-com-ex-${i}-en`),
            lineJa: val(`st-com-ex-${i}-ja`),
            href: val(`st-com-ex-${i}-href`),
        }));

        const bites = [0, 1, 2].map((i) => ({
            titleEn: val(`st-com-cn-b${i}-ten`),
            titleJa: val(`st-com-cn-b${i}-tja`),
            bodyEn: val(`st-com-cn-b${i}-ben`),
            bodyJa: val(`st-com-cn-b${i}-bja`),
        }));

        const connect = {
            titleEn: val('st-com-cn-t-en'),
            titleJa: val('st-com-cn-t-ja'),
            howItWorksHref: val('st-com-cn-hiw-h'),
            howItWorksLabelEn: val('st-com-cn-hiw-en'),
            howItWorksLabelJa: val('st-com-cn-hiw-ja'),
            browseHref: val('st-com-cn-br-h'),
            browseLabelEn: val('st-com-cn-br-en'),
            browseLabelJa: val('st-com-cn-br-ja'),
            bites,
        };

        const networkCards = [];
        mainEl.querySelectorAll('#st-com-net-tbody tr').forEach((tr) => {
            networkCards.push({
                name: String(tr.querySelector('.st-com-net-name')?.value ?? ''),
                role: String(tr.querySelector('.st-com-net-role')?.value ?? ''),
                location: String(tr.querySelector('.st-com-net-loc')?.value ?? ''),
                avatarUrl: String(tr.querySelector('.st-com-net-av')?.value ?? ''),
                connectHref: String(tr.querySelector('.st-com-net-href')?.value ?? ''),
            });
        });

        const sessions = [];
        mainEl.querySelectorAll('#st-com-ss-tbody tr').forEach((tr) => {
            sessions.push({
                thumbUrl: String(tr.querySelector('.st-com-ss-thumb')?.value ?? ''),
                kindLabel: String(tr.querySelector('.st-com-ss-kind')?.value ?? ''),
                title: String(tr.querySelector('.st-com-ss-title')?.value ?? ''),
                datetimeLine: String(tr.querySelector('.st-com-ss-dt')?.value ?? ''),
                registerLabel: String(tr.querySelector('.st-com-ss-rlab')?.value ?? ''),
                registerHref: String(tr.querySelector('.st-com-ss-rhref')?.value ?? ''),
            });
        });

        const promo = {
            headlineEn: val('st-com-pr-h-en'),
            headlineJa: val('st-com-pr-h-ja'),
            sublineEn: val('st-com-pr-s-en'),
            sublineJa: val('st-com-pr-s-ja'),
        };

        return {
            ...bundle,
            hero,
            exclusive,
            connect,
            networkCards,
            sessions,
            promo,
        };
    }

    function fillForms() {
        const fh = mainEl.querySelector('#studio-com-form-hero');
        const fe = mainEl.querySelector('#studio-com-form-exc');
        const fc = mainEl.querySelector('#studio-com-form-con');
        const ff = mainEl.querySelector('#studio-com-form-foot');
        if (fh) fh.innerHTML = renderHeroForm(bundle);
        if (fe) fe.innerHTML = renderExclusiveForm(bundle);
        if (fc) fc.innerHTML = renderConnectForm(bundle);
        if (ff) ff.innerHTML = renderFootForm(bundle);
    }

    mainEl.addEventListener('click', (e) => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        if (t.id === 'st-com-net-add') {
            e.preventDefault();
            bundle = collectFromDom();
            bundle.networkCards = [...(Array.isArray(bundle.networkCards) ? bundle.networkCards : []), {}];
            fillForms();
            return;
        }
        if (t.id === 'st-com-ss-add') {
            e.preventDefault();
            bundle = collectFromDom();
            bundle.sessions = [...(Array.isArray(bundle.sessions) ? bundle.sessions : []), {}];
            fillForms();
            return;
        }
        if (t.classList.contains('st-com-net-del')) {
            e.preventDefault();
            const tr = t.closest('tr');
            const tb = mainEl.querySelector('#st-com-net-tbody');
            const idx = tr && tb ? Array.from(tb.children).indexOf(tr) : -1;
            bundle = collectFromDom();
            const arr = [...(Array.isArray(bundle.networkCards) ? bundle.networkCards : [])];
            if (idx >= 0) arr.splice(idx, 1);
            bundle.networkCards = arr;
            fillForms();
            return;
        }
        if (t.classList.contains('st-com-ss-del')) {
            e.preventDefault();
            const tr = t.closest('tr');
            const tb = mainEl.querySelector('#st-com-ss-tbody');
            const idx = tr && tb ? Array.from(tb.children).indexOf(tr) : -1;
            bundle = collectFromDom();
            const arr = [...(Array.isArray(bundle.sessions) ? bundle.sessions : [])];
            if (idx >= 0) arr.splice(idx, 1);
            bundle.sessions = arr;
            fillForms();
        }
    });

    mainEl.addEventListener('change', async (ev) => {
        const t = ev.target;
        if (!(t instanceof HTMLInputElement) || t.type !== 'file') return;
        const f = t.files?.[0];
        if (!f) return;
        if (t.id === 'st-com-hero-poster-file') {
            try {
                const posterIn = /** @type {HTMLInputElement | null} */ (mainEl.querySelector('#st-com-hero-poster'));
                const url = await uploadBlobToS3(f, posterIn, { area: 'studio/community' });
                if (posterIn) posterIn.value = url;
                show('Poster uploaded.', 'info');
            } catch (err) {
                show(err instanceof Error ? err.message : String(err), 'warn');
            }
            t.value = '';
            return;
        }
        const m = /^st-com-ex-(\d+)-file$/.exec(t.id || '');
        if (m) {
            const i = Number(m[1]);
            try {
                const imgIn = /** @type {HTMLInputElement | null} */ (
                    mainEl.querySelector(`#st-com-ex-${i}-img`)
                );
                const url = await uploadBlobToS3(f, imgIn, { area: 'studio/community' });
                if (imgIn) imgIn.value = url;
                show(`Card ${i + 1} image uploaded.`, 'info');
            } catch (err) {
                show(err instanceof Error ? err.message : String(err), 'warn');
            }
            t.value = '';
        }
    });

    try {
        bundle = await adminGetCommunityPageStudio();
        if (!bundle || typeof bundle !== 'object') bundle = {};
    } catch (e) {
        show(e instanceof Error ? e.message : String(e), 'warn');
        bundle = {};
    }

    fillForms();

    mainEl.querySelector('#studio-community-save')?.addEventListener('click', async () => {
        try {
            const next = collectFromDom();
            await adminSetCommunityPageStudio(next);
            bundle = next;
            show('Saved.', 'info');
        } catch (e) {
            show(e instanceof Error ? e.message : String(e), 'warn');
        }
    });
}
