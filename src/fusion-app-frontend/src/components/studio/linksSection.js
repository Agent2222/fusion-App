/**
 * Studio → Operations → Links
 */
import '../../styles/studioLinks.css';
import { studioFeatureAccess } from '../../utils/studioShellState.js';
import { openStudioModal } from '../../utils/studioModal.js';
import { getPublicLinks, setPublicLinks } from '../../utils/database.js';
import {
    PUBLIC_LINK_COLOR_TOKENS,
    PUBLIC_LINK_PRESETS,
    contrastInkForColorToken,
    defaultPublicLinkEyebrowFromSource,
    emptyPublicLink,
    enabledPublicLinks,
    findPublicLinkSourceRow,
    movePublicLink,
    normalizePublicLink,
    normalizePublicLinkCardRows,
    normalizePublicLinkCardSpan,
    normalizePublicLinkColorToken,
    normalizePublicLinkCtaStyle,
    normalizePublicLinkDisplay,
    normalizePublicLinkSourceType,
    publicLinkColorCssVar,
    removePublicLink,
    resolvePublicLinkHrefFromSource,
    resolvePublicLinkImageFromSource,
    resolvePublicLinkLabelFromSource,
    resolvePublicLinkSubtextFromSource,
    sanitizePublicLinkHref,
    sanitizePublicLinkImageUrl,
    sortPublicLinks,
    upsertPublicLink,
} from '../../utils/publicLinksModel.js';
import {
    listContentSourceOptions,
    loadEmailStudioContentCaches,
} from '../../utils/emailCampaignContentSources.js';
import { openSocialImagePickerModal } from './socialImagePickerModal.js';

function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function renderLinks() {
    const access = studioFeatureAccess('links');
    if (!access.visible) {
        return `<div class="studio-section"><p class="studio-muted">You do not have access to Links.</p></div>`;
    }
    return `<div class="studio-links-page" id="studio-links-root" data-links-root data-can-edit="${access.canEdit ? '1' : '0'}"></div>`;
}

/**
 * @param {HTMLElement} mainEl
 */
export async function initLinks(mainEl) {
    const root = mainEl.querySelector('#studio-links-root');
    if (!(root instanceof HTMLElement)) return;
    const canEdit = root.dataset.canEdit === '1';

    /** @type {{ links: import('../../utils/publicLinksModel.js').PublicLink[], caches: object | null }} */
    const state = { links: [], caches: null };

    function paint() {
        const sorted = sortPublicLinks(state.links);
        const live = enabledPublicLinks(sorted);
        const cards = sorted
            .map((link, index) => {
                const onChip = link.enabled
                    ? '<span class="st-chip st-chip--sage">On /links</span>'
                    : '<span class="st-chip st-chip--faint">Hidden</span>';
                const kindChip =
                    link.display === 'card'
                        ? '<span class="st-chip st-chip--sand">Card</span>'
                        : '<span class="st-chip st-chip--blue">Button</span>';
                const spanChip =
                    link.display === 'card' && link.cardSpan === 2
                        ? '<span class="st-chip st-chip--faint">2 columns</span>'
                        : '';
                const rowChip =
                    link.display === 'card' && link.cardRows === 2
                        ? '<span class="st-chip st-chip--faint">2 rows</span>'
                        : '';
                const media =
                    link.display === 'card' && link.imageUrl
                        ? `<span class="st-card__thumb" style="background-image:url('${esc(link.imageUrl)}')"></span>`
                        : `<span class="st-card__swatch" style="background:${publicLinkColorCssVar(link.colorToken)}"></span>`;
                const upDisabled = !canEdit || index === 0 ? 'disabled' : '';
                const downDisabled = !canEdit || index === sorted.length - 1 ? 'disabled' : '';
                return `<article class="st-card" data-pl-card="${esc(link.id)}">
          <div class="st-card__media">${media}</div>
          <div>
            <h3 class="st-card__name">${esc(link.label)}</h3>
            <p class="st-card__href">${esc(link.href)}</p>
            <div class="st-card__chips">${kindChip}${spanChip}${rowChip}${onChip}</div>
          </div>
          <div class="st-card__reorder">
            <button type="button" class="button" data-pl-move="up" data-pl-id="${esc(link.id)}" ${upDisabled}>Up</button>
            <button type="button" class="button" data-pl-move="down" data-pl-id="${esc(link.id)}" ${downDisabled}>Down</button>
          </div>
        </article>`;
            })
            .join('');
        root.innerHTML = `
          <div class="schedule-page">
            <nav class="schedule-breadcrumbs" aria-label="Breadcrumb">
              <a href="#services">Operations</a><span aria-hidden="true">·</span><strong>Links</strong>
            </nav>
            <header class="schedule-hero">
              <div>
                <h1 class="schedule-hero__title">Links</h1>
                <p class="schedule-hero__subtitle">Buttons and cards on the public /links page. Labels are the visible text — leave “Fusion” out of the name.</p>
              </div>
              <div class="schedule-hero__actions">
                ${canEdit ? '<button type="button" class="button button--primary" data-pl-action="new">New link</button>' : ''}
              </div>
            </header>
            ${!canEdit ? '<p class="st-readonly">You can view these links but cannot edit them.</p>' : ''}
            <section class="schedule-stats" aria-label="Links summary">
              <article class="stat-card">
                <div class="stat-card__icon stat-card__icon--green"></div>
                <div class="stat-card__body">
                  <p class="stat-card__label">On the page</p>
                  <p class="stat-card__value">${live.length}</p>
                  <p class="stat-card__meta">Enabled</p>
                </div>
              </article>
              <article class="stat-card">
                <div class="stat-card__icon stat-card__icon--blue"></div>
                <div class="stat-card__body">
                  <p class="stat-card__label">In Studio</p>
                  <p class="stat-card__value">${sorted.length}</p>
                  <p class="stat-card__meta">All items</p>
                </div>
              </article>
            </section>
            <p class="st-preview">Public page: <a href="/links" target="_blank" rel="noopener noreferrer">/links</a></p>
            <div class="st-card-list">
              ${cards || '<div class="st-empty"><p>No links yet. Add one to show buttons or cards on /links.</p></div>'}
            </div>
          </div>`;
        bind();
    }

    function bind() {
        root.querySelector('[data-pl-action="new"]')?.addEventListener('click', () => {
            openModal(emptyPublicLink({ sortOrder: state.links.length }), true);
        });
        root.querySelectorAll('[data-pl-card]').forEach((card) => {
            card.addEventListener('click', (e) => {
                if (e.target instanceof Element && e.target.closest('[data-pl-move]')) return;
                const id = String(card.getAttribute('data-pl-card') || '');
                const link = state.links.find((l) => l.id === id);
                if (link) openModal({ ...link }, false);
            });
        });
        root.querySelectorAll('[data-pl-move]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!canEdit) return;
                const id = String(btn.getAttribute('data-pl-id') || '');
                const dir = btn.getAttribute('data-pl-move') === 'up' ? -1 : 1;
                void persist(movePublicLink(state.links, id, /** @type {-1 | 1} */ (dir)));
            });
        });
    }

    async function ensureCaches() {
        if (state.caches) return state.caches;
        state.caches = await loadEmailStudioContentCaches();
        return state.caches;
    }

    /**
     * @param {import('../../utils/publicLinksModel.js').PublicLink} link
     * @param {boolean} isNew
     */
    function openModal(link, isNew) {
        const presets = PUBLIC_LINK_PRESETS.map(
            (p) =>
                `<button type="button" class="button st-preset" data-pl-preset="${esc(p.href)}" data-pl-preset-label="${esc(p.label)}">${esc(p.label)}</button>`,
        ).join('');
        const swatches = PUBLIC_LINK_COLOR_TOKENS.map((token) => {
            const selected = token === link.colorToken ? ' is-selected' : '';
            const ink = contrastInkForColorToken(token);
            return `<button type="button" class="st-swatch${selected}" data-pl-color="${token}" style="--swatch-bg:${publicLinkColorCssVar(token)};--swatch-ink:${ink}" aria-label="${token}" ${canEdit ? '' : 'disabled'}>${token}</button>`;
        }).join('');
        const modal = openStudioModal(
            `<form class="st-modal-form" data-pl-form>
              <fieldset class="st-field st-display">
                <legend>Display</legend>
                <label class="st-check"><input type="radio" name="display" value="button" ${link.display !== 'card' ? 'checked' : ''} ${canEdit ? '' : 'disabled'} /> Button</label>
                <label class="st-check"><input type="radio" name="display" value="card" ${link.display === 'card' ? 'checked' : ''} ${canEdit ? '' : 'disabled'} /> Card</label>
              </fieldset>
              <label class="st-field">Title
                <input type="text" name="label" value="${esc(link.label)}" ${canEdit ? '' : 'readonly'} required />
              </label>
              <div data-pl-button-only>
                <p class="st-help">Button color uses site tokens (--c1 … --bg).</p>
                <div class="st-swatches" role="group" aria-label="Button color">${swatches}</div>
                <input type="hidden" name="colorToken" value="${esc(link.colorToken)}" />
              </div>
              <div data-pl-card-only hidden>
                <fieldset class="st-field st-display">
                  <legend>Card width</legend>
                  <label class="st-check"><input type="radio" name="cardSpan" value="1" ${link.cardSpan !== 2 ? 'checked' : ''} ${canEdit ? '' : 'disabled'} /> 1 column</label>
                  <label class="st-check"><input type="radio" name="cardSpan" value="2" ${link.cardSpan === 2 ? 'checked' : ''} ${canEdit ? '' : 'disabled'} /> 2 columns</label>
                </fieldset>
                <fieldset class="st-field st-display">
                  <legend>Card height</legend>
                  <label class="st-check"><input type="radio" name="cardRows" value="1" ${link.cardRows !== 2 ? 'checked' : ''} ${canEdit ? '' : 'disabled'} /> 1 row</label>
                  <label class="st-check"><input type="radio" name="cardRows" value="2" ${link.cardRows === 2 ? 'checked' : ''} ${canEdit ? '' : 'disabled'} /> 2 rows</label>
                </fieldset>
                <div class="st-image-row">
                  <span class="st-image-thumb" data-pl-image-thumb ${link.imageUrl ? `style="background-image:url('${esc(link.imageUrl)}')"` : ''}></span>
                  <button type="button" class="button" data-pl-pick-image ${canEdit ? '' : 'disabled'}>Choose image…</button>
                </div>
                <input type="hidden" name="imageUrl" value="${esc(link.imageUrl)}" />
                <p class="st-help">Pick a still from Artists, Programs, Journal, Videos, or Website. A destination template can fill this if it is empty.</p>
                <label class="st-field">Eyebrow
                  <input type="text" name="eyebrow" value="${esc(link.eyebrow)}" placeholder="Artist residency" maxlength="48" ${canEdit ? '' : 'readonly'} />
                </label>
                <label class="st-field">Subtext
                  <input type="text" name="subtext" value="${esc(link.subtext)}" placeholder="Time. Place. New Perspectives." maxlength="160" ${canEdit ? '' : 'readonly'} />
                </label>
                <label class="st-field">Button label
                  <input type="text" name="ctaLabel" value="${esc(link.ctaLabel)}" placeholder="Explore" maxlength="32" ${canEdit ? '' : 'readonly'} />
                </label>
                <fieldset class="st-field st-display">
                  <legend>Button style</legend>
                  <label class="st-check"><input type="radio" name="ctaStyle" value="outline" ${link.ctaStyle !== 'solid' ? 'checked' : ''} ${canEdit ? '' : 'disabled'} /> Outline</label>
                  <label class="st-check"><input type="radio" name="ctaStyle" value="solid" ${link.ctaStyle === 'solid' ? 'checked' : ''} ${canEdit ? '' : 'disabled'} /> Solid</label>
                </fieldset>
                <label class="st-field">Corner note
                  <input type="text" name="meta" value="${esc(link.meta)}" placeholder="Kaga Ishikawa Japan" maxlength="48" ${canEdit ? '' : 'readonly'} />
                </label>
              </div>
              <label class="st-field">Destination
                <select name="sourceType" ${canEdit ? '' : 'disabled'}>
                  <option value="url" ${link.sourceType === 'url' || !link.sourceType ? 'selected' : ''}>Custom URL</option>
                  <option value="artist" ${link.sourceType === 'artist' ? 'selected' : ''}>Featured artist</option>
                  <option value="journal" ${link.sourceType === 'journal' ? 'selected' : ''}>Journal</option>
                  <option value="video" ${link.sourceType === 'video' ? 'selected' : ''}>Video</option>
                </select>
              </label>
              <label class="st-field" data-pl-source-item hidden>
                Item
                <select name="sourceId" ${canEdit ? '' : 'disabled'}>
                  <option value="">— Select type first —</option>
                </select>
              </label>
              <button type="button" class="button" data-pl-apply-source hidden ${canEdit ? '' : 'disabled'}>Apply content</button>
              <label class="st-field">URL
                <input type="text" name="href" value="${esc(link.href)}" placeholder="/artists or https://…" ${canEdit ? '' : 'readonly'} required />
              </label>
              <p class="st-help" data-pl-url-help>Internal path or https URL. This is the destination, not the button text.</p>
              ${canEdit ? `<div class="st-presets" data-pl-presets>${presets}</div>` : ''}
              <div class="st-field-row">
                <label class="st-field">Sort order
                  <input type="number" name="sortOrder" value="${esc(String(link.sortOrder))}" ${canEdit ? '' : 'readonly'} />
                </label>
                <label class="st-check">
                  <input type="checkbox" name="enabled" ${link.enabled ? 'checked' : ''} ${canEdit ? '' : 'disabled'} />
                  Show on /links
                </label>
              </div>
              ${
                  canEdit
                      ? `<div class="st-modal-actions">
                ${!isNew ? '<button type="button" class="button" data-pl-delete>Delete</button>' : ''}
                <button type="submit" class="button button--primary">Save</button>
              </div>`
                      : ''
              }
            </form>`,
            {
                title: isNew ? 'New link' : 'Edit link',
                panelClass: 'studio-modal-panel studio-links-modal',
            },
        );

        const form = modal.root.querySelector('[data-pl-form]');
        if (!(form instanceof HTMLFormElement)) return;

        const displayRadios = () => [...form.querySelectorAll('input[name="display"]')];
        const currentDisplay = () =>
            normalizePublicLinkDisplay(displayRadios().find((el) => el instanceof HTMLInputElement && el.checked)?.value);
        const currentCardSpan = () =>
            normalizePublicLinkCardSpan(
                [...form.querySelectorAll('input[name="cardSpan"]')].find(
                    (el) => el instanceof HTMLInputElement && el.checked,
                )?.value,
            );
        const currentCardRows = () =>
            normalizePublicLinkCardRows(
                [...form.querySelectorAll('input[name="cardRows"]')].find(
                    (el) => el instanceof HTMLInputElement && el.checked,
                )?.value,
            );

        const syncMode = () => {
            const display = currentDisplay();
            const isCard = display === 'card';
            const sourceType = normalizePublicLinkSourceType(form.sourceType?.value);
            const buttonOnly = form.querySelector('[data-pl-button-only]');
            const cardOnly = form.querySelector('[data-pl-card-only]');
            const sourceItem = form.querySelector('[data-pl-source-item]');
            const applyBtn = form.querySelector('[data-pl-apply-source]');
            const presetsEl = form.querySelector('[data-pl-presets]');
            const urlHelp = form.querySelector('[data-pl-url-help]');
            if (buttonOnly instanceof HTMLElement) buttonOnly.hidden = isCard;
            if (cardOnly instanceof HTMLElement) cardOnly.hidden = !isCard;
            const showSource = sourceType !== 'url';
            if (sourceItem instanceof HTMLElement) sourceItem.hidden = !showSource;
            if (applyBtn instanceof HTMLElement) applyBtn.hidden = !showSource;
            if (presetsEl instanceof HTMLElement) presetsEl.hidden = sourceType !== 'url';
            if (urlHelp) {
                urlHelp.textContent = showSource
                    ? 'Filled from the selected artist, journal, or video. You can still edit it.'
                    : 'Internal path or https URL. This is the destination, not the button text.';
            }
        };

        const populateSourceItems = async () => {
            const sel = form.sourceId;
            if (!(sel instanceof HTMLSelectElement)) return;
            const type = normalizePublicLinkSourceType(form.sourceType?.value);
            if (type === 'url') {
                sel.innerHTML = '<option value="">— Select type first —</option>';
                sel.disabled = true;
                return;
            }
            sel.disabled = !canEdit;
            sel.innerHTML = '<option value="">Loading…</option>';
            try {
                const caches = await ensureCaches();
                const rows =
                    type === 'artist'
                        ? caches.artists
                        : type === 'journal'
                          ? caches.journals
                          : caches.videos;
                const options = listContentSourceOptions(type, Array.isArray(rows) ? rows : []);
                const current = String(link.sourceId || '');
                sel.innerHTML =
                    '<option value="">— Select —</option>' +
                    options
                        .map(
                            (o) =>
                                `<option value="${esc(o.id)}" ${o.id === current ? 'selected' : ''}>${esc(o.label)}</option>`,
                        )
                        .join('');
            } catch {
                sel.innerHTML = '<option value="">Could not load items</option>';
            }
        };

        const applySource = async () => {
            const type = normalizePublicLinkSourceType(form.sourceType?.value);
            const id = String(form.sourceId?.value || '').trim();
            if (type === 'url' || !id) return;
            const caches = await ensureCaches();
            const row = findPublicLinkSourceRow(type, id, caches);
            const href = resolvePublicLinkHrefFromSource(type, row || { id, slug: id });
            const label =
                resolvePublicLinkLabelFromSource(type, row || { id, slug: id }) ||
                String(form.sourceId?.selectedOptions?.[0]?.textContent || '').trim();
            if (form.href instanceof HTMLInputElement && href) form.href.value = href;
            if (form.label instanceof HTMLInputElement && label) form.label.value = label;
            if (form.eyebrow instanceof HTMLInputElement && !String(form.eyebrow.value || '').trim()) {
                form.eyebrow.value = defaultPublicLinkEyebrowFromSource(type);
            }
            const subtext = resolvePublicLinkSubtextFromSource(type, row || {});
            if (form.subtext instanceof HTMLInputElement && !String(form.subtext.value || '').trim() && subtext) {
                form.subtext.value = subtext;
            }
            const image = resolvePublicLinkImageFromSource(type, row || {});
            if (
                currentDisplay() === 'card' &&
                image &&
                form.imageUrl instanceof HTMLInputElement &&
                !sanitizePublicLinkImageUrl(form.imageUrl.value)
            ) {
                form.imageUrl.value = image;
                const thumb = form.querySelector('[data-pl-image-thumb]');
                if (thumb instanceof HTMLElement) {
                    thumb.style.backgroundImage = `url('${image}')`;
                }
            }
        };

        form.querySelectorAll('[data-pl-color]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const token = normalizePublicLinkColorToken(btn.getAttribute('data-pl-color'));
                if (form.colorToken instanceof HTMLInputElement) form.colorToken.value = token;
                form.querySelectorAll('[data-pl-color]').forEach((el) => {
                    el.classList.toggle('is-selected', el.getAttribute('data-pl-color') === token);
                });
            });
        });

        form.querySelector('[data-pl-pick-image]')?.addEventListener('click', async () => {
            if (!canEdit) return;
            const caches = await ensureCaches();
            await openSocialImagePickerModal({
                caches,
                media: caches.socialMedia,
                onSelect: (sel) => {
                    const url = sanitizePublicLinkImageUrl(sel?.url);
                    if (form.imageUrl instanceof HTMLInputElement) form.imageUrl.value = url;
                    const thumb = form.querySelector('[data-pl-image-thumb]');
                    if (thumb instanceof HTMLElement) {
                        thumb.style.backgroundImage = url ? `url('${url}')` : '';
                    }
                },
            });
        });

        displayRadios().forEach((el) => el.addEventListener('change', () => syncMode()));
        form.sourceType?.addEventListener('change', () => {
            syncMode();
            void populateSourceItems();
        });
        form.querySelector('[data-pl-apply-source]')?.addEventListener('click', () => void applySource());
        form.sourceId?.addEventListener('change', () => void applySource());

        form.querySelectorAll('[data-pl-preset]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const href = String(btn.getAttribute('data-pl-preset') || '');
                const label = String(btn.getAttribute('data-pl-preset-label') || '');
                if (form.href instanceof HTMLInputElement) form.href.value = href;
                if (form.label instanceof HTMLInputElement && !String(form.label.value || '').trim()) {
                    form.label.value = label;
                }
                if (form.sourceType instanceof HTMLSelectElement) form.sourceType.value = 'url';
                syncMode();
            });
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!canEdit) return;
            const label = String(form.label?.value || '').trim();
            const href = sanitizePublicLinkHref(form.href?.value);
            const display = currentDisplay();
            const imageUrl = sanitizePublicLinkImageUrl(form.imageUrl?.value);
            if (!label) {
                window.alert('Add a label — that is the text on /links.');
                return;
            }
            if (!href) {
                window.alert('Use a path like /artists or an https:// URL.');
                return;
            }
            if (display === 'card' && !imageUrl) {
                window.alert('Choose an image for this card.');
                return;
            }
            const next = normalizePublicLink({
                ...link,
                label,
                href,
                display,
                colorToken: form.colorToken?.value,
                imageUrl,
                sourceType: form.sourceType?.value,
                sourceId: form.sourceId?.value,
                cardSpan: currentCardSpan(),
                cardRows: currentCardRows(),
                eyebrow: form.eyebrow?.value,
                subtext: form.subtext?.value,
                ctaLabel: form.ctaLabel?.value,
                ctaStyle: normalizePublicLinkCtaStyle(
                    [...form.querySelectorAll('input[name="ctaStyle"]')].find(
                        (el) => el instanceof HTMLInputElement && el.checked,
                    )?.value,
                ),
                meta: form.meta?.value,
                sortOrder: Number(form.sortOrder?.value),
                enabled: Boolean(form.enabled?.checked),
            });
            if (!next) {
                window.alert('Could not save this link.');
                return;
            }
            await persist(upsertPublicLink(state.links, next));
            modal.close();
        });
        form.querySelector('[data-pl-delete]')?.addEventListener('click', async () => {
            if (!window.confirm('Remove this link from /links?')) return;
            await persist(removePublicLink(state.links, link.id));
            modal.close();
        });

        syncMode();
        if (link.sourceType && link.sourceType !== 'url') void populateSourceItems();
    }

    /**
     * @param {import('../../utils/publicLinksModel.js').PublicLink[]} next
     */
    async function persist(next) {
        try {
            state.links = await setPublicLinks(next);
            paint();
        } catch (err) {
            window.alert(err instanceof Error ? err.message : 'Could not save links.');
        }
    }

    try {
        state.links = await getPublicLinks();
    } catch {
        state.links = [];
    }
    paint();
}
