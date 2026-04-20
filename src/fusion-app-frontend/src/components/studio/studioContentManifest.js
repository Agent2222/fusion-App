/**
 * Ordered chapters for Studio Content editor — replaces ad-hoc `if (slug === …)` headings
 * and path-only `localeCompare` grouping for known slugs.
 *
 * @typedef {{ id: string, title: string, pathPrefixes: string[] }} StudioContentChapter
 */

/** @type {Record<string, StudioContentChapter[]>} */
export const STUDIO_CONTENT_CHAPTERS_BY_SLUG = {
    'site-info': [
        { id: 'home', title: 'Home', pathPrefixes: ['home.'] },
        { id: 'programs', title: 'Programs page', pathPrefixes: ['programs.'] },
        { id: 'editions', title: 'Editions page', pathPrefixes: ['editions.'] },
        { id: 'journal', title: 'Journal page', pathPrefixes: ['journal.'] },
    ],
    'join-network-flow': [
        { id: 'membership', title: 'Membership', pathPrefixes: ['membership.'] },
        { id: 'access', title: 'Access', pathPrefixes: ['access.'] },
        { id: 'apply', title: 'Apply', pathPrefixes: ['apply.'] },
    ],
    'program-hero': [
        { id: 'en', title: 'English', pathPrefixes: ['en.'] },
        { id: 'ja', title: '日本語', pathPrefixes: ['ja.'] },
    ],
};

/**
 * @param {{ type: 'pair', en: { path: string }, ja: { path: string } } | { type: 'single', row: { path: string } }} g
 */
function pathForGroupedRow(g) {
    if (g.type === 'pair') return g.en.path;
    return g.row.path;
}

/**
 * @param {unknown[]} grouped from `groupLocaleContentRows`
 * @param {string} slug content page slug
 * @returns {{ chapter: StudioContentChapter | null, title: string | null, items: unknown[] }[]}
 */
export function partitionGroupedContentRowsByChapters(grouped, slug) {
    const chapters = STUDIO_CONTENT_CHAPTERS_BY_SLUG[slug];
    if (!chapters?.length) {
        return [{ chapter: null, title: null, items: grouped }];
    }
    /** @type {{ chapter: StudioContentChapter, items: unknown[]}[]} */
    const buckets = chapters.map((ch) => ({ chapter: ch, items: [] }));
    /** @type {unknown[]} */
    const other = [];
    for (const g of grouped) {
        const path = pathForGroupedRow(/** @type {any} */ (g));
        let placed = false;
        for (let i = 0; i < chapters.length; i++) {
            if (chapters[i].pathPrefixes.some((p) => path.startsWith(p))) {
                buckets[i].items.push(g);
                placed = true;
                break;
            }
        }
        if (!placed) other.push(g);
    }
    /** @type {{ chapter: StudioContentChapter | null, title: string | null, items: unknown[] }[]} */
    const out = [];
    for (const b of buckets) {
        if (b.items.length) out.push({ chapter: b.chapter, title: b.chapter.title, items: b.items });
    }
    if (other.length) {
        out.push({ chapter: null, title: 'Other', items: other });
    }
    return out.length ? out : [{ chapter: null, title: null, items: grouped }];
}
