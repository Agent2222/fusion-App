/**
 * Client-side page gating from `config.pageStatus` (public vs dev using `DEV_MODE`).
 * When a page is gated, the router renders a shout + join-network shell instead of the real route module.
 */

import { config, DEV_MODE } from '../config.js';

/** @typedef {'home'|'programs'|'galleryAccess'|'editions'|'journal'|'community'|'context'} PageStatusKey */

/**
 * @param {unknown} entry
 * @returns {boolean}
 */
export function isPageAllowed(entry) {
    if (!entry || typeof entry !== 'object') return false;
    const st = /** @type {{ status?: { public?: unknown; dev?: unknown } }} */ (entry).status;
    if (!st || typeof st !== 'object') return false;
    const flag = DEV_MODE ? st.dev : st.public;
    return flag === true;
}

/**
 * Map pathname to `config.pageStatus` key, or `null` when this router does not gate the path.
 * @param {string} pathname
 * @returns {PageStatusKey | null}
 */
export function pathnameToPageStatusKey(pathname) {
    const path = String(pathname || '').split('?')[0] || '/';
    if (path === '/' || path === '') return 'home';
    if (path === '/gallery-access') return 'galleryAccess';
    if (path === '/community') return 'community';
    if (path === '/context') return 'context';

    if (path === '/programs' || path.startsWith('/program/') || path.startsWith('/programs/')) {
        return 'programs';
    }
    if (path === '/editions' || path.startsWith('/editions/')) return 'editions';
    if (path === '/journal' || path.startsWith('/journal/')) return 'journal';

    return null;
}

/**
 * @param {string} pathname
 * @returns {{ gated: boolean, copy?: { message: string, comingSoonMessage: string, comingSoonCopy: string }, pageKey?: PageStatusKey }}
 */
export function getGateStateForPath(pathname) {
    const pageKey = pathnameToPageStatusKey(pathname);
    if (!pageKey) return { gated: false };

    const ps = config.pageStatus;
    if (!ps || typeof ps !== 'object') return { gated: false };

    const entry = /** @type {Record<string, unknown>} */ (ps)[pageKey];
    if (!entry || typeof entry !== 'object') return { gated: false };

    const message = String(/** @type {{ message?: unknown }} */ (entry).message ?? '');
    const comingSoonMessage = String(/** @type {{ comingSoonMessage?: unknown }} */ (entry).comingSoonMessage ?? '');
    const comingSoonCopy = String(/** @type {{ comingSoonCopy?: unknown }} */ (entry).comingSoonCopy ?? '');

    if (isPageAllowed(entry)) {
        return { gated: false };
    }

    return {
        gated: true,
        pageKey,
        copy: { message, comingSoonMessage, comingSoonCopy },
    };
}

/**
 * @param {string} path
 * @param {PageStatusKey} pageKey
 */
function joinNetworkAttrsForGate(path, pageKey) {
    /** @type {{ context: string, modal: string, marginTop: string, marginBottom: string }} */
    const base = { context: 'home', modal: 'membership', marginTop: '', marginBottom: '96px' };
    if (pageKey === 'home') {
        return { ...base, context: 'home', modal: 'membership', marginTop: '', marginBottom: '200px' };
    }
    if (pageKey === 'programs') {
        const isDetail =
            path.startsWith('/program/') ||
            (path.startsWith('/programs/') && path.split('/').filter(Boolean).length > 1);
        return {
            context: 'programs',
            modal: isDetail ? 'apply' : 'membership',
            marginTop: isDetail ? '64px' : '0',
            marginBottom: '120px',
        };
    }
    if (pageKey === 'galleryAccess') {
        return { ...base, context: 'gallery-access', modal: 'access', marginTop: '48px', marginBottom: '96px' };
    }
    if (pageKey === 'editions') {
        return {
            context: 'editions',
            modal: 'access',
            marginTop: '48px',
            marginBottom: '96px',
        };
    }
    if (pageKey === 'journal') {
        return { ...base, context: 'journal', modal: 'membership', marginTop: '80px', marginBottom: '80px' };
    }
    if (pageKey === 'community') {
        return { ...base, context: 'community', modal: 'membership', marginTop: '100px', marginBottom: '0px' };
    }
    if (pageKey === 'context') {
        return { ...base, context: 'context', modal: 'membership', marginTop: '125px', marginBottom: '250px' };
    }
    return base;
}

/**
 * @param {{ message: string }} copy
 */
export function gatedShoutHtml(copy) {
    return `<div class="shoutHeadline" style="height: 40vh; margin-bottom: 50px;">${copy.message}</div>`;
}

/**
 * @param {{ comingSoonMessage: string, comingSoonCopy: string }} copy
 * @param {string} path
 * @param {PageStatusKey} pageKey
 */
export function gatedJoinHostHtml(copy, path, pageKey) {
    const j = joinNetworkAttrsForGate(path, pageKey);
    const titleEnc = encodeURIComponent(copy.comingSoonMessage);
    const descEnc = encodeURIComponent(copy.comingSoonCopy);
    return `
            <app-join-network
                id="fusion-gate-join-host"
                data-gate-band="1"
                data-hide-band-open-when-authenticated="1"
                data-gate-title-enc="${titleEnc}"
                data-gate-desc-enc="${descEnc}"
                data-modal-type="${j.modal}"
                context="${j.context}"
                active="true"
                data-margin-top="${j.marginTop}"
                data-margin-bottom="${j.marginBottom}"
            ></app-join-network>
    `;
}

/**
 * @param {{ message: string, comingSoonMessage: string, comingSoonCopy: string }} copy
 * @param {string} path
 * @param {PageStatusKey} pageKey
 */
function gatedCoreFragment(copy, path, pageKey) {
    return `
        ${gatedShoutHtml(copy)}
        <div class="page-content nav-page-content">
            ${gatedJoinHostHtml(copy, path, pageKey)}
        </div>
    `;
}

/**
 * Inner feed HTML for gated home (`/`): shout + join band (no header/footer — those stay in `router.js` to avoid circular/DOM imports in tests).
 * @param {{ message: string, comingSoonMessage: string, comingSoonCopy: string }} copy
 * @param {string} path
 * @param {PageStatusKey} pageKey
 */
export function renderGatedHomeInnerHtml(copy, path, pageKey) {
    return gatedCoreFragment(copy, path, pageKey);
}

/**
 * HTML fragment for `#mainContent` injection (non-home routes).
 * @param {string} path
 * @param {{ message: string, comingSoonMessage: string, comingSoonCopy: string }} copy
 * @param {PageStatusKey} pageKey
 */
export function renderGatedPageHtml(path, copy, pageKey) {
    const inner = gatedCoreFragment(copy, path, pageKey);

    if (pageKey === 'programs') {
        const isDetail =
            path.startsWith('/program/') ||
            (path.startsWith('/programs/') && path.split('/').filter(Boolean).length > 1);
        if (isDetail) {
            return `
                <div class="page program-view-page">
                    <main id="programViewMain" class="main-cont">
                        <div id="programViewMainContent" class="feed-container">
                            ${inner}
                        </div>
                    </main>
                </div>
            `;
        }
        return `
            <div class="page programs-page">
                <main id="programsMain" class="main-cont">
                    <div id="programsMainContent" class="feed-container">
                        ${inner}
                    </div>
                </main>
            </div>
        `;
    }

    if (pageKey === 'galleryAccess') {
        return `
            <div class="page gallery-access-page">
                <main id="galleryAccessMain" class="main-cont">
                    <div id="galleryAccessMainContent" class="feed-container">
                        ${inner}
                    </div>
                </main>
            </div>
        `;
    }

    if (pageKey === 'editions') {
        const isDetail = path.startsWith('/editions/') && path.split('/').filter(Boolean).length > 1;
        if (isDetail) {
            return `
                <div class="page edition-view-page">
                    <main id="editionViewMain" class="main-cont">
                        <div id="editionViewMainContent" class="feed-container">
                            <div class="page-content edition-view-content">
                                ${inner}
                            </div>
                        </div>
                    </main>
                </div>
            `;
        }
        return `
            <div class="page editions-page">
                <main id="editionsMain" class="main-cont">
                    <div id="editionsMainContent" class="feed-container">
                        ${inner}
                    </div>
                </main>
            </div>
        `;
    }

    if (pageKey === 'journal') {
        const isEntry = path.startsWith('/journal/entry/') && path.split('/').filter(Boolean).length > 2;
        if (isEntry) {
            return `
                <div class="page journal-entry-page">
                    <main id="journalEntryMain" class="main-cont">
                        <div id="journalEntryMainContent" class="feed-container">
                            <div class="page-content journal-entry-content">
                                ${inner}
                            </div>
                        </div>
                    </main>
                </div>
            `;
        }
        return `
            <div class="page journal-page">
                <main id="journalMain" class="main-cont">
                    <div id="journalMainContent" class="feed-container">
                        <div class="page-content nav-page-content journal-content">
                            ${gatedShoutHtml(copy)}
                            ${gatedJoinHostHtml(copy, path, pageKey)}
                        </div>
                    </div>
                </main>
            </div>
        `;
    }

    if (pageKey === 'community') {
        return inner;
    }

    if (pageKey === 'context') {
        return `
            <div class="page context-page">
                <main id="contextMain" class="main-cont">
                    <div id="contextMainContent" class="feed-container">
                        ${inner}
                    </div>
                </main>
            </div>
        `;
    }

    return inner;
}
