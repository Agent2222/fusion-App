/**
 * Public /links — curated destination buttons and cards. Not listed in the header menu.
 */
import '../styles/linksPage.css';
import { getPublicLinks } from '../utils/database.js';
import {
    effectivePublicLinkDisplay,
    enabledPublicLinks,
    formatPublicLinkCtaLabel,
    normalizePublicLinkCardRows,
    normalizePublicLinkCardSpan,
    normalizePublicLinkColorToken,
    normalizePublicLinkCtaStyle,
} from '../utils/publicLinksModel.js';

function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function linkTargetAttrs(href) {
    const external = String(href || '').startsWith('https://');
    return external ? ' target="_blank" rel="noopener noreferrer"' : '';
}

function itemHtml(link) {
    const href = esc(link.href);
    const extra = linkTargetAttrs(link.href);
    const label = esc(link.label);
    if (effectivePublicLinkDisplay(link) === 'card') {
        const cols = normalizePublicLinkCardSpan(link.cardSpan);
        const rows = normalizePublicLinkCardRows(link.cardRows);
        const wide = cols === 2 ? ' links-page__card--wide' : '';
        const tall = rows === 2 ? ' links-page__card--tall' : '';
        const eyebrow = esc(link.eyebrow);
        const subtext = esc(link.subtext);
        const meta = esc(link.meta);
        const cta = esc(formatPublicLinkCtaLabel(link.ctaLabel));
        const ctaStyle = normalizePublicLinkCtaStyle(link.ctaStyle);
        return `<a class="links-page__card${wide}${tall}" href="${href}"${extra}>
          <img class="links-page__card-img" src="${esc(link.imageUrl)}" alt="" />
          <span class="links-page__card-copy">
            ${eyebrow ? `<span class="links-page__card-eyebrow">${eyebrow}</span>` : ''}
            <span class="links-page__card-title">${label}</span>
            ${subtext ? `<span class="links-page__card-sub">${subtext}</span>` : ''}
            <span class="links-page__card-cta links-page__card-cta--${ctaStyle}">${cta}</span>
            ${meta ? `<span class="links-page__card-meta">${meta}</span>` : ''}
          </span>
        </a>`;
    }
    const color = normalizePublicLinkColorToken(link.colorToken);
    return `<a class="links-page__btn" data-color="${color}" href="${href}"${extra}>${label}</a>`;
}

export function generateLinksContent() {
    return `
        <div class="page-content links-page">
            <div class="links-page__stack" id="publicLinksStack" aria-live="polite">
                <p class="links-page__empty">Loading…</p>
            </div>
            <div class="links-page__tail" aria-hidden="true"></div>
        </div>
    `;
}

export default function initLinks() {
    const stack = document.getElementById('publicLinksStack');
    if (!(stack instanceof HTMLElement)) return;

    stack.addEventListener('click', (e) => {
        const a =
            e.target instanceof Element
                ? e.target.closest('a.links-page__btn, a.links-page__card')
                : null;
        if (!a) return;
        const href = a.getAttribute('href') || '';
        if (!href.startsWith('/') || href.startsWith('//')) return;
        e.preventDefault();
        void import('../router.js').then(({ navigate }) => navigate(href));
    });

    void getPublicLinks()
        .then((all) => {
            const links = enabledPublicLinks(all);
            if (!links.length) {
                stack.innerHTML = '<p class="links-page__empty">Links coming soon</p>';
                return;
            }
            stack.innerHTML = links.map(itemHtml).join('');
        })
        .catch(() => {
            stack.innerHTML = '<p class="links-page__empty">Links coming soon</p>';
        });
}
