/** Scroll offset from the top of the viewport when focusing `#programApplicationSection` on program pages. */
export const PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX = 190;

/**
 * Find the nearest ancestor that scrolls vertically (same idea as app-application-form).
 * Pierces open shadow roots so targets inside custom elements still find `#mainContent` / `.main-cont`.
 * @param {Element} el
 * @returns {HTMLElement}
 */
function getScrollParent(el) {
    if (!el) return document.documentElement;

    /**
     * @param {Element | null} node
     * @returns {Element | null}
     */
    const parentCrossingShadow = (node) => {
        if (!node) return null;
        if (node.parentElement) return node.parentElement;
        const root = typeof node.getRootNode === 'function' ? node.getRootNode() : null;
        if (root instanceof ShadowRoot && root.host instanceof Element) {
            return root.host;
        }
        return null;
    };

    let p = parentCrossingShadow(el);
    while (p) {
        const st = getComputedStyle(p);
        const oy = st.overflowY;
        if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') {
            if (p.scrollHeight > p.clientHeight + 2) {
                return /** @type {HTMLElement} */ (p);
            }
        }
        p = parentCrossingShadow(p);
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
 * Signed-in users without a linked roster profile are sent to profile setup first.
 * @returns {Promise<boolean>} true if the caller should continue revealing a form
 */
async function ensureLinkedArtistOrOpenProfileSetup() {
    const { getAuthSnapshot } = await import('./icAuth.js');
    const snap = await getAuthSnapshot();
    if (!snap.authenticated) return true;
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
                }),
            );
            return false;
        }
    } catch {
        /* ignore and continue */
    }
    return true;
}

/**
 * Resolve program id from the draw or application form on the page.
 * @returns {string}
 */
function currentProgramPageId() {
    const drawForm = document.getElementById('programDrawFormSection');
    if (drawForm instanceof HTMLElement) {
        const fromDraw = String(drawForm.getAttribute('data-program-id') || '').trim();
        if (fromDraw) return fromDraw;
    }
    const applyForm = document.getElementById('programApplicationSection');
    if (applyForm instanceof HTMLElement) {
        return String(applyForm.getAttribute('data-program-id') || '').trim();
    }
    return '';
}

/**
 * Scroll to the draw “You’re entered” / withdraw panel inside the draw form shadow.
 * @param {HTMLElement | null} drawForm
 */
function scrollToDrawEnteredPanel(drawForm) {
    if (!(drawForm instanceof HTMLElement)) return;
    const panel = drawForm.shadowRoot?.querySelector('#draw-applied-panel');
    scrollElementTopToViewportGap(
        panel instanceof Element ? panel : drawForm,
        PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX,
    );
}

/**
 * Show one form and fully hide the other so they replace each other in the wrap.
 * @param {'apply' | 'draw'} mode
 * @param {{ scrollToEntered?: boolean }} [opts]
 * @returns {Promise<void>}
 */
async function revealProgramFormMode(mode, opts = {}) {
    const wrap = document.getElementById('programApplicationWrap');
    const applyForm = document.getElementById('programApplicationSection');
    const drawForm = document.getElementById('programDrawFormSection');
    const details = document.getElementById('programDetailsSection');
    if (wrap) {
        wrap.removeAttribute('hidden');
        wrap.removeAttribute('inert');
    }
    if (mode === 'draw') {
        if (applyForm instanceof HTMLElement) {
            applyForm.setAttribute('active', 'false');
            applyForm.setAttribute('hidden', '');
            applyForm.hidden = true;
        }
        if (drawForm instanceof HTMLElement) {
            drawForm.removeAttribute('hidden');
            drawForm.hidden = false;
            // Force a re-render even if `active` was already "true" from a prior open.
            if (drawForm.getAttribute('active') === 'true') {
                drawForm.setAttribute('active', 'false');
            }
            drawForm.setAttribute('active', 'true');
            if (typeof drawForm.refresh === 'function') {
                await drawForm.refresh();
            }
        }
        if (details && typeof /** @type {{ setFormMode?: (m: string) => void }} */ (details).setFormMode === 'function') {
            /** @type {{ setFormMode: (m: string) => void }} */ (details).setFormMode('draw');
        }
        if (opts.scrollToEntered) {
            scrollToDrawEnteredPanel(drawForm instanceof HTMLElement ? drawForm : null);
        } else {
            scrollElementTopToViewportGap(drawForm, PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX);
        }
        return;
    }
    if (drawForm instanceof HTMLElement) {
        drawForm.setAttribute('active', 'false');
        drawForm.setAttribute('hidden', '');
        drawForm.hidden = true;
    }
    if (applyForm instanceof HTMLElement) {
        applyForm.removeAttribute('hidden');
        applyForm.hidden = false;
        applyForm.setAttribute('active', 'true');
    }
    if (details && typeof /** @type {{ setFormMode?: (m: string) => void }} */ (details).setFormMode === 'function') {
        /** @type {{ setFormMode: (m: string) => void }} */ (details).setFormMode('apply');
    }
    scrollElementTopToViewportGap(applyForm, PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX);
    if (applyForm && typeof applyForm.notifyApplicationFunnelRevealed === 'function') {
        applyForm.notifyApplicationFunnelRevealed();
    }
}

/**
 * Program page CTAs: show `#programApplicationWrap`, activate `#programApplicationSection`, scroll into view.
 * Signed-in users without a linked roster profile are still sent to profile setup first; guests go straight to the form.
 * While the caller has an active Program Draw (award) entry for this program, opens the draw entered/withdraw
 * panel instead of the formal application form.
 *
 * @returns {Promise<void>}
 */
export async function revealProgramApplicationOrOpenJoin() {
    if (!(await ensureLinkedArtistOrOpenProfileSetup())) return;

    const programId = currentProgramPageId();
    if (programId) {
        try {
            const { getAuthSnapshot } = await import('./icAuth.js');
            const snap = await getAuthSnapshot();
            if (snap?.authenticated) {
                const { getMyProgramPath } = await import('./database.js');
                const path = String((await getMyProgramPath(programId)) || '').trim();
                if (path === 'award') {
                    await revealProgramFormMode('draw', { scrollToEntered: true });
                    return;
                }
            }
        } catch {
            /* fall through to apply */
        }
    }

    await revealProgramFormMode('apply');
}

/**
 * Warm Program Draw display cache (CMS + past recipients).
 * @param {string} [programId]
 */
function preloadProgramDrawDisplay(programId = '') {
    void import('../components/subComponents/program-draw-display.js').then((m) => {
        if (typeof m.preloadProgramDrawDisplayData === 'function') {
            void m.preloadProgramDrawDisplayData(programId);
        }
    });
}

/**
 * Program page draw CTAs when the draw is active: auth/profile gate, then show draw form.
 *
 * @returns {Promise<void>}
 */
export async function revealProgramDrawFormOrOpenJoin() {
    const drawForm = document.getElementById('programDrawFormSection');
    const programId =
        drawForm instanceof HTMLElement
            ? String(drawForm.getAttribute('data-program-id') || '').trim()
            : '';
    preloadProgramDrawDisplay(programId);
    if (!(await ensureLinkedArtistOrOpenProfileSetup())) return;
    await revealProgramFormMode('draw');
}

/**
 * Inactive Program Draw: open the display-only panel without membership/profile gate
 * so guests can use Get Notified.
 *
 * @returns {Promise<void>}
 */
export async function revealProgramDrawInactivePanel() {
    const drawForm = document.getElementById('programDrawFormSection');
    const programId =
        drawForm instanceof HTMLElement
            ? String(drawForm.getAttribute('data-program-id') || '').trim()
            : '';
    preloadProgramDrawDisplay(programId);
    await revealProgramFormMode('draw');
}
