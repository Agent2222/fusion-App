/**
 * Studio → Content → Videos
 */
import {
    deleteCommunityVideoStudio,
    getCommunityFeaturedVideosStudio,
    listCommunityVideosStudio,
    setCommunityFeaturedVideosStudio,
    upsertCommunityVideoStudio,
} from '../../../utils/database.js';
import {
    communityVideoRecordToFeatureItem,
    parseVideoLocales,
    resolveFeaturedVideos,
    sortVideosByRecency,
    videoMediaStatus,
} from '../../../utils/videoPageModel.js';
import { studioFeatureAccess } from '../../../utils/studioShellState.js';
import { openVideoEditorModal } from '../videoEditorModal.js';
import { captureStudioVideoEvent } from '../../../utils/videosPosthog.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatDate(iso) {
    const d = Date.parse(String(iso || ''));
    if (!Number.isFinite(d)) return '—';
    return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * @param {Record<string, unknown>} rec
 * @param {boolean} selected
 * @param {{ isHero?: boolean, canEdit?: boolean, readOnly?: boolean }} meta
 */
function featuredCardHtml(rec, selected, meta = {}) {
    const locales = parseVideoLocales(rec.localesJson);
    const title = String(locales.headlineEn || locales.headlineJa || rec.slug || 'Video');
    const line = String(locales.lineEn || locales.lineJa || '');
    const img = String(rec.posterUrl || rec.imageUrl || '');
    const media = videoMediaStatus(rec);
    const readOnly = meta.readOnly === true;
    const heroBtn =
        !readOnly && meta.canEdit && selected
            ? `<button type="button" class="studio-videos-featured-card__hero${meta.isHero ? ' is-hero' : ''}" data-hero-set="${esc(rec.id)}" aria-label="${meta.isHero ? 'Clear landing hero' : 'Set as landing hero'}">${meta.isHero ? '★ Hero' : 'Set hero'}</button>`
            : '';
    const tag = readOnly ? 'div' : 'button';
    const attrs = readOnly
        ? `class="studio-videos-featured-card studio-videos-featured-card--readonly" data-video-id="${esc(rec.id)}" role="button" tabindex="0"`
        : `type="button" class="studio-videos-featured-card${selected ? ' is-selected' : ''}" data-video-id="${esc(rec.id)}" aria-pressed="${selected ? 'true' : 'false'}"`;
    return `<${tag} ${attrs}>
        <div class="studio-videos-featured-card__media" style="${img ? `background-image:url(${esc(img)})` : ''}"></div>
        <div class="studio-videos-featured-card__body">
            <strong>${esc(title)}</strong>
            <span>${esc(line)}</span>
            <div class="studio-videos-featured-card__pills">
                ${meta.isHero ? '<span class="studio-pill">Hero</span>' : ''}
                ${media.hasPreview ? '<span class="studio-pill">Preview ✓</span>' : '<span class="studio-pill studio-pill--muted">Draft</span>'}
            </div>
            ${heroBtn}
        </div>
    </${tag}>`;
}

/**
 * @param {HTMLElement} mainEl
 */
export async function initVideosSection(mainEl) {
    const perm = studioFeatureAccess('community');
    if (!perm.visible) {
        mainEl.innerHTML = '<p class="studio-muted">You do not have access to Videos.</p>';
        return;
    }
    const canEdit = perm.canEdit;

    mainEl.innerHTML = `
        <div class="studio-section-stack studio-videos-page">
            <div class="studio-section-head">
                <h2>Videos</h2>
                <p class="studio-muted">Manage the /videos library and Community featured row.</p>
                ${canEdit ? '<button type="button" class="studio-btn-primary" id="studio-videos-add">Add video</button>' : ''}
            </div>
            <section class="studio-videos-featured-section">
                <div class="studio-videos-featured-head">
                    <div>
                        <h3 class="studio-subheading">Featured</h3>
                        <p class="studio-muted">What appears on /community and the /videos recent row: pinned videos (checked in each video&apos;s editor) plus the most recently added until six slots are filled. Set a hero in the video editor.</p>
                    </div>
                </div>
                <div class="studio-videos-featured-grid" id="studio-videos-featured-grid"></div>
            </section>
            <div class="studio-videos-toolbar">
                <input type="search" id="studio-videos-search" class="studio-input" placeholder="Search videos…" />
                <select id="studio-videos-visible" class="studio-select">
                    <option value="all">All</option>
                    <option value="visible">Visible</option>
                    <option value="hidden">Hidden</option>
                </select>
            </div>
            <div class="studio-table-wrap">
                <table class="studio-table studio-table--dense">
                    <thead>
                        <tr>
                            <th>Poster</th>
                            <th>Title</th>
                            <th>Published</th>
                            <th>Visible</th>
                            <th>Media</th>
                            <th>Featured</th>
                        </tr>
                    </thead>
                    <tbody id="studio-videos-tbody"><tr><td colspan="6">Loading…</td></tr></tbody>
                </table>
            </div>
            <nav class="studio-pagination" id="studio-videos-pagination" style="display:none">
                <button type="button" class="studio-btn-ghost" id="studio-videos-prev">Prev</button>
                <span id="studio-videos-page-label"></span>
                <button type="button" class="studio-btn-ghost" id="studio-videos-next">Next</button>
            </nav>
        </div>`;

    /** @type {Record<string, unknown>[]} */
    let allVideos = [];
    /** @type {{ featuredVideoIds: string[], heroVideoId: string | null }} */
    let featuredCfg = { featuredVideoIds: [], heroVideoId: null };
    let page = 0;
    const pageSize = 10;

    const tbody = mainEl.querySelector('#studio-videos-tbody');
    const featuredGrid = mainEl.querySelector('#studio-videos-featured-grid');
    const searchInput = mainEl.querySelector('#studio-videos-search');
    const visibleFilter = mainEl.querySelector('#studio-videos-visible');

    const filtered = () => {
        let rows = sortVideosByRecency(allVideos);
        const vis = visibleFilter instanceof HTMLSelectElement ? visibleFilter.value : 'all';
        if (vis === 'visible') rows = rows.filter((r) => r.visible !== false);
        if (vis === 'hidden') rows = rows.filter((r) => r.visible === false);
        const q = (searchInput instanceof HTMLInputElement ? searchInput.value : '').trim().toLowerCase();
        if (q) {
            rows = rows.filter((r) => {
                const loc = parseVideoLocales(r.localesJson);
                const hay = `${loc.headlineEn} ${loc.headlineJa} ${loc.lineEn} ${r.slug}`.toLowerCase();
                return hay.includes(q);
            });
        }
        return rows;
    };

    const resolvedFeatured = () => resolveFeaturedVideos(allVideos, featuredCfg);

    const renderFeaturedGrid = () => {
        if (!featuredGrid) return;
        const featured = resolvedFeatured();
        const pinnedSet = new Set(featuredCfg.featuredVideoIds.map(String));
        const heroId = featuredCfg.heroVideoId ? String(featuredCfg.heroVideoId) : '';
        const cards = featured.map((rec) =>
            featuredCardHtml(rec, true, {
                isHero: String(rec.id) === heroId,
                canEdit: false,
                readOnly: true,
            }),
        );
        featuredGrid.innerHTML = cards.length
            ? cards.join('')
            : '<p class="studio-muted">No visible videos yet. Add a video and mark it visible.</p>';
        featuredGrid.querySelectorAll('[data-video-id]').forEach((el) => {
            const open = () => {
                const id = el.getAttribute('data-video-id');
                const rec = allVideos.find((v) => String(v.id) === id);
                if (rec) openEditor(rec);
            };
            el.addEventListener('click', open);
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    open();
                }
            });
        });
    };

    const renderTable = () => {
        if (!tbody) return;
        const rows = filtered();
        const pages = Math.max(1, Math.ceil(rows.length / pageSize));
        if (page >= pages) page = Math.max(0, pages - 1);
        const slice = rows.slice(page * pageSize, page * pageSize + pageSize);
        const featuredSet = new Set(resolvedFeatured().map((v) => String(v.id)));
        const pinnedSet = new Set(featuredCfg.featuredVideoIds.map(String));
        if (!slice.length) {
            tbody.innerHTML = `<tr><td colspan="6">${allVideos.length ? 'No matches.' : 'No videos yet.'}</td></tr>`;
        } else {
            tbody.innerHTML = slice
                .map((rec) => {
                    const loc = parseVideoLocales(rec.localesJson);
                    const title = String(loc.headlineEn || loc.headlineJa || rec.slug);
                    const img = String(rec.posterUrl || rec.imageUrl || '');
                    const media = videoMediaStatus(rec);
                    const id = String(rec.id);
                    const pinned = pinnedSet.has(id);
                    const inFeatured = featuredSet.has(id);
                    const isHero = String(featuredCfg.heroVideoId) === id;
                    let featuredLabel = '—';
                    if (inFeatured) {
                        featuredLabel = pinned ? 'Pinned' : 'Recent';
                        if (isHero) featuredLabel += ' ★';
                    }
                    return `<tr class="studio-videos-row" data-video-id="${esc(rec.id)}" tabindex="0" role="button">
                        <td>${img ? `<img src="${esc(img)}" alt="" width="48" height="27" style="object-fit:cover" />` : '—'}</td>
                        <td>${esc(title)}</td>
                        <td>${esc(formatDate(rec.publishedAt))}</td>
                        <td>${rec.visible !== false ? 'Yes' : 'No'}</td>
                        <td>${media.hasPreview ? 'Preview' : '—'}${media.hasFull ? ' · Full' : ''}${media.hasPoster ? ' · Poster' : ''}</td>
                        <td>${esc(featuredLabel)}</td>
                    </tr>`;
                })
                .join('');
            tbody.querySelectorAll('.studio-videos-row').forEach((tr) => {
                const open = () => {
                    const id = tr.getAttribute('data-video-id');
                    const rec = allVideos.find((v) => String(v.id) === id);
                    if (rec) openEditor(rec);
                };
                tr.addEventListener('click', open);
                tr.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') open();
                });
            });
        }
        const pagination = mainEl.querySelector('#studio-videos-pagination');
        const pageLabel = mainEl.querySelector('#studio-videos-page-label');
        if (pagination && pageLabel) {
            pagination.style.display = pages > 1 ? 'flex' : 'none';
            pageLabel.textContent = `Page ${page + 1} / ${pages}`;
        }
    };

    const openEditor = (rec) => {
        void openVideoEditorModal(rec, {
            canEdit,
            featured: {
                videoIds: featuredCfg.featuredVideoIds,
                heroVideoId: featuredCfg.heroVideoId,
            },
            otherVideos: allVideos,
            onFeaturedChange: canEdit
                ? async (cfg) => {
                      await setCommunityFeaturedVideosStudio(cfg);
                      featuredCfg = cfg;
                      renderFeaturedGrid();
                      renderTable();
                  }
                : undefined,
            onSave: async (next) => {
                await upsertCommunityVideoStudio(next);
                await reload();
            },
            onDelete: canEdit
                ? async () => {
                      await deleteCommunityVideoStudio(String(rec.id));
                      await reload();
                  }
                : undefined,
        });
    };

    const reload = async () => {
        [allVideos, featuredCfg] = await Promise.all([
            listCommunityVideosStudio(),
            getCommunityFeaturedVideosStudio(),
        ]);
        renderFeaturedGrid();
        renderTable();
    };

    mainEl.querySelector('#studio-videos-add')?.addEventListener('click', () => {
        void openVideoEditorModal(null, {
            canEdit,
            featured: {
                videoIds: featuredCfg.featuredVideoIds,
                heroVideoId: featuredCfg.heroVideoId,
            },
            otherVideos: allVideos,
            onFeaturedChange: canEdit
                ? async (cfg) => {
                      await setCommunityFeaturedVideosStudio(cfg);
                      featuredCfg = cfg;
                      renderFeaturedGrid();
                      renderTable();
                  }
                : undefined,
            onSave: async (next) => {
                await upsertCommunityVideoStudio(next);
                await reload();
            },
        });
    });

    searchInput?.addEventListener('input', () => {
        page = 0;
        renderTable();
    });
    visibleFilter?.addEventListener('change', () => {
        page = 0;
        renderTable();
    });
    mainEl.querySelector('#studio-videos-prev')?.addEventListener('click', () => {
        page = Math.max(0, page - 1);
        renderTable();
    });
    mainEl.querySelector('#studio-videos-next')?.addEventListener('click', () => {
        page += 1;
        renderTable();
    });

    await reload();
    captureStudioVideoEvent('studio_videos_section_loaded', { count: allVideos.length });
}

/** Re-export for community featured cards */
export { featuredCardHtml, communityVideoRecordToFeatureItem };
