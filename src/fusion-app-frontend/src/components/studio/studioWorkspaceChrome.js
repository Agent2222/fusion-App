/**
 * DOM helpers for Studio workspace chrome (breadcrumb trail, TOC slot).
 * Kept separate from `studio.js` / `panels.js` to avoid circular imports when sections call into chrome.
 */

const TRAIL_ID = 'studioBreadcrumbTrail';
const SECTION_ID = 'studioBreadcrumbSection';
const TOC_ID = 'studioWorkspaceToc';

/**
 * @param {string} [label] Extra segment after section (e.g. active Content page title). Empty clears.
 */
export function setStudioWorkspaceTrail(label) {
    const el = typeof document !== 'undefined' ? document.getElementById(TRAIL_ID) : null;
    if (!el) return;
    const t = String(label || '').trim();
    if (!t) {
        el.textContent = '';
        el.hidden = true;
        return;
    }
    el.textContent = ` · ${t}`;
    el.hidden = false;
}

export function resetStudioWorkspaceTrail() {
    setStudioWorkspaceTrail('');
}

/**
 * @param {string} title Section title (matches top bar / nav).
 */
export function setStudioWorkspaceSectionTitle(title) {
    const el = typeof document !== 'undefined' ? document.getElementById(SECTION_ID) : null;
    if (el) el.textContent = title || 'Studio';
}

/**
 * Reserved for long editors: populate `#studioWorkspaceToc` with anchor links.
 * @param {{ id: string, label: string }[]} [items]
 */
export function setStudioWorkspaceTocItems(items) {
    const aside = typeof document !== 'undefined' ? document.getElementById(TOC_ID) : null;
    if (!aside) return;
    if (!items || !items.length) {
        aside.innerHTML = '';
        aside.hidden = true;
        return;
    }
    aside.hidden = false;
    aside.innerHTML = `<span class="studio-workspace-toc__label">On this page</span><ul class="studio-workspace-toc__list">${items
        .map(
            (it) =>
                `<li><a href="#${escapeAttr(it.id)}" class="studio-workspace-toc__link">${escapeHtml(it.label)}</a></li>`,
        )
        .join('')}</ul>`;
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;');
}
