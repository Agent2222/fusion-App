/**
 * SPA navigation guard for the program application form (`#programApplicationSection`).
 * The custom element sets `data-unsaved="true"` when the user edits the form.
 */

/** Shown in `window.confirm` before leaving the program page with unsaved edits. */
export const FUSION_PROGRAM_APPLICATION_LEAVE_CONFIRM =
    'Leave this page? Your application has not been submitted. Unsaved information will be lost.';

/**
 * @returns {boolean}
 */
export function isFusionProgramApplicationUnsaved() {
    const el = document.getElementById('programApplicationSection');
    return el instanceof HTMLElement && el.getAttribute('data-unsaved') === 'true';
}

/**
 * Normalize internal navigation target for comparison with `location.pathname`.
 * @param {string} path
 */
export function fusionNavPathnameOnly(path) {
    const raw = String(path ?? '').trim();
    if (!raw) return '/';
    const clean = raw.split('?')[0].split('#')[0];
    const withSlash = clean.startsWith('/') ? clean : `/${clean}`;
    try {
        const u = new URL(withSlash, window.location.origin);
        let p = u.pathname;
        if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
        return p || '/';
    } catch {
        return '/';
    }
}
