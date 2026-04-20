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

/**
 * Program page CTAs: show `#programApplicationWrap`, activate `#programApplicationSection`, scroll into view.
 * Signed-in users without a linked roster profile are still sent to profile setup first; guests go straight to the form.
 *
 * @returns {Promise<void>}
 */
export async function revealProgramApplicationOrOpenJoin() {
    const { getAuthSnapshot } = await import('./icAuth.js');
    const snap = await getAuthSnapshot();
    if (snap.authenticated) {
        try {
            const { getAccountForCaller } = await import('./database.js');
            const { getProfileSetupDraft } = await import('./profileSetupDraft.js');
            const acc = await getAccountForCaller();
            const linkedRaw = acc && typeof acc === 'object' ? acc.linkedArtistId ?? acc.linked_artist_id : null;
            const linkedId = Array.isArray(linkedRaw)
                ? linkedRaw.length
                    ? String(linkedRaw[0] ?? '').trim()
                    : ''
                : linkedRaw != null
                  ? String(linkedRaw).trim()
                  : '';
            if (!linkedId) {
                const draft = getProfileSetupDraft();
                window.dispatchEvent(
                    new CustomEvent('fusion-open-profile-setup', {
                        detail: { fullName: draft.fullName, email: draft.email },
                    })
                );
                return;
            }
        } catch {
            /* ignore and continue */
        }
    }
    const wrap = document.getElementById('programApplicationWrap');
    const formEl = document.getElementById('programApplicationSection');
    if (wrap) {
        wrap.removeAttribute('hidden');
        wrap.removeAttribute('inert');
    }
    if (formEl) {
        formEl.setAttribute('active', 'true');
    }
    const section = document.getElementById('programApplicationSection');
    scrollElementTopToViewportGap(section, PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX);
}
