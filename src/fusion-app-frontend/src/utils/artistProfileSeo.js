/**
 * Artist public profile page SEO: title, description, canonical path, OG image.
 */

import { getPublicSiteOrigin } from '../config.js';

const DESC_MAX = 158;

/**
 * @param {string} s
 */
function clipDescription(s) {
    const t = String(s || '').replace(/\s+/g, ' ').trim();
    if (t.length <= DESC_MAX) return t;
    return `${t.slice(0, DESC_MAX - 1).trim()}…`;
}

/**
 * @param {Record<string, unknown>} loc
 */
function locationLineFromLocale(loc) {
    const l = loc?.location;
    if (l == null || l === '') return '';
    if (typeof l === 'string') return l.trim();
    if (typeof l === 'object' && !Array.isArray(l)) {
        const o = /** @type {Record<string, unknown>} */ (l);
        if (o.display != null && String(o.display).trim()) return String(o.display).trim();
        return [o.city, o.state, o.country]
            .map((x) => (x != null ? String(x).trim() : ''))
            .filter(Boolean)
            .join(', ');
    }
    return '';
}

/**
 * @param {Record<string, unknown>} loc
 */
function seoBlockFromLocale(loc) {
    const raw = loc?.seo;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return /** @type {Record<string, unknown>} */ (raw);
}

/**
 * @param {{
 *   loc: Record<string, unknown>,
 *   displayName: string,
 *   slug: string,
 *   heroImageUrl?: string,
 *   practiceStr?: string,
 * }} opts
 */
export function buildArtistProfileSeo(opts) {
    const loc = opts.loc && typeof opts.loc === 'object' ? opts.loc : {};
    const displayName = String(opts.displayName || 'Artist').trim() || 'Artist';
    const slug = String(opts.slug || '').trim();
    const seo = seoBlockFromLocale(loc);
    const customTitle = String(seo.title ?? '').trim();
    const customDesc = String(seo.description ?? '').trim();
    const discipline = String(loc.discipline ?? '').trim();
    const practiceStr = String(opts.practiceStr ?? loc.practice ?? '').trim();
    const location = locationLineFromLocale(loc);

    const title =
        customTitle ||
        (discipline
            ? `${displayName} — ${discipline} · Japan Artist Residency · Fusion`
            : `${displayName} · Japan Artist Residency · Fusion`);

    const descParts = [
        practiceStr,
        discipline,
        location,
        'Japan artist residency on Fusion',
    ].filter(Boolean);
    const description =
        customDesc ||
        clipDescription(
            descParts.length
                ? descParts.join(' · ')
                : `${displayName} — artist on Fusion's Japan artist residency and programs platform.`,
        );

    const canonicalPath = `/profile/${encodeURIComponent(slug)}`;

    let ogImageUrl = String(opts.heroImageUrl ?? '').trim();
    if (ogImageUrl && !/^https?:\/\//i.test(ogImageUrl)) {
        const origin = getPublicSiteOrigin();
        ogImageUrl = `${origin}${ogImageUrl.startsWith('/') ? ogImageUrl : `/${ogImageUrl}`}`;
    }

    return {
        title,
        description,
        canonicalPath,
        ogImageUrl: ogImageUrl || undefined,
        personJsonLd: {
            name: displayName,
            url: `${getPublicSiteOrigin()}${canonicalPath}`,
            ...(ogImageUrl ? { image: ogImageUrl } : {}),
            ...(discipline ? { jobTitle: discipline } : {}),
            description,
        },
    };
}
