/**
 * Studio → Content → Community: tabbed editor for `/community` JSON blob.
 */
import {
    adminGetCommunityPageStudio,
    adminSetCommunityPageStudio,
    getArtistsForStudio,
} from '../../../utils/database.js';
import { presignPrivateVideoUpload } from '../../../utils/integrationApi.js';
import { uploadBlobToS3 } from '../../../utils/studioS3Upload.js';
import { studioPageHeaderHtml } from '../../../utils/studioCategoryLayout.js';
import { studioFeatureAccess } from '../../../utils/studioShellState.js';

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
    return `
        <option value="">Select artist</option>
        ${artists.map((artist) => {
            const id = String(artist?.id ?? '');
            return `<option value="${escapeHtml(id)}" ${id === selected ? 'selected' : ''}>${escapeHtml(artistLabel(artist))}</option>`;
        }).join('')}
    `;
}

function renderChapterRows(featureKey, chapters, artists) {
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
            <h4 class="studio-subheading studio-community__subhead">Artist timestamps</h4>
            <p class="studio-muted">Each row links a video timestamp to an artist in the roster. The public hero will derive the micro profile automatically.</p>
            ${rows || '<p class="studio-muted">No timestamps yet.</p>'}
            <button type="button" class="studio-btn-ghost st-com-chapter-add" data-feature="${escapeHtml(featureKey)}">Add timestamp</button>
        </div>
    `;
}

function renderTopicRows(featureKey, topics) {
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
            <h4 class="studio-subheading studio-community__subhead">Idea timestamps</h4>
            <p class="studio-muted">Each row adds a localized topic or quote timestamp for videos that are organized by ideas instead of people.</p>
            ${rows || '<p class="studio-muted">No idea timestamps yet.</p>'}
            <button type="button" class="studio-btn-ghost st-com-topic-add" data-feature="${escapeHtml(featureKey)}">Add idea timestamp</button>
        </div>
    `;
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
                <section class="studio-community__section" aria-labelledby="studio-community-sections-title">
                    <div class="studio-community__section-head">
                        <h3 id="studio-community-sections-title" class="studio-subheading">Active sections</h3>
                        <p class="studio-muted">Toggle which Community page subcomponents are visible on the public site.</p>
                    </div>
                    <div id="studio-com-form-sections" class="studio-community__form"></div>
                </section>
                <section class="studio-community__section" aria-labelledby="studio-community-hero-title">
                    <div class="studio-community__section-head">
                        <h3 id="studio-community-hero-title" class="studio-subheading">Hero</h3>
                        <p class="studio-muted">Primary video and CTA copy shown on <code>/community</code>.</p>
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

const COMMUNITY_SECTION_TOGGLES = [
    ['hero', 'Hero video'],
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
 */
function renderSectionToggles(bundle) {
    const sections = bundle.sections && typeof bundle.sections === 'object' ? bundle.sections : {};
    return `
        <div class="studio-form-grid">
            ${COMMUNITY_SECTION_TOGGLES.map(
                ([key, label]) => `
                    <label class="studio-field studio-field--checkbox">
                        <input type="checkbox" id="st-com-section-${key}" ${communitySectionActive(sections, key) ? 'checked' : ''} />
                        <span>${escapeHtml(label)}</span>
                    </label>
                `,
            ).join('')}
        </div>
    `;
}

/**
 * @param {Record<string, unknown>} bundle
 * @param {Array<Record<string, unknown>>} artists
 */
function renderHeroForm(bundle, artists) {
    const h = bundle.hero && typeof bundle.hero === 'object' ? /** @type {Record<string, unknown>} */ (bundle.hero) : {};
    const field = (id, label, val) => `
        <label class="studio-field">
            <span>${escapeHtml(label)}</span>
            <input type="text" id="${id}" class="studio-input" value="${escapeHtml(String(val ?? ''))}" />
        </label>`;
    return `
        <p class="studio-muted">Primary CTA on the public site switches between <strong>Join</strong> and <strong>Watch</strong> based on membership. Public previews can use CloudFront; full videos are stored privately under <code>fusionMedia/private-video</code>.</p>
        ${field('st-com-hero-preview-video', 'Public preview video URL', h.previewVideoUrl)}
        ${field('st-com-hero-full-key', 'Members-only full video key', h.fullVideoKey)}
        ${field('st-com-hero-full-name', 'Members-only full video file name', h.fullVideoFileName)}
        ${field('st-com-hero-video', 'Legacy public video URL', h.videoUrl)}
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
        ${renderChapterRows('hero', h.chapters, artists)}
        ${renderTopicRows('hero', h.topics)}
        <label class="studio-file-label studio-btn-ghost">
            <input type="file" id="st-com-hero-poster-file" accept="image/*" class="studio-file-input" />
            Upload poster to S3
        </label>
        <label class="studio-file-label studio-btn-ghost">
            <input type="file" id="st-com-hero-preview-file" accept="video/*,.mp4,.webm,.mov" class="studio-file-input" />
            Upload public preview video
        </label>
        <label class="studio-file-label studio-btn-ghost">
            <input type="file" id="st-com-hero-full-file" accept="video/*,.mp4,.webm,.mov" class="studio-file-input" />
            Upload members-only full video
        </label>
    `;
}

/**
 * @param {Record<string, unknown>} bundle
 * @param {Array<Record<string, unknown>>} artists
 */
function renderExclusiveForm(bundle, artists) {
    const ex = Array.isArray(bundle.exclusive) ? bundle.exclusive : [{}, {}, {}];
    while (ex.length < 3) ex.push({});
    const field = (id, label, val) => `
        <label class="studio-field">
            <span>${escapeHtml(label)}</span>
            <input type="text" id="${id}" class="studio-input" value="${escapeHtml(String(val ?? ''))}" />
        </label>`;
    const cards = ex.slice(0, 3).map((raw, i) => {
        const c = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
        const n = i + 1;
        return `
            <fieldset class="studio-field-group studio-community__card">
                <legend>Feature ${n}</legend>
                <label class="studio-field"><span>Image URL</span><input type="text" id="st-com-ex-${i}-img" class="studio-input" value="${escapeHtml(String(c.imageUrl ?? ''))}" /></label>
                ${field(`st-com-ex-${i}-poster`, 'Poster image URL', c.posterUrl)}
                ${field(`st-com-ex-${i}-preview-video`, 'Public preview video URL', c.previewVideoUrl)}
                ${field(`st-com-ex-${i}-full-key`, 'Members-only full video key', c.fullVideoKey)}
                ${field(`st-com-ex-${i}-full-name`, 'Members-only full video file name', c.fullVideoFileName)}
                ${field(`st-com-ex-${i}-video`, 'Legacy public video URL', c.videoUrl)}
                ${field(`st-com-ex-${i}-ov-title`, 'Overlay — line 1', c.overlayTitle)}
                ${field(`st-com-ex-${i}-ov-guests`, 'Overlay — guests', c.overlayGuests)}
                ${field(`st-com-ex-${i}-ov-dur`, 'Overlay — duration text', c.overlayDuration)}
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
                ${renderChapterRows(`ex-${i}`, c.chapters, artists)}
                ${renderTopicRows(`ex-${i}`, c.topics)}
                <label class="studio-file-label studio-btn-ghost">
                    <input type="file" id="st-com-ex-${i}-image-file" accept="image/*" class="studio-file-input" data-card-idx="${i}" />
                    Upload card image
                </label>
                <label class="studio-file-label studio-btn-ghost">
                    <input type="file" id="st-com-ex-${i}-poster-file" accept="image/*" class="studio-file-input" data-card-idx="${i}" />
                    Upload poster
                </label>
                <label class="studio-file-label studio-btn-ghost">
                    <input type="file" id="st-com-ex-${i}-preview-file" accept="video/*,.mp4,.webm,.mov" class="studio-file-input" data-card-idx="${i}" />
                    Upload public preview video
                </label>
                <label class="studio-file-label studio-btn-ghost">
                    <input type="file" id="st-com-ex-${i}-full-file" accept="video/*,.mp4,.webm,.mov" class="studio-file-input" data-card-idx="${i}" />
                    Upload members-only full video
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

    const perm = studioFeatureAccess('community');
    if (!perm.canEdit) {
        show('You do not have permission to edit Community.', 'warn');
        return;
    }

    /** @type {Record<string, unknown>} */
    let bundle = {};
    /** @type {Array<Record<string, unknown>>} */
    let studioArtists = [];

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
        const chaptersFor = (featureKey) => {
            const rows = mainEl.querySelectorAll(`[data-chapter-row="${featureKey}"]`);
            return Array.from(rows)
                .map((row) => {
                    const artistId = String(row.querySelector('.st-com-chapter-artist')?.value ?? '').trim();
                    const timestampSec = timestampFromInput(row.querySelector('.st-com-chapter-time')?.value ?? '');
                    return artistId ? { artistId, timestampSec } : null;
                })
                .filter(Boolean)
                .sort((a, b) => a.timestampSec - b.timestampSec);
        };
        const topicsFor = (featureKey) => {
            const rows = mainEl.querySelectorAll(`[data-topic-row="${featureKey}"]`);
            return Array.from(rows)
                .map((row) => {
                    const titleEn = String(row.querySelector('.st-com-topic-title-en')?.value ?? '').trim();
                    const titleJa = String(row.querySelector('.st-com-topic-title-ja')?.value ?? '').trim();
                    const quoteEn = String(row.querySelector('.st-com-topic-quote-en')?.value ?? '').trim();
                    const quoteJa = String(row.querySelector('.st-com-topic-quote-ja')?.value ?? '').trim();
                    const timestampSec = timestampFromInput(row.querySelector('.st-com-topic-time')?.value ?? '');
                    return titleEn || titleJa || quoteEn || quoteJa
                        ? { timestampSec, titleEn, titleJa, quoteEn, quoteJa }
                        : null;
                })
                .filter(Boolean)
                .sort((a, b) => a.timestampSec - b.timestampSec);
        };

        const sections = Object.fromEntries(
            COMMUNITY_SECTION_TOGGLES.map(([key]) => [key, checked(`st-com-section-${key}`)]),
        );

        const hero = {
            videoUrl: val('st-com-hero-video'),
            previewVideoUrl: val('st-com-hero-preview-video'),
            fullVideoKey: val('st-com-hero-full-key'),
            fullVideoFileName: val('st-com-hero-full-name'),
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
            chapters: chaptersFor('hero'),
            topics: topicsFor('hero'),
        };

        const exclusive = [0, 1, 2].map((i) => ({
            imageUrl: val(`st-com-ex-${i}-img`),
            posterUrl: val(`st-com-ex-${i}-poster`),
            previewVideoUrl: val(`st-com-ex-${i}-preview-video`),
            fullVideoKey: val(`st-com-ex-${i}-full-key`),
            fullVideoFileName: val(`st-com-ex-${i}-full-name`),
            videoUrl: val(`st-com-ex-${i}-video`),
            overlayTitle: val(`st-com-ex-${i}-ov-title`),
            overlayGuests: val(`st-com-ex-${i}-ov-guests`),
            overlayDuration: val(`st-com-ex-${i}-ov-dur`),
            lineEn: val(`st-com-ex-${i}-en`),
            lineJa: val(`st-com-ex-${i}-ja`),
            kickerEn: val(`st-com-ex-${i}-k-en`),
            kickerJa: val(`st-com-ex-${i}-k-ja`),
            headlineEn: val(`st-com-ex-${i}-h-en`),
            headlineJa: val(`st-com-ex-${i}-h-ja`),
            bodyEn: val(`st-com-ex-${i}-b-en`),
            bodyJa: val(`st-com-ex-${i}-b-ja`),
            ctaJoinLabelEn: val(`st-com-ex-${i}-cta-join-en`),
            ctaJoinLabelJa: val(`st-com-ex-${i}-cta-join-ja`),
            ctaWatchLabelEn: val(`st-com-ex-${i}-cta-watch-en`),
            ctaWatchLabelJa: val(`st-com-ex-${i}-cta-watch-ja`),
            chapters: chaptersFor(`ex-${i}`),
            topics: topicsFor(`ex-${i}`),
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
            sections,
            hero,
            exclusive,
            connect,
            networkCards,
            sessions,
            promo,
        };
    }

    function fillForms() {
        const fs = mainEl.querySelector('#studio-com-form-sections');
        const fh = mainEl.querySelector('#studio-com-form-hero');
        const fe = mainEl.querySelector('#studio-com-form-exc');
        const fc = mainEl.querySelector('#studio-com-form-con');
        const ff = mainEl.querySelector('#studio-com-form-foot');
        if (fs) fs.innerHTML = renderSectionToggles(bundle);
        if (fh) fh.innerHTML = renderHeroForm(bundle, studioArtists);
        if (fe) fe.innerHTML = renderExclusiveForm(bundle, studioArtists);
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
        if (t.classList.contains('st-com-chapter-add')) {
            e.preventDefault();
            const featureKey = t.getAttribute('data-feature') || '';
            bundle = collectFromDom();
            if (featureKey === 'hero') {
                const hero = bundle.hero && typeof bundle.hero === 'object' ? /** @type {Record<string, unknown>} */ (bundle.hero) : {};
                hero.chapters = [...(Array.isArray(hero.chapters) ? hero.chapters : []), { artistId: '', timestampSec: 0 }];
                bundle.hero = hero;
            } else {
                const m = /^ex-(\d+)$/.exec(featureKey);
                const idx = m ? Number(m[1]) : -1;
                const exclusive = Array.isArray(bundle.exclusive) ? [...bundle.exclusive] : [];
                if (idx >= 0) {
                    const item = exclusive[idx] && typeof exclusive[idx] === 'object' ? /** @type {Record<string, unknown>} */ (exclusive[idx]) : {};
                    item.chapters = [...(Array.isArray(item.chapters) ? item.chapters : []), { artistId: '', timestampSec: 0 }];
                    exclusive[idx] = item;
                    bundle.exclusive = exclusive;
                }
            }
            fillForms();
            return;
        }
        if (t.classList.contains('st-com-chapter-del')) {
            e.preventDefault();
            const featureKey = t.getAttribute('data-feature') || '';
            const chapterIndex = Number(t.getAttribute('data-chapter-index') ?? -1);
            bundle = collectFromDom();
            const removeAt = (owner) => {
                const chapters = Array.isArray(owner.chapters) ? [...owner.chapters] : [];
                if (chapterIndex >= 0) chapters.splice(chapterIndex, 1);
                owner.chapters = chapters;
            };
            if (featureKey === 'hero') {
                const hero = bundle.hero && typeof bundle.hero === 'object' ? /** @type {Record<string, unknown>} */ (bundle.hero) : {};
                removeAt(hero);
                bundle.hero = hero;
            } else {
                const m = /^ex-(\d+)$/.exec(featureKey);
                const idx = m ? Number(m[1]) : -1;
                const exclusive = Array.isArray(bundle.exclusive) ? [...bundle.exclusive] : [];
                if (idx >= 0) {
                    const item = exclusive[idx] && typeof exclusive[idx] === 'object' ? /** @type {Record<string, unknown>} */ (exclusive[idx]) : {};
                    removeAt(item);
                    exclusive[idx] = item;
                    bundle.exclusive = exclusive;
                }
            }
            fillForms();
            return;
        }
        if (t.classList.contains('st-com-topic-add')) {
            e.preventDefault();
            const featureKey = t.getAttribute('data-feature') || '';
            bundle = collectFromDom();
            const addTopic = (owner) => {
                owner.topics = [
                    ...(Array.isArray(owner.topics) ? owner.topics : []),
                    { timestampSec: 0, titleEn: '', titleJa: '', quoteEn: '', quoteJa: '' },
                ];
            };
            if (featureKey === 'hero') {
                const hero = bundle.hero && typeof bundle.hero === 'object' ? /** @type {Record<string, unknown>} */ (bundle.hero) : {};
                addTopic(hero);
                bundle.hero = hero;
            } else {
                const m = /^ex-(\d+)$/.exec(featureKey);
                const idx = m ? Number(m[1]) : -1;
                const exclusive = Array.isArray(bundle.exclusive) ? [...bundle.exclusive] : [];
                if (idx >= 0) {
                    const item = exclusive[idx] && typeof exclusive[idx] === 'object' ? /** @type {Record<string, unknown>} */ (exclusive[idx]) : {};
                    addTopic(item);
                    exclusive[idx] = item;
                    bundle.exclusive = exclusive;
                }
            }
            fillForms();
            return;
        }
        if (t.classList.contains('st-com-topic-del')) {
            e.preventDefault();
            const featureKey = t.getAttribute('data-feature') || '';
            const topicIndex = Number(t.getAttribute('data-topic-index') ?? -1);
            bundle = collectFromDom();
            const removeTopic = (owner) => {
                const topics = Array.isArray(owner.topics) ? [...owner.topics] : [];
                if (topicIndex >= 0) topics.splice(topicIndex, 1);
                owner.topics = topics;
            };
            if (featureKey === 'hero') {
                const hero = bundle.hero && typeof bundle.hero === 'object' ? /** @type {Record<string, unknown>} */ (bundle.hero) : {};
                removeTopic(hero);
                bundle.hero = hero;
            } else {
                const m = /^ex-(\d+)$/.exec(featureKey);
                const idx = m ? Number(m[1]) : -1;
                const exclusive = Array.isArray(bundle.exclusive) ? [...bundle.exclusive] : [];
                if (idx >= 0) {
                    const item = exclusive[idx] && typeof exclusive[idx] === 'object' ? /** @type {Record<string, unknown>} */ (exclusive[idx]) : {};
                    removeTopic(item);
                    exclusive[idx] = item;
                    bundle.exclusive = exclusive;
                }
            }
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
        if (t.id === 'st-com-hero-preview-file') {
            try {
                const previewIn = /** @type {HTMLInputElement | null} */ (mainEl.querySelector('#st-com-hero-preview-video'));
                const url = await uploadBlobToS3(f, previewIn, {
                    area: 'studio/community',
                    entityType: 'community',
                    entityId: 'hero',
                    fieldKey: 'preview-video',
                });
                if (previewIn) previewIn.value = url;
                show('Public preview video uploaded.', 'info');
            } catch (err) {
                show(err instanceof Error ? err.message : String(err), 'warn');
            }
            t.value = '';
            return;
        }
        if (t.id === 'st-com-hero-full-file') {
            try {
                const keyIn = /** @type {HTMLInputElement | null} */ (mainEl.querySelector('#st-com-hero-full-key'));
                const nameIn = /** @type {HTMLInputElement | null} */ (mainEl.querySelector('#st-com-hero-full-name'));
                const signed = await presignPrivateVideoUpload({
                    contentId: 'community-hero',
                    fileName: f.name,
                    contentType: f.type || 'application/octet-stream',
                });
                const put = await fetch(signed.putUrl, {
                    method: 'PUT',
                    body: f,
                    headers: { 'Content-Type': f.type || 'application/octet-stream' },
                });
                if (!put.ok) throw new Error(`Private video upload failed: HTTP ${put.status}`);
                if (keyIn) keyIn.value = signed.key;
                if (nameIn) nameIn.value = signed.fileName || f.name;
                show('Members-only full video uploaded.', 'info');
            } catch (err) {
                show(err instanceof Error ? err.message : String(err), 'warn');
            }
            t.value = '';
            return;
        }
        const featureUpload = /^st-com-ex-(\d+)-(image|poster|preview|full)-file$/.exec(t.id || '');
        if (featureUpload) {
            const i = Number(featureUpload[1]);
            const kind = featureUpload[2];
            try {
                if (kind === 'full') {
                    const keyIn = /** @type {HTMLInputElement | null} */ (mainEl.querySelector(`#st-com-ex-${i}-full-key`));
                    const nameIn = /** @type {HTMLInputElement | null} */ (mainEl.querySelector(`#st-com-ex-${i}-full-name`));
                    const signed = await presignPrivateVideoUpload({
                        contentId: `community-exclusive-${i + 1}`,
                        fileName: f.name,
                        contentType: f.type || 'application/octet-stream',
                    });
                    const put = await fetch(signed.putUrl, {
                        method: 'PUT',
                        body: f,
                        headers: { 'Content-Type': f.type || 'application/octet-stream' },
                    });
                    if (!put.ok) throw new Error(`Private video upload failed: HTTP ${put.status}`);
                    if (keyIn) keyIn.value = signed.key;
                    if (nameIn) nameIn.value = signed.fileName || f.name;
                    show(`Feature ${i + 1} members-only full video uploaded.`, 'info');
                } else {
                    const inputId =
                        kind === 'poster'
                            ? `st-com-ex-${i}-poster`
                            : kind === 'preview'
                              ? `st-com-ex-${i}-preview-video`
                              : `st-com-ex-${i}-img`;
                    const input = /** @type {HTMLInputElement | null} */ (mainEl.querySelector(`#${inputId}`));
                    const url = await uploadBlobToS3(f, input, {
                        area: 'studio/community',
                        entityType: 'community',
                        entityId: `exclusive-${i + 1}`,
                        fieldKey: kind === 'preview' ? 'preview-video' : kind,
                    });
                    if (input) input.value = url;
                    show(`Feature ${i + 1} ${kind} uploaded.`, 'info');
                }
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
    try {
        studioArtists = await getArtistsForStudio();
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
