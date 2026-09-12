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
import {
    adminGetStudioPermissionDefaultsStudio,
    refreshStudioShellAccessState,
} from '../utils/database.js';
import { getAuthSnapshot, loginInternetIdentity } from '../utils/icAuth.js';
import {
    getStudioShellGate,
    isStudioSectionNavAllowed,
    setStudioShellGate,
    studioFeatureAccess,
} from '../utils/studioShellState.js';
import { studioGroupIconHref, studioNavIconHref } from '../utils/studioIconRegistry.js';
import studioWordmarkLogo from '../assets/Fusion-X-logo-03.png';
import { isRadarPreviewActive } from '../utils/radarPreview.js';
import { isBroadcastsPreviewActive } from '../utils/broadcastsPreview.js';
import { isScheduledTasksPreviewActive } from '../utils/scheduledTasksPreview.js';
import {
    mergeStudioPermissionMap,
    parseStudioPermissionMatrixTuples,
} from '../utils/studioPermissionFeatures.js';
import {
    applyStudioRolePreviewToGate,
    getStudioRolePreview,
    isStudioRolePreviewActive,
    setStudioRolePreview,
    studioRolePreviewInitial,
    studioRolePreviewLabel,
    studioRolePreviewMenuItems,
} from '../utils/studioRolePreview.js';

function isStudioDevPreviewActive() {
    return isRadarPreviewActive() || isBroadcastsPreviewActive() || isScheduledTasksPreviewActive();
}

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
        const groupIcon = studioGroupIconHref(g.label);
        const groupInner = items
            .map((item) => {
                const active = item.id === activeId ? ' is-active' : '';
                const idHtml = escapeHtml(item.id);
                const itemIcon = studioNavIconHref(item.id);
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
                <div class="studio-sidebar-footer-wrap">
                    <button
                        type="button"
                        class="studio-sidebar-footer"
                        id="studioSidebarFooter"
                        aria-haspopup="menu"
                        aria-expanded="false"
                        aria-controls="studioRolePreviewMenu"
                        aria-disabled="true"
                    >
                        <div class="studio-avatar" id="studioSidebarAvatar" aria-hidden="true">A</div>
                        <div class="studio-user-meta">
                            <span id="studioSidebarRoleLabel">Admin</span>
                            <span id="studioSidebarRoleHint">Studio</span>
                        </div>
                        <span class="studio-sidebar-footer-caret" id="studioSidebarRoleCaret" hidden aria-hidden="true"></span>
                    </button>
                    <div
                        id="studioRolePreviewMenu"
                        class="studio-role-preview-menu"
                        hidden
                        role="menu"
                        aria-labelledby="studioRolePreviewMenuTitle"
                    >
                        <p class="studio-role-preview-menu__title" id="studioRolePreviewMenuTitle">View Studio as</p>
                        <div class="studio-role-preview-menu__list" id="studioRolePreviewMenuList"></div>
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
                        <span class="studio-topbar-admin-label" id="studioTopbarRoleLabel">Admin</span>
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
            <div
                class="studio-auth-gate"
                id="studioAuthGate"
                hidden
                aria-hidden="true"
            >
                <div class="studio-auth-gate__scrim" aria-hidden="true"></div>
                <div
                    class="studio-auth-gate__panel"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="studioAuthGateTitle"
                >
                    <h2 id="studioAuthGateTitle" class="studio-auth-gate__title">Fusion Studio</h2>
                    <p class="studio-auth-gate__text">Sign in with Internet Identity to continue.</p>
                    <button type="button" class="studio-btn-primary" id="studioAuthGateLogin">Log in</button>
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

/**
 * @param {{
 *   isAdmin?: boolean,
 *   isSuperStaff?: boolean,
 *   permissionsNavAllowed?: boolean,
 *   teamNavAllowed?: boolean,
 *   effectiveMatrix?: Map<string, { visible: boolean, canEdit: boolean }> | null,
 * }} shell
 */
async function overlayStudioRolePreview(shell) {
    if (!shell?.isAdmin) {
        return applyStudioRolePreviewToGate(shell, 'admin', null);
    }
    const role = getStudioRolePreview();
    if (role === 'admin') {
        return applyStudioRolePreviewToGate(shell, 'admin', null);
    }
    try {
        const tuples = await adminGetStudioPermissionDefaultsStudio(role);
        const matrix = mergeStudioPermissionMap(parseStudioPermissionMatrixTuples(tuples));
        return applyStudioRolePreviewToGate(shell, role, matrix);
    } catch {
        setStudioRolePreview('admin');
        return applyStudioRolePreviewToGate(shell, 'admin', null);
    }
}

function paintStudioRolePreviewChrome() {
    const gate = getStudioShellGate();
    const canPreview = Boolean(gate.isAdmin);
    const role = canPreview ? (gate.previewRole || getStudioRolePreview() || 'admin') : 'admin';
    const previewing = canPreview && isStudioRolePreviewActive(role);
    const label = studioRolePreviewLabel(role);
    const footer = document.getElementById('studioSidebarFooter');
    const avatar = document.getElementById('studioSidebarAvatar');
    const roleLabel = document.getElementById('studioSidebarRoleLabel');
    const roleHint = document.getElementById('studioSidebarRoleHint');
    const caret = document.getElementById('studioSidebarRoleCaret');
    const topbar = document.getElementById('studioTopbarRoleLabel');
    const root = document.getElementById('studioRoot');
    if (avatar) avatar.textContent = studioRolePreviewInitial(role);
    if (roleLabel) roleLabel.textContent = label;
    if (roleHint) roleHint.textContent = previewing ? 'Preview' : 'Studio';
    if (topbar) {
        topbar.textContent = previewing ? `${label} preview` : label;
        topbar.classList.toggle('is-preview', previewing);
    }
    if (root) {
        if (previewing) root.setAttribute('data-studio-role-preview', role);
        else root.removeAttribute('data-studio-role-preview');
    }
    if (footer) {
        footer.classList.toggle('is-role-preview-enabled', canPreview);
        footer.setAttribute('aria-disabled', canPreview ? 'false' : 'true');
        footer.setAttribute(
            'aria-label',
            canPreview ? `View Studio as ${label}. Open role preview.` : label,
        );
    }
    if (caret) caret.hidden = !canPreview;
    const list = document.getElementById('studioRolePreviewMenuList');
    if (list) {
        list.innerHTML = studioRolePreviewMenuItems(role)
            .map((item) => {
                const selected = item.selected ? ' is-selected' : '';
                return `<button type="button" class="studio-role-preview-menu__item${selected}" role="menuitemradio" aria-checked="${item.selected ? 'true' : 'false'}" data-studio-role-preview="${escapeHtml(item.id)}">${escapeHtml(item.label)}</button>`;
            })
            .join('');
    }
}

/**
 * @param {boolean} open
 */
function setStudioRolePreviewMenuOpen(open) {
    const footer = document.getElementById('studioSidebarFooter');
    const menu = document.getElementById('studioRolePreviewMenu');
    if (!footer || !menu) return;
    const canPreview = footer.classList.contains('is-role-preview-enabled');
    const next = Boolean(open) && canPreview;
    menu.hidden = !next;
    footer.setAttribute('aria-expanded', next ? 'true' : 'false');
    footer.classList.toggle('is-menu-open', next);
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
/** @type {(() => void) | null} */
let _studioAuthChangeHandler = null;
/** @type {((e: MouseEvent) => void) | null} */
let _studioRolePreviewDocClick = null;
/** @type {((e: KeyboardEvent) => void) | null} */
let _studioRolePreviewKeydown = null;

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
        setStudioRolePreviewMenuOpen(false);
        const shell = await overlayStudioRolePreview(await refreshStudioShellAccessState());
        setStudioShellGate(shell);
        paintStudioRolePreviewChrome();
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

    const roleFooter = document.getElementById('studioSidebarFooter');
    const roleMenu = document.getElementById('studioRolePreviewMenu');
    roleFooter?.addEventListener('click', (e) => {
        e.preventDefault();
        if (roleFooter.getAttribute('aria-disabled') === 'true') return;
        const open = roleFooter.getAttribute('aria-expanded') !== 'true';
        if (open) paintStudioRolePreviewChrome();
        setStudioRolePreviewMenuOpen(open);
    });
    roleMenu?.addEventListener('click', (e) => {
        const btn = /** @type {HTMLElement | null} */ (
            e.target instanceof Element ? e.target.closest('[data-studio-role-preview]') : null
        );
        if (!btn) return;
        e.preventDefault();
        const nextRole = btn.getAttribute('data-studio-role-preview') || 'admin';
        setStudioRolePreviewMenuOpen(false);
        setStudioRolePreview(nextRole);
        void refreshShellAndNav();
    });
    if (_studioRolePreviewDocClick) {
        document.removeEventListener('click', _studioRolePreviewDocClick);
    }
    _studioRolePreviewDocClick = (e) => {
        const wrap = document.querySelector('#studioSidebar .studio-sidebar-footer-wrap');
        if (!wrap || (e.target instanceof Node && wrap.contains(e.target))) return;
        setStudioRolePreviewMenuOpen(false);
    };
    document.addEventListener('click', _studioRolePreviewDocClick);
    if (_studioRolePreviewKeydown) {
        window.removeEventListener('keydown', _studioRolePreviewKeydown);
    }
    _studioRolePreviewKeydown = (e) => {
        if (e.key !== 'Escape') return;
        const menu = document.getElementById('studioRolePreviewMenu');
        if (!menu || menu.hidden) return;
        e.preventDefault();
        setStudioRolePreviewMenuOpen(false);
        document.getElementById('studioSidebarFooter')?.focus();
    };
    window.addEventListener('keydown', _studioRolePreviewKeydown);

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

    const authGate = document.getElementById('studioAuthGate');
    const applyAuthGate = async () => {
        if (isStudioDevPreviewActive()) {
            if (authGate) {
                authGate.hidden = true;
                authGate.setAttribute('aria-hidden', 'true');
            }
            if (root) {
                root.removeAttribute('data-studio-anonymous');
                if (isRadarPreviewActive()) root.setAttribute('data-radar-preview', '1');
                if (isBroadcastsPreviewActive()) root.setAttribute('data-broadcasts-preview', '1');
                if (isScheduledTasksPreviewActive()) root.setAttribute('data-scheduled-tasks-preview', '1');
            }
            return;
        }
        const snap = await getAuthSnapshot();
        if (authGate) {
            const show = !snap.authenticated;
            authGate.hidden = !show;
            authGate.setAttribute('aria-hidden', show ? 'false' : 'true');
        }
        if (root) {
            if (snap.authenticated) {
                root.removeAttribute('data-studio-anonymous');
            } else {
                root.setAttribute('data-studio-anonymous', 'true');
            }
        }
    };

    document.getElementById('studioAuthGateLogin')?.addEventListener('click', () => {
        void loginInternetIdentity().catch(() => {});
    });

    if (_studioAuthChangeHandler) {
        window.removeEventListener('fusion-auth-change', _studioAuthChangeHandler);
    }
    _studioAuthChangeHandler = () => {
        void (async () => {
            await applyAuthGate();
            const snap = await getAuthSnapshot();
            if (snap.authenticated) {
                await refreshShellAndNav();
            }
        })();
    };
    window.addEventListener('fusion-auth-change', _studioAuthChangeHandler);

    void (async () => {
        if (isStudioDevPreviewActive()) {
            setStudioShellGate({
                effectiveMatrix: null,
                permissionsNavAllowed: true,
                teamNavAllowed: true,
                isAdmin: false,
            });
            paintStudioRolePreviewChrome();
            const navEl = document.getElementById('studioNav');
            if (navEl) {
                navEl.innerHTML = buildStudioNavButtonsHtml(normalizeHash());
                attachStudioNavClickHandlers(navEl);
            }
            if (settingsBtn) {
                settingsBtn.hidden = false;
            }
            await applyAuthGate();
            await applySection(normalizeHash());
            return;
        }
        await applyAuthGate();
        await refreshShellAndNav();
    })();

    const publicLink = document.querySelector('.studio-back');
    publicLink?.addEventListener('click', (e) => {
        e.preventDefault();
        navigate('/');
    });
}
