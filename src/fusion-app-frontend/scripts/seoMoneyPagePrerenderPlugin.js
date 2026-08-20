/**
 * After Vite build, write SPA shells for money-page paths with route-specific
 * <title>/meta/canonical and crawlable <noscript> content.
 * Asset canister can then serve these files at /programs, /program/kaga-ishikawa,
 * and /join-network instead of only the homepage shell.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ORIGIN = 'https://fusionart.world';
const OG_IMAGE = 'https://cdn.fusionart.world/uploads/platform-assets/program_hero-1.jpg';

/** @type {Array<{ outDir: string, title: string, description: string, canonicalPath: string, h1: string, bodyHtml: string }>} */
const MONEY_PAGES = [
    {
        outDir: 'programs',
        title: 'Japan Artist Residency Programs | Fusion',
        description:
            'Explore Japan artist residency programs with Fusion — curated residencies in Kaga, Ishikawa, Tokyo, and beyond. See dates, details, and how to apply.',
        canonicalPath: '/programs',
        h1: 'Japan artist residency programs',
        bodyHtml: `
<p>Fusion runs curated Japan artist residency programs for practicing artists. Browse open residencies, compare locations and dates, and apply through the Fusion platform.</p>
<p><a href="${ORIGIN}/program/kaga-ishikawa">Kaga, Ishikawa Japan artist residency</a> · <a href="${ORIGIN}/join-network">Curated art network</a> · <a href="${ORIGIN}/">Fusion home</a> · <a href="${ORIGIN}/context">Mission and context</a></p>
`.trim(),
    },
    {
        outDir: 'program/kaga-ishikawa',
        title: 'Kaga, Ishikawa Japan Artist Residency · Fusion',
        description:
            'Japan artist residency in Kaga City, Ishikawa — studio time, place-based exchange, and how to apply on Fusion. Flights and accommodations details on the program page.',
        canonicalPath: '/program/kaga-ishikawa',
        h1: 'Japan artist residency in Kaga, Ishikawa',
        bodyHtml: `
<p>Fusion’s Japan artist residency in Kaga City, Ishikawa brings artists together for focused studio practice, collaboration, and exchange in Japan.</p>
<p>See schedule, costs, eligibility, and application options on this page after it loads — or browse all <a href="${ORIGIN}/programs">Japan artist residency programs</a>.</p>
<p>Galleries, curators, and collectors: <a href="${ORIGIN}/join-network">join Fusion’s curated art network</a>.</p>
`.trim(),
    },
    {
        outDir: 'join-network',
        title: 'Curated Art Network | Join FUSION',
        description:
            'Join a curated art network connecting artists, galleries, curators, and collectors through programs rooted in Japan.',
        canonicalPath: '/join-network',
        h1: 'A curated art network for practice across borders.',
        bodyHtml: `
<p>Join artists, galleries, curators, and collectors in a curated art network built around programs rooted in Japan. Membership includes residency applications.</p>
<p><a href="${ORIGIN}/programs">Japan artist residency programs</a> · <a href="${ORIGIN}/program/kaga-ishikawa">Kaga, Ishikawa residency</a> · <a href="${ORIGIN}/context">Mission and context</a></p>
`.trim(),
    },
];

/**
 * @param {string} html
 * @param {{ title: string, description: string, canonicalPath: string, h1: string, bodyHtml: string }} page
 */
function injectRouteSeo(html, page) {
    const canonical = `${ORIGIN}${page.canonicalPath}`;
    let out = html;
    out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
    out = out.replace(
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="description" content="${escapeAttr(page.description)}" />`,
    );
    out = out.replace(
        /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
        `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
    );
    out = out.replace(
        /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:title" content="${escapeAttr(page.title)}" />`,
    );
    out = out.replace(
        /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:description" content="${escapeAttr(page.description)}" />`,
    );
    out = out.replace(
        /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
    );
    out = out.replace(
        /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="twitter:title" content="${escapeAttr(page.title)}" />`,
    );
    out = out.replace(
        /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="twitter:description" content="${escapeAttr(page.description)}" />`,
    );
    if (!/property="og:image"/i.test(out)) {
        out = out.replace(
            '</head>',
            `  <meta property="og:image" content="${OG_IMAGE}" />\n</head>`,
        );
    }
    const noscript = `
  <noscript>
    <main id="seo-prerender">
      <h1>${escapeHtml(page.h1)}</h1>
      ${page.bodyHtml}
    </main>
  </noscript>
`;
    if (out.includes('</body>')) {
        out = out.replace('</body>', `${noscript}</body>`);
    } else {
        out += noscript;
    }
    return out;
}

/** @param {string} s */
function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** @param {string} s */
function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, '&#39;');
}

/**
 * @param {{ outDir?: string }} [opts]
 * @returns {import('vite').Plugin}
 */
export function seoMoneyPagePrerenderPlugin(opts = {}) {
    const distDir = opts.outDir;
    return {
        name: 'fusion-seo-money-page-prerender',
        apply: 'build',
        closeBundle() {
            const dist = distDir || path.resolve(process.cwd(), 'dist');
            const indexPath = path.join(dist, 'index.html');
            if (!existsSync(indexPath)) {
                console.warn('[seo-prerender] dist/index.html missing; skip');
                return;
            }
            const baseHtml = readFileSync(indexPath, 'utf8');

            // Enrich root index noscript for homepage crawlers.
            if (!baseHtml.includes('id="seo-prerender-home"')) {
                const homeNoscript = `
  <noscript>
    <main id="seo-prerender-home">
      <h1>Fusion — Japan artist residency &amp; art platform</h1>
      <p>Fusion runs curated artist residency programs in Japan, from Kaga and Ishikawa to Tokyo and beyond, for artists, gallerists, and art enthusiasts worldwide.</p>
      <p><a href="${ORIGIN}/programs">Japan artist residency programs</a> · <a href="${ORIGIN}/program/kaga-ishikawa">Kaga, Ishikawa residency</a> · <a href="${ORIGIN}/join-network">Curated art network</a> · <a href="${ORIGIN}/context">Context</a></p>
    </main>
  </noscript>
`;
                const enriched = baseHtml.includes('</body>')
                    ? baseHtml.replace('</body>', `${homeNoscript}</body>`)
                    : baseHtml + homeNoscript;
                writeFileSync(indexPath, enriched, 'utf8');
            }

            const shell = readFileSync(indexPath, 'utf8');
            for (const page of MONEY_PAGES) {
                const out = injectRouteSeo(shell, page);
                const dir = path.join(dist, page.outDir);
                mkdirSync(dir, { recursive: true });
                writeFileSync(path.join(dir, 'index.html'), out, 'utf8');
                console.log(`[seo-prerender] wrote ${page.outDir}/index.html`);
            }
        },
    };
}
