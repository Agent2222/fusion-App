/**
 * Fusion Studio — full-page admin shell (no public marketing header/footer).
 */
import '../styles/studio.css';
import { navigate } from '../router.js';
import {
    STUDIO_NAV,
    STUDIO_NAV_GROUPS,
    STUDIO_DASHBOARD_ID,
    sectionTitle,
    renderStudioMain,
    initStudioMain,
} from './studio/panels.js';
import { escapeHtml } from '../utils/textPreview.js';
import {
    resetStudioWorkspaceTrail,
    setStudioWorkspaceSectionTitle,
} from './studio/studioWorkspaceChrome.js';
import { refreshStudioShellAccessState } from '../utils/database.js';
import {
    getStudioShellGate,
    isStudioSectionNavAllowed,
    setStudioShellGate,
    studioFeatureAccess,
} from '../utils/studioShellState.js';
import { studioIconHref } from '../utils/studioIconRegistry.js';
import studioWordmarkLogo from '../assets/Fusion-X-logo-03.png';

function normalizeHash() {
    const raw = (window.location.hash || '').replace(/^#/, '').trim().toLowerCase();
    const gate = getStudioShellGate();
    const valid = new Set([
        STUDIO_DASHBOARD_ID,
        ...STUDIO_NAV.map((n) => n.id),
        ...(gate.permissionsNavAllowed ? ['permissions'] : []),
        ...(gate.teamNavAllowed ? ['team'] : []),
    ]);
    if (!raw || !valid.has(raw)) return STUDIO_DASHBOARD_ID;
    if (!isStudioSectionNavAllowed(raw)) return STUDIO_DASHBOARD_ID;
    return raw;
}

/**
 * @param {string} activeId
 */
function buildStudioNavButtonsHtml(activeId) {
    const gate = getStudioShellGate();
    /** @type {{ label: string, items: { id: string, label: string }[] }[]} */
    const adminItems = [];
    if (gate.teamNavAllowed) {
        adminItems.push({ id: 'team', label: 'Team' });
    }
    if (gate.permissionsNavAllowed) {
        adminItems.push({ id: 'permissions', label: 'Permissions' });
    }
    const withAdmin = adminItems.length
        ? [...STUDIO_NAV_GROUPS, { label: 'Admin', items: adminItems }]
        : STUDIO_NAV_GROUPS;
    const chunks = [];
    for (const g of withAdmin) {
        const items = g.items.filter((n) => isStudioSectionNavAllowed(n.id));
        if (!items.length) {
            continue;
        }
        const groupLabel = escapeHtml(g.label);
        const groupKey = groupLabel.toLowerCase();
        const groupIcon = studioIconHref(`group-${groupKey}`);
        const groupInner = items
            .map((item) => {
                const active = item.id === activeId ? ' is-active' : '';
                const idHtml = escapeHtml(item.id);
                const itemIcon = studioIconHref(`nav-${item.id}`);
                return `<button type="button" class="studio-nav-item${active}" data-studio-section="${idHtml}">
                  <span class="studio-nav-item__icon" aria-hidden="true">${
                      itemIcon
                          ? `<img src="${escapeHtml(itemIcon)}" alt="" />`
                          : '<span class="studio-nav-item__icon-fallback">•</span>'
                  }</span>
                  <span class="studio-nav-item__label">${escapeHtml(item.label)}</span>
                </button>`;
            })
            .join('');
        chunks.push(
            `<div class="studio-nav-group" role="group" aria-label="${groupLabel}">
              <div class="studio-nav-group__label"><span class="studio-nav-group__icon" aria-hidden="true">${
                  groupIcon
                      ? `<img src="${escapeHtml(groupIcon)}" alt="" />`
                      : '<span class="studio-nav-group__icon-fallback">·</span>'
              }</span>${groupLabel}</div>
              <div class="studio-nav-group__items">${groupInner}</div>
            </div>`
        );
    }
    return chunks.join('');
}

function renderNavButtons(activeId) {
    return buildStudioNavButtonsHtml(activeId);
}

export function render() {
    const initial = normalizeHash();
    return `
        <div class="studio-app" id="studioRoot">
            <div class="studio-nav-backdrop" id="studioNavBackdrop" hidden aria-hidden="true"></div>
            <aside class="studio-sidebar" id="studioSidebar" aria-label="Studio navigation">
                <a class="studio-back" href="/">← Public site</a>
                <button type="button" class="studio-wordmark studio-wordmark-btn" id="studioWordmark" aria-label="Fusion Studio">
                    <img class="studio-wordmark-logo" src="${studioWordmarkLogo}" alt="Fusion" />
                </button>
                <nav class="studio-nav" id="studioNav">
                    ${renderNavButtons(initial)}
                </nav>
                <div class="studio-sidebar-footer">
                    <div class="studio-avatar" aria-hidden="true">A</div>
                    <div class="studio-user-meta">
                        <span>Admin</span>
                        <span>Studio</span>
                    </div>
                </div>
            </aside>
            <div class="studio-workspace">
                <header class="studio-topbar">
                    <button type="button" class="studio-menu-btn" id="studioMenuBtn" aria-label="Open navigation menu" aria-expanded="false" aria-controls="studioNav">
                        <span class="studio-menu-btn__bars" aria-hidden="true"></span>
                    </button>
                    <h1 id="studioSectionHeading">${sectionTitle(initial)}</h1>
                    <div class="studio-topbar-actions">
                        <span class="studio-topbar-admin-label">Admin</span>
                        <button type="button" class="studio-topbar-account-btn" id="studioAccountBtn" aria-label="Account dashboard">Account</button>
                        <button type="button" id="studioSettingsBtn" aria-label="Settings">
                            <span class="studio-topbar-settings-icon" aria-hidden="true">◦</span>
                        </button>
                    </div>
                </header>
                <div class="studio-workspace-rail">
                    <nav class="studio-breadcrumb" id="studioWorkspaceBreadcrumb" aria-label="Workspace location">
                        <button type="button" class="studio-breadcrumb__root" id="studioBreadcrumbStudio">Studio</button>
                        <span class="studio-breadcrumb__sep" aria-hidden="true">·</span>
                        <span class="studio-breadcrumb__current" id="studioBreadcrumbSection">${sectionTitle(initial)}</span>
                        <span class="studio-breadcrumb__trail" id="studioBreadcrumbTrail" hidden></span>
                    </nav>
                    <aside class="studio-workspace-toc" id="studioWorkspaceToc" hidden aria-label="On this page"></aside>
                </div>
                <main id="studioMainContent" class="studio-main" data-studio-section="${initial}">
                    ${renderStudioMain(initial)}
                </main>
                <div
                    id="studioAccountOverlay"
                    class="studio-account-overlay"
                    hidden
                    aria-hidden="true"
                >
                    <div
                        class="studio-account-overlay__scrim"
                        id="studioAccountOverlayScrim"
                        aria-hidden="true"
                    ></div>
                    <div
                        class="studio-account-overlay__panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="studioAccountOverlayTitle"
                    >
                        <div class="studio-account-overlay__toolbar">
                            <h2 id="studioAccountOverlayTitle" class="studio-account-overlay__title">Account</h2>
                            <button type="button" class="studio-btn-primary" id="studioAccountOverlayClose">
                                Close
                            </button>
                        </div>
                        <div id="studioAccountOverlayBody" class="studio-account-overlay__body"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function setHash(sectionId) {
    const next = `#${sectionId}`;
    if (window.location.hash !== next) {
        window.location.hash = next;
    }
}

const NAV_DRAWER_MQ = '(max-width: 768px)';

function isStudioMobileNav() {
    return typeof window !== 'undefined' && window.matchMedia(NAV_DRAWER_MQ).matches;
}

/** Prevent stacking `hashchange` listeners when `initStudio` re-runs (e.g. `fusion-localechange` → `handleRoute`). */
let _studioHashChangeHandler = /** @type {(() => void) | null} */ (null);
/** @type {(() => void) | null} */
let _studioShellRefreshHandler = null;

/** Account overlay: lazy-embed settings profile (single init per Studio mount). */
let _studioAccountOverlayInited = false;
/** @type {((e: KeyboardEvent) => void) | null} */
let _studioAccountOverlayKeydown = null;

export default function initStudio() {
    const root = document.getElementById('studioRoot');
    const main = document.getElementById('studioMainContent');
    const nav = document.getElementById('studioNav');
    const accountBtn = document.getElementById('studioAccountBtn');
    const settingsBtn = document.getElementById('studioSettingsBtn');
    const wordmark = document.getElementById('studioWordmark');
    const menuBtn = document.getElementById('studioMenuBtn');
    const backdrop = document.getElementById('studioNavBackdrop');

    if (!main || !nav) return;

    const mq = typeof window.matchMedia === 'function' ? window.matchMedia(NAV_DRAWER_MQ) : null;

    const setStudioNavOpen = (open) => {
        if (!root) return;
        root.dataset.navOpen = open ? 'true' : 'false';
        if (backdrop) {
            backdrop.hidden = !open;
            backdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
        }
        if (menuBtn) {
            menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
            menuBtn.setAttribute(
                'aria-label',
                open ? 'Close navigation menu' : 'Open navigation menu'
            );
        }
        if (open && isStudioMobileNav()) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    };

    const closeNavIfMobile = () => {
        if (isStudioMobileNav()) setStudioNavOpen(false);
    };

    menuBtn?.addEventListener('click', () => {
        const open = root?.dataset.navOpen !== 'true';
        setStudioNavOpen(open);
    });

    backdrop?.addEventListener('click', () => setStudioNavOpen(false));

    mq?.addEventListener('change', (e) => {
        if (!e.matches) setStudioNavOpen(false);
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && root?.dataset.navOpen === 'true') {
            setStudioNavOpen(false);
        }
    });

    const applySection = async (sectionId) => {
        let id = String(sectionId || normalizeHash() || STUDIO_DASHBOARD_ID)
            .trim()
            .toLowerCase();
        if (!isStudioSectionNavAllowed(id)) {
            id = STUDIO_DASHBOARD_ID;
            setHash(id);
        }
        // Always resolve live nodes — `fusion-localechange` / full route re-render replaces `#app` but
        // a previous `window` hash listener may still run; captured `main`/`nav` would point at detached DOM.
        const mainEl = document.getElementById('studioMainContent');
        const headingEl = document.getElementById('studioSectionHeading');
        const navEl = document.getElementById('studioNav');
        if (!mainEl || !navEl) return;
        const title = sectionTitle(id);
        if (headingEl) headingEl.textContent = title;
        setStudioWorkspaceSectionTitle(title);
        resetStudioWorkspaceTrail();
        mainEl.dataset.studioSection = id;
        mainEl.innerHTML = renderStudioMain(id);
        navEl.querySelectorAll('.studio-nav-item').forEach((btn) => {
            const sid = btn.getAttribute('data-studio-section');
            btn.classList.toggle('is-active', sid === id && id !== STUDIO_DASHBOARD_ID);
        });
        await initStudioMain(id, mainEl);
    };

    const attachStudioNavClickHandlers = (navEl) => {
        navEl.querySelectorAll('.studio-nav-item').forEach((btn) => {
            btn.addEventListener('click', () => {
                const sid = btn.getAttribute('data-studio-section');
                if (!sid) return;
                setHash(sid);
                void applySection(sid);
                closeNavIfMobile();
            });
        });
    };

    const refreshShellAndNav = async () => {
        const shell = await refreshStudioShellAccessState();
        setStudioShellGate(shell);
        const navEl = document.getElementById('studioNav');
        if (navEl) {
            navEl.innerHTML = buildStudioNavButtonsHtml(normalizeHash());
            attachStudioNavClickHandlers(navEl);
        }
        if (settingsBtn) {
            settingsBtn.hidden = !studioFeatureAccess('settings').visible;
        }
        const raw = (window.location.hash || '').replace(/^#/, '').trim().toLowerCase();
        if (raw === 'permissions' && !shell.permissionsNavAllowed) {
            setHash(STUDIO_DASHBOARD_ID);
        }
        if (raw === 'team' && !shell.teamNavAllowed) {
            setHash(STUDIO_DASHBOARD_ID);
        }
        await applySection(normalizeHash());
    };

    if (_studioShellRefreshHandler) {
        window.removeEventListener('fusion-studio-shell-refresh', _studioShellRefreshHandler);
    }
    _studioShellRefreshHandler = () => {
        void refreshShellAndNav();
    };
    window.addEventListener('fusion-studio-shell-refresh', _studioShellRefreshHandler);

    const overlay = document.getElementById('studioAccountOverlay');
    const overlayBody = document.getElementById('studioAccountOverlayBody');
    const overlayScrim = document.getElementById('studioAccountOverlayScrim');
    const overlayClose = document.getElementById('studioAccountOverlayClose');

    if (overlayBody && !String(overlayBody.innerHTML || '').trim()) {
        _studioAccountOverlayInited = false;
    }

    const closeStudioAccountOverlay = () => {
        if (!overlay) return;
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        accountBtn?.focus();
    };

    const openStudioAccountOverlay = async () => {
        if (!overlay || !overlayBody) return;
        if (!_studioAccountOverlayInited) {
            const mod = await import('./settingsProfile.js');
            overlayBody.innerHTML = mod.generateSettingsProfileContent();
            mod.default();
            _studioAccountOverlayInited = true;
        }
        overlay.hidden = false;
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        overlayClose?.focus();
    };

    accountBtn?.addEventListener('click', () => {
        void openStudioAccountOverlay();
    });

    overlayClose?.addEventListener('click', () => closeStudioAccountOverlay());
    overlayScrim?.addEventListener('click', () => closeStudioAccountOverlay());

    if (_studioAccountOverlayKeydown) {
        window.removeEventListener('keydown', _studioAccountOverlayKeydown);
    }
    _studioAccountOverlayKeydown = (e) => {
        if (e.key !== 'Escape') return;
        if (!overlay || overlay.hidden) return;
        e.preventDefault();
        closeStudioAccountOverlay();
    };
    window.addEventListener('keydown', _studioAccountOverlayKeydown);

    settingsBtn?.addEventListener('click', () => {
        if (!studioFeatureAccess('settings').visible) return;
        setHash('settings');
        void applySection('settings');
        closeNavIfMobile();
    });

    wordmark?.addEventListener('click', () => {
        setHash(STUDIO_DASHBOARD_ID);
        applySection(STUDIO_DASHBOARD_ID);
        closeNavIfMobile();
    });

    document.getElementById('studioBreadcrumbStudio')?.addEventListener('click', () => {
        setHash(STUDIO_DASHBOARD_ID);
        void applySection(STUDIO_DASHBOARD_ID);
        closeNavIfMobile();
    });

    if (_studioHashChangeHandler) {
        window.removeEventListener('hashchange', _studioHashChangeHandler);
    }
    _studioHashChangeHandler = () => {
        void applySection(normalizeHash());
    };
    window.addEventListener('hashchange', _studioHashChangeHandler);

    void refreshShellAndNav();

    const publicLink = document.querySelector('.studio-back');
    publicLink?.addEventListener('click', (e) => {
        e.preventDefault();
        navigate('/');
    });
}
