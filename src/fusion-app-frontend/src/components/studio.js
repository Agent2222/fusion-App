/**
 * Fusion Studio — full-page admin shell (no public marketing header/footer).
 */
import '../styles/studio.css';
import { navigate } from '../router.js';
import {
    STUDIO_NAV,
    STUDIO_DASHBOARD_ID,
    sectionTitle,
    renderStudioMain,
    initStudioMain,
} from './studio/panels.js';

function normalizeHash() {
    const raw = (window.location.hash || '').replace(/^#/, '').trim().toLowerCase();
    const valid = new Set([STUDIO_DASHBOARD_ID, ...STUDIO_NAV.map((n) => n.id)]);
    if (raw && valid.has(raw)) return raw;
    return STUDIO_DASHBOARD_ID;
}

function renderNavButtons(activeId) {
    return STUDIO_NAV.map((item) => {
        const active = item.id === activeId ? ' is-active' : '';
        return `<button type="button" class="studio-nav-item${active}" data-studio-section="${item.id}">${item.label}</button>`;
    }).join('');
}

export function render() {
    const initial = normalizeHash();
    return `
        <div class="studio-app" id="studioRoot">
            <div class="studio-nav-backdrop" id="studioNavBackdrop" hidden aria-hidden="true"></div>
            <aside class="studio-sidebar" id="studioSidebar" aria-label="Studio navigation">
                <a class="studio-back" href="/">← Public site</a>
                <button type="button" class="studio-wordmark studio-wordmark-btn" id="studioWordmark">Fusion</button>
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
                        <button type="button" id="studioSettingsBtn" aria-label="Settings">⚙</button>
                    </div>
                </header>
                <main id="studioMainContent" class="studio-main" data-studio-section="${initial}">
                    ${renderStudioMain(initial)}
                </main>
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

export default function initStudio() {
    const root = document.getElementById('studioRoot');
    const main = document.getElementById('studioMainContent');
    const heading = document.getElementById('studioSectionHeading');
    const nav = document.getElementById('studioNav');
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
        const id = sectionId || normalizeHash();
        heading.textContent = sectionTitle(id);
        main.dataset.studioSection = id;
        main.innerHTML = renderStudioMain(id);
        nav.querySelectorAll('.studio-nav-item').forEach((btn) => {
            const sid = btn.getAttribute('data-studio-section');
            btn.classList.toggle('is-active', sid === id && id !== STUDIO_DASHBOARD_ID);
        });
        await initStudioMain(id, main);
    };

    nav.querySelectorAll('.studio-nav-item').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-studio-section');
            if (!id) return;
            setHash(id);
            applySection(id);
            closeNavIfMobile();
        });
    });

    settingsBtn?.addEventListener('click', () => {
        setHash('settings');
        applySection('settings');
        closeNavIfMobile();
    });

    wordmark?.addEventListener('click', () => {
        setHash(STUDIO_DASHBOARD_ID);
        applySection(STUDIO_DASHBOARD_ID);
        closeNavIfMobile();
    });

    window.addEventListener('hashchange', () => {
        applySection(normalizeHash());
    });

    const start = normalizeHash();
    applySection(start);

    const publicLink = document.querySelector('.studio-back');
    publicLink?.addEventListener('click', (e) => {
        e.preventDefault();
        navigate('/');
    });
}
