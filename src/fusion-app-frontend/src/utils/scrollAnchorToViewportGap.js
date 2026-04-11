/** Scroll offset from the top of the viewport when focusing `#programApplicationSection` on program pages. */
export const PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX = 190;

/**
 * Find the nearest ancestor that scrolls vertically (same idea as app-application-form).
 * @param {Element} el
 * @returns {HTMLElement}
 */
function getScrollParent(el) {
    if (!el || !el.parentElement) return document.documentElement;
    let p = el.parentElement;
    while (p) {
        const st = getComputedStyle(p);
        const oy = st.overflowY;
        if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') {
            if (p.scrollHeight > p.clientHeight + 2) return p;
        }
        p = p.parentElement;
    }
    return document.documentElement;
}

/**
 * Scroll so `element`'s top edge sits `gapPx` below the top of the viewport
 * (or the nearest scroll parent’s visible top).
 *
 * @param {Element | null | undefined} element
 * @param {number} gapPx
 * @param {ScrollBehavior} [behavior]
 */
export function scrollElementTopToViewportGap(element, gapPx, behavior = 'smooth') {
    if (!element || typeof element.getBoundingClientRect !== 'function') return;
    const top = Number(gapPx);
    if (!Number.isFinite(top) || top < 0) return;

    const rect = element.getBoundingClientRect();
    const delta = rect.top - top;
    if (Math.abs(delta) <= 2) return;

    const scroller = getScrollParent(element);
    if (scroller === document.documentElement || scroller === document.body) {
        window.scrollBy({ top: delta, behavior });
        return;
    }
    scroller.scrollBy({ top: delta, behavior });
}
