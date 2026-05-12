/**
 * Shared Studio “category page” fragments: header stat, filter bar, pill tabs, pagination shell.
 * Strings are HTML-escaped for static labels; pass pre-escaped values for dynamic bits when building outside.
 */

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
 * @param {{ title: string, subtitle?: string, countId: string, countLabel?: string }} opts
 */
export function studioPageHeaderHtml(opts) {
    const subtitle = opts.subtitle ? `<p class="studio-page-header__subtitle">${esc(opts.subtitle)}</p>` : '';
    const countLabel = opts.countLabel ?? 'Total';
    return `
<header class="studio-page-header">
  <div class="studio-page-header__text">
    <h2 class="studio-page-header__title">${esc(opts.title)}</h2>
    ${subtitle}
  </div>
  <div class="studio-page-header__stat" aria-live="polite" aria-label="${esc(countLabel)} count">
    <span class="studio-page-header__count" id="${esc(opts.countId)}">—</span>
    <span class="studio-page-header__count-label">${esc(countLabel)}</span>
  </div>
</header>`;
}

/**
 * Horizontal toolbar: search + optional trailing controls (HTML fragment).
 * @param {{ searchId: string, searchPlaceholder?: string, extraHtml?: string }} opts
 */
export function studioFilterBarHtml(opts) {
    const ph = opts.searchPlaceholder ?? 'Search…';
    const extra = opts.extraHtml ?? '';
    return `
<div class="studio-filter-bar">
  <label class="studio-filter-bar__search">
    <span class="studio-sr-only">Search</span>
    <input type="search" id="${esc(opts.searchId)}" class="studio-input studio-filter-bar__input" placeholder="${esc(ph)}" autocomplete="off" />
  </label>
  ${extra ? `<div class="studio-filter-bar__extra">${extra}</div>` : ''}
</div>`;
}

/**
 * Pill tabs for client-side filters (Applicants status, etc.).
 * @param {{ ariaLabel: string, tabs: { id: string, label: string, value: string, active?: boolean }[] }} opts
 */
export function studioDataTabsHtml(opts) {
    const buttons = opts.tabs
        .map((t) => {
            const active = t.active ? ' is-active' : '';
            return `<button type="button" class="studio-data-tabs__tab${active}" role="tab" aria-selected="${t.active ? 'true' : 'false'}" tabindex="${t.active ? '0' : '-1'}" data-tab-value="${esc(t.value)}" id="${esc(t.id)}">${esc(t.label)}</button>`;
        })
        .join('');
    return `
<div class="studio-data-tabs" role="tablist" aria-label="${esc(opts.ariaLabel)}">
  ${buttons}
</div>`;
}

/**
 * Pagination with optional numbered page buttons container.
 * @param {{ navId: string, prevId: string, nextId: string, labelId: string, numbersId: string }} opts
 */
export function studioPaginationBarHtml(opts) {
    return `
<nav class="studio-pagination studio-pagination--full" id="${esc(opts.navId)}" aria-label="Pages">
  <button type="button" class="studio-btn-ghost studio-pagination__prev" id="${esc(opts.prevId)}" aria-label="Previous page">Prev</button>
  <div class="studio-pagination__numbers" id="${esc(opts.numbersId)}"></div>
  <span class="studio-pagination__label" id="${esc(opts.labelId)}"></span>
  <button type="button" class="studio-btn-ghost studio-pagination__next" id="${esc(opts.nextId)}" aria-label="Next page">Next</button>
</nav>`;
}
