import '../styles/studio.css';
import '../styles/memberProfileDashboard.css';
import {
    getMyArtistRecord,
    updateMyArtistLocalesJson,
    updateMyArtistProfilePatch,
    getProfileSettingsDevArtistId,
    setProfileSettingsDevArtistId,
    getArtists,
    getDataSource,
} from '../utils/database.js';
import {
    copyIntroGalleryEnToJa,
    introSlotsFromWorld,
    localeBlock,
    readLinksFromContainer,
    readLocalesFromDom,
    safeJsonStringify,
    worldFieldToTextarea,
} from '../utils/memberProfileForm.js';
import { normalizeLocalesWorldForStorage } from '../utils/worldNormalize.js';
import { getAuthSnapshot } from '../utils/icAuth.js';
import { DEV_MODE } from '../config.js';
import { uploadBlobToS3 } from '../utils/studioS3Upload.js';

/**
 * @param {string} id
 */
function el(id) {
    return /** @type {HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLImageElement | null} */ (
        document.getElementById(id)
    );
}

/**
 * @param {string} id
 */
function getVal(id) {
    const n = el(id);
    if (!n || !('value' in n)) return '';
    return String(n.value ?? '');
}

/**
 * @param {string} id
 * @param {string} v
 */
function setVal(id, v) {
    const n = el(id);
    if (n && 'value' in n) n.value = v;
}

/**
 * @param {Record<string, unknown>} locales
 * @param {'en' | 'ja'} active
 */
function fillFormFromLocales(locales, active) {
    const b = localeBlock(locales, active);
    const w = b.world && typeof b.world === 'object' && !Array.isArray(b.world) ? b.world : {};
    setVal('mpd_name', String(b.name ?? ''));
    setVal('mpd_discipline', String(b.discipline ?? ''));
    setVal('mpd_bio', String(b.bio ?? ''));
    setVal('mpd_bioLong', String(b.bioLong ?? ''));
    const st = String(b.status ?? '');
    const sel = /** @type {HTMLSelectElement | null} */ (document.getElementById('mpd_status'));
    if (sel) sel.value = ['studio', 'prep', 'showing', 'available'].includes(st) ? st : 'studio';
    const loc = b.location && typeof b.location === 'object' && !Array.isArray(b.location) ? b.location : {};
    setVal('mpd_loc_city', String(loc.city ?? ''));
    setVal('mpd_loc_state', String(loc.state ?? ''));
    setVal('mpd_loc_country', String(loc.country ?? ''));
    setVal('mpd_loc_display', String(loc.display ?? ''));
    const seo = b.seo && typeof b.seo === 'object' && !Array.isArray(b.seo) ? b.seo : {};
    setVal('mpd_seo_title', String(seo.title ?? ''));
    setVal('mpd_seo_desc', String(seo.description ?? ''));
    setVal('mpd_w_practice', String(w.practice ?? ''));
    setVal('mpd_w_perspective', worldFieldToTextarea(w.perspective));
    setVal('mpd_w_vision', worldFieldToTextarea(w.vision));
    setVal('mpd_w_constructing', worldFieldToTextarea(w.constructing));
    setVal('mpd_w_context', worldFieldToTextarea(w.context));
    setVal('mpd_w_quote', String(w.quote ?? ''));
    const slots = introSlotsFromWorld(w);
    for (let i = 0; i < 3; i++) {
        const s = slots[i] || { src: '', alt: '', caption: '' };
        setVal(`mpd_intro_${i}_src`, s.src);
        setVal(`mpd_intro_${i}_alt`, s.alt);
        setVal(`mpd_intro_${i}_caption`, s.caption);
        const im = /** @type {HTMLImageElement | null} */ (document.getElementById(`mpd_intro_${i}_thumb`));
        if (im) {
            im.src = s.src || '';
            im.style.display = s.src ? 'block' : 'none';
        }
    }
    const progs = Array.isArray(b.programs) ? b.programs : [];
    const progEl = document.getElementById('mpd_programs_readonly');
    if (progEl) {
        progEl.textContent = progs.length
            ? progs.map(String).join(', ')
            : '— (managed by Fusion)';
    }
    const devTa = /** @type {HTMLTextAreaElement | null} */ (document.getElementById('mpd_dev_json'));
    if (devTa && DEV_MODE) devTa.value = safeJsonStringify(locales);
    renderLinkRows(Array.isArray(b.links) ? b.links : []);
}

/**
 * @param {unknown[]} links
 */
function renderLinkRows(links) {
    const root = document.getElementById('mpd-links');
    if (!root) return;
    const rows = Array.isArray(links) && links.length ? links : [{ type: 'website', url: '', label: '' }];
    root.replaceChildren();
    for (let idx = 0; idx < rows.length; idx++) {
        const item = rows[idx] && typeof rows[idx] === 'object' ? rows[idx] : {};
        const row = document.createElement('div');
        row.className = 'mpd-link-row studio-form-grid';
        row.innerHTML = `
            <label class="studio-field"><span>Type</span>
                <select class="studio-input mpd-link-type">
                    <option value="website">website</option>
                    <option value="instagram">instagram</option>
                    <option value="other">other</option>
                </select>
            </label>
            <label class="studio-field"><span>URL</span>
                <input type="url" class="studio-input mpd-link-url" placeholder="https://" value="" />
            </label>
            <label class="studio-field studio-field--full"><span>Label</span>
                <input type="text" class="studio-input mpd-link-label" value="" />
            </label>
        `;
        const typeSel = row.querySelector('.mpd-link-type');
        const urlIn = row.querySelector('.mpd-link-url');
        const labelIn = row.querySelector('.mpd-link-label');
        if (typeSel && 'value' in typeSel) typeSel.value = String(item.type ?? 'website');
        if (urlIn && 'value' in urlIn) urlIn.value = String(item.url ?? '');
        if (labelIn && 'value' in labelIn) labelIn.value = String(item.label ?? '');
        root.appendChild(row);
    }
}

export function generateSettingsProfileContent() {
    return `
        <div class="member-profile-dashboard" id="mpd_root">
            <aside class="member-profile-dashboard__sidebar" aria-label="Profile sections">
                <a href="/" class="studio-back" style="color:#94a3b8;font-size:0.8rem;">← Public site</a>
                <div class="member-profile-dashboard__sidebar-title">Profile</div>
                <p class="member-profile-dashboard__sidebar-meta" id="mpd_sidebar_slug">—</p>
                <nav class="member-profile-dashboard__nav" aria-label="Section navigation">
                    <a href="#mpd-overview">Overview</a>
                    <a href="#mpd-media">Photos &amp; media</a>
                    <a href="#mpd-basics">Basics &amp; location</a>
                    <a href="#mpd-story">Story &amp; world</a>
                    <a href="#mpd-links">Links</a>
                    <a href="#mpd-seo">Discovery (SEO)</a>
                    <a href="#mpd-programs">Programs</a>
                </nav>
            </aside>
            <div class="member-profile-dashboard__workspace">
                <p id="settingsProfileHint" class="studio-muted" style="margin-top:0"></p>
                <div id="settingsTestPicker" class="studio-field studio-field--full" style="display:none">
                    <span>Test mode</span>
                    <select id="settingsTestArtistSelect" class="studio-input"></select>
                </div>
                <div id="settingsProfileFormWrap" hidden>
                    <div class="member-profile-dashboard__locale-bar">
                        <span class="studio-toolbar-label">Editing language</span>
                        <button type="button" class="mpd-locale-tab is-active" data-locale="en">English</button>
                        <button type="button" class="mpd-locale-tab" data-locale="ja">日本語</button>
                        <button type="button" class="studio-btn-ghost" id="mpd_copy_intro_ja" title="Copy intro images from English">Copy intro from EN → JA</button>
                    </div>

                    <section class="member-profile-dashboard__card" id="mpd-overview">
                        <h2>Overview</h2>
                        <p class="studio-muted">Your public profile and last update.</p>
                        <div class="studio-form-grid">
                            <label class="studio-field studio-field--full"><span>Public URL</span>
                                <input type="text" id="mpd_public_url" class="studio-input" readonly />
                            </label>
                            <label class="studio-field"><span>Last updated</span>
                                <input type="text" id="mpd_updated_at" class="studio-input" readonly />
                            </label>
                            <div class="studio-field studio-field--full">
                                <span>&nbsp;</span>
                                <a class="studio-btn-primary" id="mpd_view_profile" href="#" target="_blank" rel="noopener">View public profile</a>
                            </div>
                        </div>
                        <p id="mpd_datasource_pill" class="member-profile-dashboard__pill" style="display:none;margin-top:0.75rem"></p>
                    </section>

                    <section class="member-profile-dashboard__card" id="mpd-media">
                        <h2>Photos &amp; media</h2>
                        <p class="studio-muted">Hero image appears at the top of your profile. Intro images (max 3) appear below your story for the active language.</p>
                        <h3 class="studio-subheading" style="margin:0.5rem 0 0.35rem">Hero image</h3>
                        <img id="mpd_hero_preview" class="member-profile-dashboard__hero-preview" alt="" />
                        <div class="studio-form-grid">
                            <label class="studio-field studio-field--full"><span>Image URL</span>
                                <input type="url" id="mpd_hero_url" class="studio-input" placeholder="https://…" />
                            </label>
                            <div class="studio-field studio-field--full">
                                <span>Upload file</span>
                                <input type="file" id="mpd_hero_file" accept="image/*" class="studio-input-file" style="max-width:100%" />
                            </div>
                        </div>

                        <h3 class="studio-subheading" style="margin:1.25rem 0 0.35rem">Intro artwork (max 3)</h3>
                        ${[0, 1, 2]
                            .map(
                                (i) => `
                        <div class="member-profile-dashboard__intro-slot">
                            <img id="mpd_intro_${i}_thumb" class="member-profile-dashboard__intro-thumb" alt="" style="display:none" />
                            <div class="studio-form-grid" style="grid-column:2">
                                <label class="studio-field studio-field--full"><span>Image URL</span>
                                    <input type="url" id="mpd_intro_${i}_src" class="studio-input" placeholder="https://…" />
                                </label>
                                <label class="studio-field"><span>Alt text</span>
                                    <input type="text" id="mpd_intro_${i}_alt" class="studio-input" />
                                </label>
                                <label class="studio-field studio-field--full"><span>Caption</span>
                                    <input type="text" id="mpd_intro_${i}_caption" class="studio-input" />
                                </label>
                                <div class="studio-field studio-field--full">
                                    <span>Upload</span>
                                    <input type="file" id="mpd_intro_${i}_file" accept="image/*" class="studio-input-file" data-intro-slot="${String(i)}" />
                                </div>
                            </div>
                        </div>`
                            )
                            .join('')}
                    </section>

                    <section class="member-profile-dashboard__card" id="mpd-basics">
                        <h2>Basics &amp; location</h2>
                        <p class="studio-muted">Name, role, bios, and location for the selected language.</p>
                        <div class="studio-form-grid">
                            <label class="studio-field"><span>Name</span>
                                <input type="text" id="mpd_name" class="studio-input" autocomplete="name" />
                            </label>
                            <label class="studio-field"><span>Discipline</span>
                                <input type="text" id="mpd_discipline" class="studio-input" />
                            </label>
                            <label class="studio-field studio-field--full"><span>Status</span>
                                <select id="mpd_status" class="studio-input">
                                    <option value="studio">In studio</option>
                                    <option value="prep">Preparing for exhibition</option>
                                    <option value="showing">Show in progress</option>
                                    <option value="available">Available for commissions</option>
                                </select>
                            </label>
                            <label class="studio-field studio-field--full"><span>Short bio</span>
                                <textarea id="mpd_bio" class="studio-textarea" rows="3"></textarea>
                            </label>
                            <label class="studio-field studio-field--full"><span>Long bio</span>
                                <textarea id="mpd_bioLong" class="studio-textarea" rows="5"></textarea>
                            </label>
                            <label class="studio-field"><span>City</span>
                                <input type="text" id="mpd_loc_city" class="studio-input" />
                            </label>
                            <label class="studio-field"><span>State / region</span>
                                <input type="text" id="mpd_loc_state" class="studio-input" />
                            </label>
                            <label class="studio-field"><span>Country</span>
                                <input type="text" id="mpd_loc_country" class="studio-input" />
                            </label>
                            <label class="studio-field studio-field--full"><span>Display location (override)</span>
                                <input type="text" id="mpd_loc_display" class="studio-input" placeholder="Optional single line for feeds" />
                            </label>
                        </div>
                    </section>

                    <section class="member-profile-dashboard__card" id="mpd-story">
                        <h2>Story &amp; world</h2>
                        <p class="studio-muted">Separate paragraphs with a blank line where noted. Text is stored in a consistent format for the site.</p>
                        <div class="studio-form-grid">
                            <label class="studio-field studio-field--full"><span>Practice</span>
                                <textarea id="mpd_w_practice" class="studio-textarea" rows="3"></textarea>
                            </label>
                            <label class="studio-field studio-field--full"><span>Perspective</span>
                                <textarea id="mpd_w_perspective" class="studio-textarea" rows="4" placeholder="Paragraph one&#10;&#10;Paragraph two"></textarea>
                            </label>
                            <label class="studio-field studio-field--full"><span>Vision</span>
                                <textarea id="mpd_w_vision" class="studio-textarea" rows="4"></textarea>
                            </label>
                            <label class="studio-field studio-field--full"><span>Constructing</span>
                                <textarea id="mpd_w_constructing" class="studio-textarea" rows="3"></textarea>
                            </label>
                            <label class="studio-field studio-field--full"><span>Context</span>
                                <textarea id="mpd_w_context" class="studio-textarea" rows="3"></textarea>
                            </label>
                            <label class="studio-field studio-field--full"><span>Quote</span>
                                <input type="text" id="mpd_w_quote" class="studio-input" />
                            </label>
                        </div>
                    </section>

                    <section class="member-profile-dashboard__card" id="mpd-links">
                        <h2>Links</h2>
                        <p class="studio-muted">Website, social, and other links shown on your profile.</p>
                        <div id="mpd-links"></div>
                        <button type="button" class="studio-btn-ghost" id="mpd_links_add">Add link</button>
                    </section>

                    <section class="member-profile-dashboard__card" id="mpd-seo">
                        <h2>Discovery (SEO)</h2>
                        <p class="studio-muted">Title and description for search and sharing (this language).</p>
                        <div class="studio-form-grid">
                            <label class="studio-field studio-field--full"><span>SEO title</span>
                                <input type="text" id="mpd_seo_title" class="studio-input" />
                            </label>
                            <label class="studio-field studio-field--full"><span>SEO description</span>
                                <textarea id="mpd_seo_desc" class="studio-textarea" rows="3" maxlength="320"></textarea>
                            </label>
                        </div>
                    </section>

                    <section class="member-profile-dashboard__card" id="mpd-programs">
                        <h2>Programs</h2>
                        <p class="studio-muted">Program associations are usually managed by Fusion. Shown for reference.</p>
                        <p id="mpd_programs_readonly" class="studio-muted" style="margin:0;font-family:ui-monospace,monospace;font-size:0.85rem"></p>
                    </section>

                    ${
                        DEV_MODE
                            ? `<details class="member-profile-dashboard__card" id="mpd-dev">
                        <summary style="cursor:pointer;font-variation-settings:var(--fv-subtitle)">Developer — raw locales JSON</summary>
                        <textarea id="mpd_dev_json" class="studio-textarea studio-textarea-mono" rows="14" readonly spellcheck="false" style="margin-top:0.75rem;width:100%"></textarea>
                    </details>`
                            : ''
                    }
                </div>
            </div>
        </div>
        <div class="member-profile-dashboard__sticky-footer" id="mpd_footer" hidden>
            <span id="settingsProfileStatus" class="studio-muted" role="status"></span>
            <div class="member-profile-dashboard__footer-actions">
                <button type="button" class="studio-btn-ghost" id="settingsProfileDiscard">Discard changes</button>
                <button type="button" class="studio-btn-primary" id="settingsProfileSave">Save changes</button>
            </div>
        </div>
    `;
}

/**
 * @param {Record<string, unknown>} locales
 * @param {'en'|'ja'} active
 * @param {string} heroUrl
 */
function snapshotState(locales, active, heroUrl) {
    return JSON.stringify({ locales, active, hero: heroUrl });
}

/** @type {((e: BeforeUnloadEvent) => void) | null} */
let _mpdBeforeUnloadHandler = null;

export default function initSettingsProfile() {
    /** @type {'en'|'ja'} */
    let activeLocale = 'en';
    /** @type {Record<string, unknown> | null} */
    let localesState = null;
    let heroImageUrl = '';
    /** @type {string} */
    let baselineSnapshot = '';
    /** @type {string} */
    let profileSlug = '';

    const statusEl = document.getElementById('settingsProfileStatus');
    const footer = document.getElementById('mpd_footer');
    const formWrap = document.getElementById('settingsProfileFormWrap');

    const setStatus = (t) => {
        if (statusEl) statusEl.textContent = t || '';
    };

    const isDirty = () => {
        if (!localesState) return false;
        const merged = readLocalesFromDom(localesState, activeLocale, getVal);
        const cur = snapshotState(merged, activeLocale, getVal('mpd_hero_url').trim());
        return cur !== baselineSnapshot;
    };

    const refreshBaseline = () => {
        if (!localesState) return;
        const merged = readLocalesFromDom(localesState, activeLocale, getVal);
        heroImageUrl = getVal('mpd_hero_url').trim();
        baselineSnapshot = snapshotState(merged, activeLocale, heroImageUrl);
    };

    const updateHeroPreview = () => {
        const u = getVal('mpd_hero_url');
        const heroPrev = /** @type {HTMLImageElement | null} */ (document.getElementById('mpd_hero_preview'));
        if (heroPrev) {
            if (u) {
                heroPrev.src = u;
                heroPrev.style.display = 'block';
            } else {
                heroPrev.removeAttribute('src');
                heroPrev.style.display = 'none';
            }
        }
    };

    const rootEl = document.getElementById('mpd_root');
    if (rootEl && !rootEl.dataset.mpdDelegated) {
        rootEl.dataset.mpdDelegated = '1';
        rootEl.addEventListener('click', (e) => {
            const t = e.target;
            if (t && 'id' in t && t.id === 'mpd_links_add') {
                const cur = readLinksFromContainer('#mpd-links');
                cur.push({ type: 'website', url: '', label: '' });
                renderLinkRows(cur);
            }
        });
        rootEl.addEventListener('input', (e) => {
            const t = e.target;
            if (t && 'id' in t && t.id === 'mpd_hero_url') updateHeroPreview();
        });
        rootEl.addEventListener('change', async (e) => {
            const t = e.target;
            if (!(t instanceof HTMLInputElement)) return;
            if (t.id === 'mpd_hero_file' && t.files?.[0]) {
                const f = t.files[0];
                try {
                    setStatus('Uploading hero…');
                    const url = await uploadBlobToS3(f, null, { area: 'account/profile' });
                    setVal('mpd_hero_url', url);
                    heroImageUrl = url;
                    updateHeroPreview();
                    setStatus('');
                } catch (err) {
                    setStatus(err instanceof Error ? err.message : String(err));
                }
                t.value = '';
                return;
            }
            const slot = t.getAttribute('data-intro-slot');
            if (slot != null && t.files?.[0]) {
                const i = Number(slot);
                const f = t.files[0];
                try {
                    setStatus('Uploading…');
                    const url = await uploadBlobToS3(f, null, { area: 'account/profile' });
                    setVal(`mpd_intro_${i}_src`, url);
                    const th = /** @type {HTMLImageElement | null} */ (
                        document.getElementById(`mpd_intro_${i}_thumb`)
                    );
                    if (th) {
                        th.src = url;
                        th.style.display = 'block';
                    }
                    setStatus('');
                } catch (err) {
                    setStatus(err instanceof Error ? err.message : String(err));
                }
                t.value = '';
            }
        });
    }

    const load = async () => {
        setStatus('');
        const snap = await getAuthSnapshot();
        const isTest = getDataSource() === 'test';

        const testPicker = document.getElementById('settingsTestPicker');
        const testSelect = /** @type {HTMLSelectElement | null} */ (
            document.getElementById('settingsTestArtistSelect')
        );
        if (isTest && testPicker && testSelect) {
            testPicker.style.display = '';
            testSelect.replaceChildren();
            const opt0 = document.createElement('option');
            opt0.value = '';
            opt0.textContent = '— Select artist —';
            testSelect.appendChild(opt0);
            const artists = await getArtists();
            for (const a of artists) {
                const o = document.createElement('option');
                o.value = String(a.id);
                o.textContent = `${a.locales?.en?.name || a.slug || a.id} (${a.slug})`;
                testSelect.appendChild(o);
            }
            const cur = getProfileSettingsDevArtistId();
            if (cur) testSelect.value = cur;
            testSelect.onchange = () => {
                setProfileSettingsDevArtistId(testSelect.value || null);
                void load();
            };
        } else if (testPicker) {
            testPicker.style.display = 'none';
        }

        const hint = document.getElementById('settingsProfileHint');
        if (!isTest && !snap.authenticated) {
            if (hint) hint.textContent = 'Sign in with Internet Identity to edit your linked artist profile.';
            if (formWrap) formWrap.setAttribute('hidden', '');
            if (footer) footer.setAttribute('hidden', '');
            document.title = 'Profile settings · Fusion';
            return;
        }

        if (isTest && !getProfileSettingsDevArtistId()) {
            if (hint) hint.textContent = 'Select which roster artist to edit (test data source).';
            if (formWrap) formWrap.setAttribute('hidden', '');
            if (footer) footer.setAttribute('hidden', '');
            document.title = 'Profile settings · Fusion';
            return;
        }

        const rec = await getMyArtistRecord();
        if (!rec) {
            if (hint) {
                hint.textContent =
                    'No linked artist profile for this account. Ask Fusion to link your roster row in Studio.';
            }
            if (formWrap) formWrap.setAttribute('hidden', '');
            if (footer) footer.setAttribute('hidden', '');
            document.title = 'Profile settings · Fusion';
            return;
        }

        const prof = rec.profile && typeof rec.profile === 'object' ? rec.profile : {};
        const p = /** @type {Record<string, unknown>} */ (prof);
        profileSlug = String(p.slug ?? '');
        const ljRaw = rec.locales_json ?? rec.localesJson;
        const json = typeof ljRaw === 'string' ? ljRaw : '';
        try {
            localesState = json ? JSON.parse(json) : { en: {}, ja: {} };
        } catch {
            localesState = { en: {}, ja: {} };
        }
        if (!localesState || typeof localesState !== 'object') localesState = { en: {}, ja: {} };

        heroImageUrl = String(p.image ?? '');
        setVal('mpd_hero_url', heroImageUrl);
        updateHeroPreview();

        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const pub = document.getElementById('mpd_public_url');
        if (pub && 'value' in pub) pub.value = `${origin}/profile/${encodeURIComponent(profileSlug)}`;
        const vu = document.getElementById('mpd_view_profile');
        if (vu && vu instanceof HTMLAnchorElement) vu.href = `/profile/${encodeURIComponent(profileSlug)}`;
        const ua = document.getElementById('mpd_updated_at');
        if (ua && 'value' in ua) ua.value = String(p.updatedAt ?? '');

        const side = document.getElementById('mpd_sidebar_slug');
        if (side) side.textContent = profileSlug ? `/${profileSlug}` : '—';

        if (hint) {
            hint.textContent =
                'Edit your public-facing profile. Admin-only roster fields (visibility, feeds) stay in Studio.';
        }
        if (formWrap) formWrap.removeAttribute('hidden');
        if (footer) footer.removeAttribute('hidden');

        const pill = document.getElementById('mpd_datasource_pill');
        if (pill && isTest) {
            pill.style.display = '';
            pill.textContent = 'Data: test JSON (localStorage overlays)';
        } else if (pill) {
            pill.style.display = 'none';
        }

        document.querySelectorAll('.mpd-locale-tab').forEach((btn) => {
            btn.classList.toggle('is-active', btn.getAttribute('data-locale') === activeLocale);
        });
        fillFormFromLocales(/** @type {Record<string, unknown>} */ (localesState), activeLocale);

        refreshBaseline();

        document.title = 'Profile settings · Fusion';
    };

    document.querySelectorAll('.mpd-locale-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
            if (!localesState) return;
            const next = /** @type {'en'|'ja'} */ (btn.getAttribute('data-locale') === 'ja' ? 'ja' : 'en');
            localesState = readLocalesFromDom(
                /** @type {Record<string, unknown>} */ (localesState),
                activeLocale,
                getVal
            );
            activeLocale = next;
            document.querySelectorAll('.mpd-locale-tab').forEach((b) => {
                b.classList.toggle('is-active', b.getAttribute('data-locale') === activeLocale);
            });
            fillFormFromLocales(/** @type {Record<string, unknown>} */ (localesState), activeLocale);
        });
    });

    document.getElementById('mpd_copy_intro_ja')?.addEventListener('click', () => {
        if (!localesState) return;
        localesState = readLocalesFromDom(
            /** @type {Record<string, unknown>} */ (localesState),
            activeLocale,
            getVal
        );
        localesState = /** @type {Record<string, unknown>} */ (copyIntroGalleryEnToJa(localesState));
        fillFormFromLocales(/** @type {Record<string, unknown>} */ (localesState), activeLocale);
        setStatus('Intro images copied from English to Japanese.');
    });

    document.getElementById('settingsProfileSave')?.addEventListener('click', async () => {
        if (!localesState) return;
        setStatus('Saving…');
        try {
            localesState = readLocalesFromDom(
                /** @type {Record<string, unknown>} */ (localesState),
                activeLocale,
                getVal
            );
            const merged = normalizeLocalesWorldForStorage(
                /** @type {Record<string, unknown>} */ (localesState)
            );
            localesState = merged;
            const ts = new Date().toISOString();
            const prevHero = heroImageUrl;
            const heroUrl = getVal('mpd_hero_url').trim();
            await updateMyArtistLocalesJson(JSON.stringify(merged), ts);
            if (heroUrl !== prevHero) {
                await updateMyArtistProfilePatch(heroUrl, ts);
            }
            heroImageUrl = heroUrl;
            const ua = document.getElementById('mpd_updated_at');
            if (ua && 'value' in ua) ua.value = ts;
            refreshBaseline();
            setStatus('Saved.');
        } catch (e) {
            setStatus(e instanceof Error ? e.message : String(e));
        }
    });

    document.getElementById('settingsProfileDiscard')?.addEventListener('click', () => {
        void load();
    });

    const onBeforeUnload = (e) => {
        if (isDirty()) {
            e.preventDefault();
            e.returnValue = '';
        }
    };
    if (_mpdBeforeUnloadHandler) {
        window.removeEventListener('beforeunload', _mpdBeforeUnloadHandler);
    }
    _mpdBeforeUnloadHandler = onBeforeUnload;
    window.addEventListener('beforeunload', onBeforeUnload);

    void load();
    window.addEventListener('fusion-auth-change', () => void load());
    window.addEventListener('fusion-data-source-change', () => void load());
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void load();
    });
}
