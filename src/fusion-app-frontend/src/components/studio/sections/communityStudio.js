/**
 * Studio → Content → Community: tabbed editor for `/community` JSON blob.
 */
import {
    adminGetCommunityPageStudio,
    adminSetCommunityPageStudio,
    getCommunityArtistsForStudio,
    getCommunityDataMode,
    getCommunityFeaturedVideosStudio,
    listCommunityVideosStudio,
} from '../../../utils/database.js';
import { toCloudFrontAssetUrl } from '../../../utils/assetDistribution.js';
import { studioPageHeaderHtml } from '../../../utils/studioCategoryLayout.js';
import { studioFeatureAccess } from '../../../utils/studioShellState.js';
import { featuredCardHtml } from './videosStudio.js';
import { parseVideoLocales, resolveFeaturedVideos } from '../../../utils/videoPageModel.js';

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function timestampToInput(sec) {
    const n = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(n / 60);
    const s = n % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function timestampFromInput(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return 0;
    if (/^\d+(\.\d+)?$/.test(raw)) return Math.max(0, Math.floor(Number(raw)));
    const parts = raw.split(':').map((part) => Number(part));
    if (parts.some((part) => !Number.isFinite(part))) return 0;
    if (parts.length === 2) return Math.max(0, Math.floor(parts[0] * 60 + parts[1]));
    if (parts.length === 3) return Math.max(0, Math.floor(parts[0] * 3600 + parts[1] * 60 + parts[2]));
    return 0;
}

function artistLabel(artist) {
    const locales = artist?.locales && typeof artist.locales === 'object' ? artist.locales : {};
    const en = /** @type {Record<string, unknown>} */ (locales).en;
    const local = en && typeof en === 'object' ? en : {};
    return String(local.name ?? artist?.name ?? artist?.slug ?? artist?.id ?? 'Artist');
}

function renderArtistOptions(artists, selectedId) {
    const selected = String(selectedId ?? '');
    const sorted = [...(Array.isArray(artists) ? artists : [])].sort((a, b) =>
        artistLabel(a).localeCompare(artistLabel(b), undefined, { sensitivity: 'base' })
    );
    return `
        <option value="">Select artist</option>
        ${sorted.map((artist) => {
            const id = String(artist?.id ?? '');
            return `<option value="${escapeHtml(id)}" ${id === selected ? 'selected' : ''}>${escapeHtml(artistLabel(artist))}</option>`;
        }).join('')}
    `;
}

function renderChapterRows(featureKey, chapters, artists, title = 'Artist timestamps', hint = 'Each row links a video timestamp to an artist in the roster. The public hero will derive the micro profile automatically.') {
    const rows = (Array.isArray(chapters) ? chapters : []).map((raw, i) => {
        const c = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
        return `
            <div class="studio-form-grid studio-community__chapter-row" data-chapter-row="${escapeHtml(featureKey)}">
                <label class="studio-field">
                    <span>Artist</span>
                    <select class="studio-select st-com-chapter-artist">
                        ${renderArtistOptions(artists, c.artistId)}
                    </select>
                </label>
                <label class="studio-field">
                    <span>Timestamp</span>
                    <input type="text" class="studio-input st-com-chapter-time" value="${escapeHtml(timestampToInput(c.timestampSec))}" placeholder="1:12" />
                </label>
                <div class="studio-field">
                    <span>&nbsp;</span>
                    <button type="button" class="studio-btn-ghost st-com-chapter-del" data-feature="${escapeHtml(featureKey)}" data-chapter-index="${i}">Remove</button>
                </div>
            </div>
        `;
    }).join('');
    return `
        <div class="studio-community__chapters">
            <h4 class="studio-subheading studio-community__subhead">${escapeHtml(title)}</h4>
            <p class="studio-muted">${escapeHtml(hint)}</p>
            ${rows || '<p class="studio-muted">No timestamps yet.</p>'}
            <button type="button" class="studio-btn-ghost st-com-chapter-add" data-feature="${escapeHtml(featureKey)}">Add timestamp</button>
        </div>
    `;
}

function renderTopicRows(featureKey, topics, title = 'Idea timestamps', hint = 'Each row adds a localized topic or quote timestamp for videos that are organized by ideas instead of people.') {
    const rows = (Array.isArray(topics) ? topics : []).map((raw, i) => {
        const t = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
        return `
            <div class="studio-field-group studio-community__card" data-topic-row="${escapeHtml(featureKey)}">
                <div class="studio-form-grid">
                    <label class="studio-field">
                        <span>Timestamp</span>
                        <input type="text" class="studio-input st-com-topic-time" value="${escapeHtml(timestampToInput(t.timestampSec))}" placeholder="1:12" />
                    </label>
                    <label class="studio-field">
                        <span>Title EN</span>
                        <input type="text" class="studio-input st-com-topic-title-en" value="${escapeHtml(String(t.titleEn ?? ''))}" />
                    </label>
                    <label class="studio-field">
                        <span>Title JA</span>
                        <input type="text" class="studio-input st-com-topic-title-ja" value="${escapeHtml(String(t.titleJa ?? ''))}" />
                    </label>
                </div>
                <label class="studio-field">
                    <span>Quote/description EN</span>
                    <textarea class="studio-input st-com-topic-quote-en" rows="2">${escapeHtml(String(t.quoteEn ?? ''))}</textarea>
                </label>
                <label class="studio-field">
                    <span>Quote/description JA</span>
                    <textarea class="studio-input st-com-topic-quote-ja" rows="2">${escapeHtml(String(t.quoteJa ?? ''))}</textarea>
                </label>
                <button type="button" class="studio-btn-ghost st-com-topic-del" data-feature="${escapeHtml(featureKey)}" data-topic-index="${i}">Remove topic</button>
            </div>
        `;
    }).join('');
    return `
        <div class="studio-community__chapters">
            <h4 class="studio-subheading studio-community__subhead">${escapeHtml(title)}</h4>
            <p class="studio-muted">${escapeHtml(hint)}</p>
            ${rows || '<p class="studio-muted">No idea timestamps yet.</p>'}
            <button type="button" class="studio-btn-ghost st-com-topic-add" data-feature="${escapeHtml(featureKey)}">Add idea timestamp</button>
        </div>
    `;
}

function renderTimestampEditor(featureKey, feature, artists) {
    const item = feature && typeof feature === 'object' ? /** @type {Record<string, unknown>} */ (feature) : {};
    const previewChapters = Array.isArray(item.previewChapters) ? item.previewChapters : item.chapters;
    const previewTopics = Array.isArray(item.previewTopics) ? item.previewTopics : item.topics;
    const fullChapters = Array.isArray(item.fullChapters) ? item.fullChapters : [];
    const fullTopics = Array.isArray(item.fullTopics) ? item.fullTopics : [];
    return `
        <div class="studio-community__timestamp-shell">
            <details class="studio-community__timestamp-group" open>
                <summary>
                    <span>Preview video timestamps</span>
                    <small>Shown to non-members and teaser viewers.</small>
                </summary>
                <div class="studio-community__timestamp-grid">
                    ${renderChapterRows(`${featureKey}-preview`, previewChapters, artists, 'People', 'Artist moments for the public preview.')}
                    ${renderTopicRows(`${featureKey}-preview`, previewTopics, 'Ideas', 'Topic or quote timestamps for the public preview.')}
                </div>
            </details>
            <details class="studio-community__timestamp-group">
                <summary>
                    <span>Full video timestamps</span>
                    <small>Shown after the members-only full video unlocks.</small>
                </summary>
                <div class="studio-community__timestamp-grid">
                    ${renderChapterRows(`${featureKey}-full`, fullChapters, artists, 'People', 'Artist moments for the full members-only video.')}
                    ${renderTopicRows(`${featureKey}-full`, fullTopics, 'Ideas', 'Topic or quote timestamps for the full members-only video.')}
                </div>
            </details>
        </div>
    `;
}

function sleep(ms) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

function comparableAssetUrl(url) {
    return toCloudFrontAssetUrl(url).trim();
}

/**
 * @param {Record<string, unknown>} item
 */
function exclusiveTabSuffix(item) {
    const badges = [];
    if (item.isHero === true) badges.push('Hero');
    if (item.visible === false) badges.push('Hidden');
    return badges.length ? ` · ${badges.join(' · ')}` : '';
}

/**
 * @param {string} label
 */
function exclusiveTabLabelBase(label) {
    return String(label ?? '').replace(/\s·\s(Hero|Hidden)(?:\s·\s(Hero|Hidden))*$/, '').trim();
}

/** @returns {string} */
export function renderCommunitySection() {
    const tabs = [
        ['overview', 'Overview'],
        ['featured', 'Featured'],
        ['connect', 'Connect'],
        ['network', 'Network'],
        ['sessions', 'Sessions'],
        ['promo', 'Promo'],
    ];
    return `
        <div class="studio-section-stack studio-category-page studio-community">
            ${studioPageHeaderHtml({
                title: 'Community',
                subtitle: '/community landing — featured videos, connect, network cards, sessions, promo',
                countId: 'studio-community-header-count',
                countLabel: '',
            })}
            <p id="studio-community-msg" class="studio-banner studio-banner--info" style="display:none"></p>
            <div class="studio-community__workspace" data-studio-tabs="community">
                <nav class="studio-community__tabs" role="tablist" aria-label="Community editor sections">
                    ${tabs.map(([key, label], i) => `
                        <button type="button" class="studio-tabs__tab studio-community__tab ${i === 0 ? 'is-active' : ''}" role="tab" aria-selected="${i === 0 ? 'true' : 'false'}" aria-controls="studio-community-panel-${key}">
                            ${escapeHtml(label)}
                        </button>
                    `).join('')}
                </nav>
                <div class="studio-community__panels">
                    ${tabs.map(([key, label], i) => `
                        <section class="studio-tabs__panel studio-community__section ${i === 0 ? 'is-active' : ''}" id="studio-community-panel-${key}" role="tabpanel" ${i === 0 ? '' : 'hidden'} aria-label="${escapeHtml(label)}">
                            <div id="studio-com-form-${key}" class="studio-community__form"></div>
                        </section>
                    `).join('')}
                </div>
            </div>
            <div class="studio-community__actions">
                <div class="studio-toolbar-actions">
                    <button type="button" class="studio-btn-primary" id="studio-community-save">Save community page</button>
                </div>
            </div>
        </div>
    `;
}

const COMMUNITY_SECTION_TOGGLES = [
    ['hero', 'Landing hero'],
    ['exclusive', 'Exclusive content row'],
    ['connect', 'Connect section'],
    ['network', 'Network cards'],
    ['sessions', 'Upcoming sessions'],
    ['promo', 'Promo block'],
    ['join', 'Join network CTA'],
];

/**
 * @param {unknown} sections
 * @param {string} key
 */
function communitySectionActive(sections, key) {
    return !sections || typeof sections !== 'object'
        ? true
        : /** @type {Record<string, unknown>} */ (sections)[key] !== false;
}

/**
 * @param {Record<string, unknown>} bundle
 * @param {{ featuredCount: number, heroLabel: string }} featuredSummary
 */
function renderSectionToggles(bundle, featuredSummary) {
    const sections = bundle.sections && typeof bundle.sections === 'object' ? bundle.sections : {};
    const activeCount = COMMUNITY_SECTION_TOGGLES.filter(([key]) => communitySectionActive(sections, key)).length;
    return `
        <div class="studio-community__section-head">
            <p class="studio-kicker">Page map</p>
            <h3 class="studio-subheading">Community page structure</h3>
            <p class="studio-muted">Start here to decide what appears publicly. Featured videos and landing hero are managed in the Featured tab or Content → Videos.</p>
        </div>
        <div class="studio-community__overview-grid">
            <div class="studio-community__summary-card">
                <strong>${activeCount}/${COMMUNITY_SECTION_TOGGLES.length}</strong>
                <span>Sections active</span>
            </div>
            <div class="studio-community__summary-card">
                <strong>${escapeHtml(String(featuredSummary.featuredCount))}/6</strong>
                <span>Featured videos</span>
            </div>
            <div class="studio-community__summary-card">
                <strong>${escapeHtml(featuredSummary.heroLabel)}</strong>
                <span>Landing hero</span>
            </div>
            <div class="studio-community__summary-card">
                <strong>${escapeHtml(String(Array.isArray(bundle.sessions) ? bundle.sessions.length : 0))}</strong>
                <span>Sessions listed</span>
            </div>
        </div>
        <div class="studio-community__toggle-grid">
            ${COMMUNITY_SECTION_TOGGLES.map(
                ([key, label]) => `
                    <label class="studio-community__toggle-card">
                        <input type="checkbox" id="st-com-section-${key}" ${communitySectionActive(sections, key) ? 'checked' : ''} />
                        <span>
                            <strong>${escapeHtml(label)}</strong>
                            <small>${communitySectionActive(sections, key) ? 'Visible on public page' : 'Hidden from public page'}</small>
                        </span>
                    </label>
                `,
            ).join('')}
        </div>
    `;
}

/**
 * @param {Record<string, unknown>} c
 * @param {number} i
 * @param {Array<Record<string, unknown>>} artists
 * @param {(id: string, label: string, val: unknown) => string} field
 */
function renderExclusiveFeatureCard(c, i, artists, field) {
    const n = i + 1;
    const visible = c.visible !== false;
    const isHero = c.isHero === true;
    const image = String(c.imageUrl ?? c.posterUrl ?? '').trim();
    const headline = String(c.headlineEn ?? c.lineEn ?? `Feature ${n}`).trim();
    const line = String(c.lineEn ?? '').trim();
    return `
            <article class="studio-community__feature-card${visible ? '' : ' studio-community__feature-card--hidden'}">
                <label class="studio-community__feature-visible">
                    <input type="checkbox" id="st-com-ex-${i}-hero" ${isHero ? 'checked' : ''} data-feature-hero="${i}" />
                    <span>
                        <strong>Use as landing hero</strong>
                        <small>${isHero ? 'Shown as the main community video on page load' : 'Select to use this feature as the landing hero'}</small>
                    </span>
                </label>
                <label class="studio-community__feature-visible">
                    <input type="checkbox" id="st-com-ex-${i}-visible" ${visible ? 'checked' : ''} data-feature-visible="${i}" ${isHero ? 'disabled' : ''} />
                    <span>
                        <strong>Visible on community page</strong>
                        <small>${isHero ? 'Landing hero is always visible in the exclusive row' : visible ? 'Shown in the exclusive content row' : 'Hidden from the public page'}</small>
                    </span>
                </label>
                <div class="studio-community__feature-preview" style="${image ? `background-image:url(${escapeHtml(image)})` : ''}">
                    <div>
                        <span>Feature ${n}</span>
                        <strong>${escapeHtml(headline)}</strong>
                        <small>${escapeHtml(line || 'Add a short content line.')}</small>
                    </div>
                </div>
                <details class="studio-community__feature-details" open>
                    <summary>Media</summary>
                    <div class="studio-community__editorial">
                        <label class="studio-field"><span>Image URL</span><input type="text" id="st-com-ex-${i}-img" class="studio-input" value="${escapeHtml(String(c.imageUrl ?? ''))}" /></label>
                        ${field(`st-com-ex-${i}-poster`, 'Poster image URL', c.posterUrl)}
                        ${field(`st-com-ex-${i}-preview-video`, 'Public preview video URL', c.previewVideoUrl)}
                        ${field(`st-com-ex-${i}-full-key`, 'Members-only full video key', c.fullVideoKey)}
                        <p class="studio-muted studio-community__field-hint">Object key in storage, not a CDN URL. Example: <code>fusionMedia/private-video/Rodolfo-Full.mp4</code>. Use the key from “Upload full video” or paste a migrated key.</p>
                        ${field(`st-com-ex-${i}-full-name`, 'Members-only full video file name', c.fullVideoFileName)}
                    </div>
                    <div class="studio-community__file-actions">
                        <label class="studio-file-label studio-btn-ghost" for="st-com-ex-${i}-image-file">
                            <input type="file" id="st-com-ex-${i}-image-file" accept="image/*" class="studio-file-input" data-feature-index="${i}" data-upload-kind="image" />
                            Upload image
                        </label>
                        <label class="studio-file-label studio-btn-ghost" for="st-com-ex-${i}-poster-file">
                            <input type="file" id="st-com-ex-${i}-poster-file" accept="image/*" class="studio-file-input" data-feature-index="${i}" data-upload-kind="poster" />
                            Upload poster
                        </label>
                        <label class="studio-file-label studio-btn-ghost" for="st-com-ex-${i}-preview-file">
                            <input type="file" id="st-com-ex-${i}-preview-file" accept="video/*,.mp4,.webm,.mov" class="studio-file-input" data-feature-index="${i}" data-upload-kind="preview" />
                            Upload preview video
                        </label>
                        <label class="studio-file-label studio-btn-ghost" for="st-com-ex-${i}-full-file">
                            <input type="file" id="st-com-ex-${i}-full-file" accept="video/*,.mp4,.webm,.mov" class="studio-file-input" data-feature-index="${i}" data-upload-kind="full" />
                            Upload full video
                        </label>
                    </div>
                </details>
                <details class="studio-community__feature-details" open>
                    <summary>Copy</summary>
                    <div class="studio-community__editorial">
                        <label class="studio-field"><span>Line EN</span><input type="text" id="st-com-ex-${i}-en" class="studio-input" value="${escapeHtml(String(c.lineEn ?? ''))}" /></label>
                        <label class="studio-field"><span>Line JA</span><input type="text" id="st-com-ex-${i}-ja" class="studio-input" value="${escapeHtml(String(c.lineJa ?? ''))}" /></label>
                        ${field(`st-com-ex-${i}-k-en`, 'Kicker EN', c.kickerEn)}
                        ${field(`st-com-ex-${i}-k-ja`, 'Kicker JA', c.kickerJa)}
                        ${field(`st-com-ex-${i}-h-en`, 'Headline EN', c.headlineEn)}
                        ${field(`st-com-ex-${i}-h-ja`, 'Headline JA', c.headlineJa)}
                        <label class="studio-field"><span>Body EN</span><textarea id="st-com-ex-${i}-b-en" class="studio-input" rows="3">${escapeHtml(String(c.bodyEn ?? ''))}</textarea></label>
                        <label class="studio-field"><span>Body JA</span><textarea id="st-com-ex-${i}-b-ja" class="studio-input" rows="3">${escapeHtml(String(c.bodyJa ?? ''))}</textarea></label>
                        ${field(`st-com-ex-${i}-cta-join-en`, 'CTA Join EN', c.ctaJoinLabelEn)}
                        ${field(`st-com-ex-${i}-cta-join-ja`, 'CTA Join JA', c.ctaJoinLabelJa)}
                        ${field(`st-com-ex-${i}-cta-watch-en`, 'CTA Watch EN', c.ctaWatchLabelEn)}
                        ${field(`st-com-ex-${i}-cta-watch-ja`, 'CTA Watch JA', c.ctaWatchLabelJa)}
                    </div>
                </details>
                <details class="studio-community__feature-details">
                    <summary>Timestamps</summary>
                    ${renderTimestampEditor(`ex-${i}`, c, artists)}
                </details>
                <details class="studio-community__advanced">
                    <summary>Advanced fallback fields</summary>
                    <div class="studio-community__editorial">
                        ${field(`st-com-ex-${i}-video`, 'Legacy public video URL', c.videoUrl)}
                        ${field(`st-com-ex-${i}-ov-title`, 'Overlay line 1', c.overlayTitle)}
                        ${field(`st-com-ex-${i}-ov-guests`, 'Overlay guests', c.overlayGuests)}
                        ${field(`st-com-ex-${i}-ov-dur`, 'Overlay duration text', c.overlayDuration)}
                    </div>
                </details>
            </article>`;
}

/**
 * @param {Record<string, unknown>} bundle
 * @param {Array<Record<string, unknown>>} artists
 * @param {number} [activeIndex]
 */
function renderExclusiveForm(bundle, artists, activeIndex = 0) {
    const ex = Array.isArray(bundle.exclusive) ? bundle.exclusive : [{}, {}, {}, {}, {}, {}];
    while (ex.length < 6) ex.push({});
    const field = (id, label, val) => `
        <label class="studio-field">
            <span>${escapeHtml(label)}</span>
            <input type="text" id="${id}" class="studio-input" value="${escapeHtml(String(val ?? ''))}" />
        </label>`;
    const safeActive = Number.isInteger(activeIndex) && activeIndex >= 0 && activeIndex < 6 ? activeIndex : 0;
    const tabs = ex.slice(0, 6).map((raw, i) => {
        const c = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
        const label = String(c.headlineEn ?? c.lineEn ?? `Feature ${i + 1}`).trim() || `Feature ${i + 1}`;
        const hidden = c.visible === false;
        const suffix = exclusiveTabSuffix(c);
        return `
            <button type="button" class="studio-community__feature-tab ${i === safeActive ? 'is-active' : ''}${hidden ? ' studio-community__feature-tab--hidden' : ''}" role="tab" aria-selected="${i === safeActive ? 'true' : 'false'}" aria-controls="studio-com-ex-panel-${i}" data-feature-tab="${i}">
                ${escapeHtml(label.length > 28 ? `${label.slice(0, 28)}…` : label)}${suffix}
            </button>`;
    });
    const panels = ex.slice(0, 6).map((raw, i) => {
        const c = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
        return `
            <section id="studio-com-ex-panel-${i}" class="studio-community__feature-panel ${i === safeActive ? 'is-active' : ''}" role="tabpanel" ${i === safeActive ? '' : 'hidden'} aria-label="Feature ${i + 1}">
                ${renderExclusiveFeatureCard(c, i, artists, field)}
            </section>`;
    });
    return `
        <div class="studio-community__panel-intro">
            <div>
                <p class="studio-kicker">Exclusive</p>
                <h3 class="studio-subheading">Featured content cards</h3>
                <p class="studio-muted">Upload media and copy once per feature. Check one feature as the landing hero; visitors can still click other cards to preview them in the hero.</p>
            </div>
        </div>
        <div class="studio-community__exclusive-workspace" data-studio-tabs="community-exclusive">
            <nav class="studio-community__feature-tabs" role="tablist" aria-label="Exclusive features">
                ${tabs.join('')}
            </nav>
            <div class="studio-community__feature-panels">
                ${panels.join('')}
            </div>
        </div>
    `;
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
            <fieldset class="studio-field-group studio-community__card studio-community__bite-card">
                <legend>${escapeHtml(String(b.titleEn || `Bite ${i + 1}`))}</legend>
                <label class="studio-field"><span>Title EN</span><input type="text" id="st-com-cn-b${i}-ten" class="studio-input" value="${escapeHtml(String(b.titleEn ?? ''))}" /></label>
                <label class="studio-field"><span>Title JA</span><input type="text" id="st-com-cn-b${i}-tja" class="studio-input" value="${escapeHtml(String(b.titleJa ?? ''))}" /></label>
                <label class="studio-field"><span>Body EN</span><textarea id="st-com-cn-b${i}-ben" class="studio-input" rows="2">${escapeHtml(String(b.bodyEn ?? ''))}</textarea></label>
                <label class="studio-field"><span>Body JA</span><textarea id="st-com-cn-b${i}-bja" class="studio-input" rows="2">${escapeHtml(String(b.bodyJa ?? ''))}</textarea></label>
            </fieldset>`;
    });
    return `
        <div class="studio-community__panel-intro">
            <div>
                <p class="studio-kicker">Connect</p>
                <h3 class="studio-subheading">Communication blocks</h3>
                <p class="studio-muted">Group the public communication copy by purpose: headline, routes, then the three bite-sized explanations.</p>
            </div>
        </div>
        <section class="studio-community__edit-card">
            <h4>Section heading</h4>
            <div class="studio-community__editorial">
                <label class="studio-field"><span>Title EN</span><input type="text" id="st-com-cn-t-en" class="studio-input" value="${escapeHtml(String(d.titleEn ?? ''))}" /></label>
                <label class="studio-field"><span>Title JA</span><input type="text" id="st-com-cn-t-ja" class="studio-input" value="${escapeHtml(String(d.titleJa ?? ''))}" /></label>
            </div>
        </section>
        <section class="studio-community__edit-card">
            <h4>Links</h4>
            <div class="studio-community__editorial">
                <label class="studio-field"><span>How it works URL</span><input type="text" id="st-com-cn-hiw-h" class="studio-input" value="${escapeHtml(String(d.howItWorksHref ?? ''))}" /></label>
                <label class="studio-field"><span>How it works label EN</span><input type="text" id="st-com-cn-hiw-en" class="studio-input" value="${escapeHtml(String(d.howItWorksLabelEn ?? ''))}" /></label>
                <label class="studio-field"><span>How it works label JA</span><input type="text" id="st-com-cn-hiw-ja" class="studio-input" value="${escapeHtml(String(d.howItWorksLabelJa ?? ''))}" /></label>
                <label class="studio-field"><span>Browse href</span><input type="text" id="st-com-cn-br-h" class="studio-input" value="${escapeHtml(String(d.browseHref ?? ''))}" /></label>
                <label class="studio-field"><span>Browse label EN</span><input type="text" id="st-com-cn-br-en" class="studio-input" value="${escapeHtml(String(d.browseLabelEn ?? ''))}" /></label>
                <label class="studio-field"><span>Browse label JA</span><input type="text" id="st-com-cn-br-ja" class="studio-input" value="${escapeHtml(String(d.browseLabelJa ?? ''))}" /></label>
            </div>
        </section>
        <section class="studio-community__edit-card">
            <h4>How it works cards</h4>
            <div class="studio-community__bite-grid">${biteFields.join('')}</div>
        </section>
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

function renderPromoForm(bundle) {
    const pr = bundle.promo && typeof bundle.promo === 'object' ? /** @type {Record<string, unknown>} */ (bundle.promo) : {};
    return `
        <div class="studio-community__panel-intro">
            <div>
                <p class="studio-kicker">Promo</p>
                <h3 class="studio-subheading">Final community prompt</h3>
                <p class="studio-muted">Short closing copy that reinforces the invitation before the join CTA.</p>
            </div>
        </div>
        <section class="studio-community__edit-card">
            <h4>Promo copy</h4>
            <div class="studio-community__editorial">
                <label class="studio-field"><span>Headline EN</span><textarea id="st-com-pr-h-en" class="studio-input" rows="2">${escapeHtml(String(pr.headlineEn ?? ''))}</textarea></label>
                <label class="studio-field"><span>Headline JA</span><textarea id="st-com-pr-h-ja" class="studio-input" rows="2">${escapeHtml(String(pr.headlineJa ?? ''))}</textarea></label>
                <label class="studio-field"><span>Subline EN</span><input type="text" id="st-com-pr-s-en" class="studio-input" value="${escapeHtml(String(pr.sublineEn ?? ''))}" /></label>
                <label class="studio-field"><span>Subline JA</span><input type="text" id="st-com-pr-s-ja" class="studio-input" value="${escapeHtml(String(pr.sublineJa ?? ''))}" /></label>
            </div>
        </section>
    `;
}

function renderNetworkForm(bundle) {
    const net = Array.isArray(bundle.networkCards) ? bundle.networkCards : [];
    const netRows = net
        .map((raw, i) => {
            const c = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
            return `
            <tr>
                <td><strong>${escapeHtml(String(c.name || `Card ${i + 1}`))}</strong><small>${escapeHtml(String(c.role || 'Role'))}</small></td>
                <td><input type="text" class="studio-input st-com-net-name" value="${escapeHtml(String(c.name ?? ''))}" placeholder="Name" /></td>
                <td><input type="text" class="studio-input st-com-net-role" value="${escapeHtml(String(c.role ?? ''))}" /></td>
                <td><input type="text" class="studio-input st-com-net-loc" value="${escapeHtml(String(c.location ?? ''))}" /></td>
                <td><input type="text" class="studio-input st-com-net-av" value="${escapeHtml(String(c.avatarUrl ?? ''))}" placeholder="Avatar URL" /></td>
                <td><input type="text" class="studio-input st-com-net-href" value="${escapeHtml(String(c.connectHref ?? ''))}" placeholder="/…" /></td>
                <td><button type="button" class="studio-btn-ghost st-com-net-del">Remove</button></td>
            </tr>`;
        })
        .join('');
    return `
        <div class="studio-community__panel-intro">
            <div>
                <p class="studio-kicker">Network</p>
                <h3 class="studio-subheading">Member and partner cards</h3>
                <p class="studio-muted">Each row is a public card. Use clear names, roles, and paths so the row reads well before opening it.</p>
            </div>
            <button type="button" class="studio-btn-ghost" id="st-com-net-add">Add network card</button>
        </div>
        <div class="studio-table-wrap studio-table-wrap--rounded studio-community__table-wrap studio-community__summary-table">
            <table class="studio-table studio-table--dense">
                <thead><tr><th>Summary</th><th>Name</th><th>Role</th><th>Location</th><th>Avatar URL</th><th>Connect href</th><th></th></tr></thead>
                <tbody id="st-com-net-tbody">${netRows || ''}</tbody>
            </table>
        </div>
    `;
}

function renderSessionsForm(bundle) {
    const sess = Array.isArray(bundle.sessions) ? bundle.sessions : [];
    const sessRows = sess
        .map((raw, i) => {
            const s = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
            return `
            <tr>
                <td><strong>${escapeHtml(String(s.title || `Session ${i + 1}`))}</strong><small>${escapeHtml(String(s.datetimeLine || s.kindLabel || 'Date/time'))}</small></td>
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
        <div class="studio-community__panel-intro">
            <div>
                <p class="studio-kicker">Sessions</p>
                <h3 class="studio-subheading">Upcoming sessions</h3>
                <p class="studio-muted">Keep sessions scannable with strong titles and simple registration labels.</p>
            </div>
            <button type="button" class="studio-btn-ghost" id="st-com-ss-add">Add session</button>
        </div>
        <div class="studio-table-wrap studio-table-wrap--rounded studio-community__table-wrap studio-community__summary-table">
            <table class="studio-table studio-table--dense">
                <thead><tr><th>Summary</th><th>Thumb</th><th>Kind</th><th>Title</th><th>Date/time line</th><th>Reg label</th><th>Reg href</th><th></th></tr></thead>
                <tbody id="st-com-ss-tbody">${sessRows || ''}</tbody>
            </table>
        </div>
    `;
}

/**
 * @param {Record<string, unknown>[]} videos
 * @param {{ featuredVideoIds: string[], heroVideoId: string | null }} featuredCfg
 */
function renderFeaturedTab(videos, featuredCfg) {
    const featured = resolveFeaturedVideos(videos, featuredCfg);
    const heroId = featuredCfg.heroVideoId ? String(featuredCfg.heroVideoId) : '';
    const cards = featured.map((rec) =>
        featuredCardHtml(rec, true, {
            isHero: String(rec.id) === heroId,
            readOnly: true,
        }),
    );
    const heroRec = featured.find((v) => String(v.id) === heroId) || featured[0];
    const heroLocales = heroRec ? parseVideoLocales(heroRec.localesJson) : null;
    const heroLabel = heroLocales
        ? String(heroLocales.headlineEn || heroLocales.headlineJa || heroRec?.slug || 'Video')
        : featured.length
          ? 'Default (first featured)'
          : 'None';
    return `
        <div class="studio-community__panel-intro">
            <div>
                <p class="studio-kicker">Featured</p>
                <h3 class="studio-subheading">Community video row</h3>
                <p class="studio-muted">Pinned videos plus the most recently added (up to six). Manage pins and hero in <a href="/studio#videos">Content → Videos</a>.</p>
            </div>
            <a class="studio-btn-primary" href="/studio#videos">Open Videos workspace</a>
        </div>
        <div class="studio-community__summary-card studio-community__featured-hero-summary">
            <strong>${escapeHtml(heroLabel)}</strong>
            <span>Landing hero on /community</span>
        </div>
        <div class="studio-videos-featured-grid studio-community__featured-preview" id="studio-com-featured-rail">
            ${cards.length ? cards.join('') : '<p class="studio-muted">No videos in the library yet. Add videos in Content → Videos.</p>'}
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

    const perm = studioFeatureAccess('community');
    if (!perm.canEdit) {
        show('You do not have permission to edit Community.', 'warn');
        return;
    }

    /** @type {Record<string, unknown>} */
    let bundle = {};
    /** @type {Array<Record<string, unknown>>} */
    let studioArtists = [];
    /** @type {Record<string, unknown>[]} */
    let communityVideos = [];
    /** @type {{ featuredVideoIds: string[], heroVideoId: string | null }} */
    let featuredCfg = { featuredVideoIds: [], heroVideoId: null };
    let openDetails = new Set();

    const featuredSummary = () => {
        const count = featuredCfg.featuredVideoIds.length
            || communityVideos.filter((v) => v.visible !== false).slice(0, 6).length;
        const heroRec = communityVideos.find((v) => String(v.id) === String(featuredCfg.heroVideoId || ''));
        const heroLocales = heroRec ? parseVideoLocales(heroRec.localesJson) : null;
        const heroLabel = heroLocales
            ? String(heroLocales.headlineEn || heroLocales.headlineJa || heroRec?.slug || 'Video')
            : count ? 'Default' : 'None';
        return { featuredCount: Math.min(count, 6), heroLabel };
    };

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
        const checked = (id) => {
            const el = mainEl.querySelector(`#${id}`);
            return el instanceof HTMLInputElement ? el.checked : true;
        };

        const sections = Object.fromEntries(
            COMMUNITY_SECTION_TOGGLES.map(([key]) => [key, checked(`st-com-section-${key}`)]),
        );

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

        const next = {
            ...bundle,
            sections,
            connect,
            networkCards,
            sessions,
            promo,
        };
        delete next.exclusive;
        delete next.hero;
        return next;
    }

    function fillForms() {
        const fs = mainEl.querySelector('#studio-com-form-overview');
        const ff = mainEl.querySelector('#studio-com-form-featured');
        const fc = mainEl.querySelector('#studio-com-form-connect');
        const fn = mainEl.querySelector('#studio-com-form-network');
        const fss = mainEl.querySelector('#studio-com-form-sessions');
        const fp = mainEl.querySelector('#studio-com-form-promo');
        if (fs) fs.innerHTML = renderSectionToggles(bundle, featuredSummary());
        if (ff) ff.innerHTML = renderFeaturedTab(communityVideos, featuredCfg);
        if (fc) fc.innerHTML = renderConnectForm(bundle);
        if (fn) fn.innerHTML = renderNetworkForm(bundle);
        if (fss) fss.innerHTML = renderSessionsForm(bundle);
        if (fp) fp.innerHTML = renderPromoForm(bundle);
    }

    async function readBackSavedCommunityPage(expectedPreview) {
        let last = null;
        for (const delay of [500, 900, 1400, 2200]) {
            await sleep(delay);
            const saved = await adminGetCommunityPageStudio();
            last = saved && typeof saved === 'object' ? saved : null;
            const savedPreview = comparableAssetUrl(last?.hero?.previewVideoUrl);
            if (savedPreview === expectedPreview) return last;
        }
        return last;
    }

    function rememberOpenDetails() {
        openDetails = new Set(
            Array.from(mainEl.querySelectorAll('details[open]'))
                .map((el) => el instanceof HTMLElement ? signatureForDetails(el) : '')
                .filter(Boolean)
        );
    }

    function signatureForDetails(el) {
        const summary = el.querySelector('summary');
        const title = String(summary?.textContent || '').replace(/\s+/g, ' ').trim();
        const feature = el.querySelector('[data-feature]')?.getAttribute('data-feature') ||
            el.querySelector('[data-chapter-row]')?.getAttribute('data-chapter-row') ||
            el.querySelector('[data-topic-row]')?.getAttribute('data-topic-row') ||
            '';
        return `${feature}|${title}`;
    }

    function restoreOpenDetails() {
        if (!openDetails.size) return;
        mainEl.querySelectorAll('details').forEach((el) => {
            if (!(el instanceof HTMLDetailsElement)) return;
            if (openDetails.has(signatureForDetails(el))) {
                el.open = true;
            }
        });
    }

    function refillFormsPreservingDetails() {
        rememberOpenDetails();
        fillForms();
        restoreOpenDetails();
    }

    mainEl.addEventListener('click', (e) => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        if (t.id === 'st-com-net-add') {
            e.preventDefault();
            bundle = collectFromDom();
            bundle.networkCards = [...(Array.isArray(bundle.networkCards) ? bundle.networkCards : []), {}];
            refillFormsPreservingDetails();
            return;
        }
        if (t.id === 'st-com-ss-add') {
            e.preventDefault();
            bundle = collectFromDom();
            bundle.sessions = [...(Array.isArray(bundle.sessions) ? bundle.sessions : []), {}];
            refillFormsPreservingDetails();
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

    try {
        bundle = await adminGetCommunityPageStudio();
        if (!bundle || typeof bundle !== 'object') bundle = {};
    } catch (e) {
        show(e instanceof Error ? e.message : String(e), 'warn');
        bundle = {};
    }
    try {
        [communityVideos, featuredCfg] = await Promise.all([
            listCommunityVideosStudio(),
            getCommunityFeaturedVideosStudio(),
        ]);
        if (!Array.isArray(communityVideos)) communityVideos = [];
    } catch {
        communityVideos = [];
    }
    try {
        studioArtists = await getCommunityArtistsForStudio();
        if (!Array.isArray(studioArtists)) studioArtists = [];
    } catch {
        studioArtists = [];
    }

    try {
        fillForms();
    } catch (e) {
        show(e instanceof Error ? e.message : String(e), 'warn');
    }

    mainEl.querySelector('#studio-community-save')?.addEventListener('click', async () => {
        const saveBtn = /** @type {HTMLButtonElement | null} */ (mainEl.querySelector('#studio-community-save'));
        try {
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving...';
            }
            show('Saving community page...', 'info');
            const next = collectFromDom();
            const saveResult = await adminSetCommunityPageStudio(next);
            const expectedPreview = comparableAssetUrl(next?.hero?.previewVideoUrl);
            const saved = await readBackSavedCommunityPage(expectedPreview);
            const savedPreview = comparableAssetUrl(saved?.hero?.previewVideoUrl);
            bundle = savedPreview === expectedPreview && saved ? saved : next;
            fillForms();
            show(
                savedPreview === expectedPreview
                    ? `Saved to ${saveResult?.mode === 'test' ? 'local test storage' : 'backend'}.`
                    : `Saved to ${saveResult?.mode === 'test' ? 'local test storage' : 'backend'}, but backend read-back is still returning the previous preview URL. Data mode: ${getCommunityDataMode()}.`,
                savedPreview === expectedPreview ? 'info' : 'warn'
            );
        } catch (e) {
            show(e instanceof Error ? e.message : String(e), 'warn');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save community page';
            }
        }
    });
}
