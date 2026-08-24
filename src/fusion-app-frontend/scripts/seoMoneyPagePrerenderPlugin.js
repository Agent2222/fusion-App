/**
 * After Vite build, write SPA shells for money-page paths with route-specific
 * <title>/meta/canonical and crawlable <noscript> content.
 * Asset canister serves these files at their path instead of the generic homepage shell,
 * giving Google route-accurate metadata on first byte.
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
            'Explore Japan artist residency programs with Fusion \u2014 curated residencies in Kaga, Ishikawa, Tokyo, and beyond. See dates, details, and how to apply.',
        canonicalPath: '/programs',
        h1: 'Japan artist residency programs',
        bodyHtml: `
<p>Fusion runs curated Japan artist residency programs for practicing artists. Browse open residencies, compare locations and dates, and apply through the Fusion platform.</p>
<p><a href="${ORIGIN}/program/kaga-ishikawa">Kaga, Ishikawa Japan artist residency</a> · <a href="${ORIGIN}/join-network">Curated art network</a> · <a href="${ORIGIN}/">Fusion home</a> · <a href="${ORIGIN}/context">Mission and context</a></p>
`.trim(),
    },
    {
        outDir: 'program/kaga-ishikawa',
        title: 'Kaga, Ishikawa Japan Artist Residency \u00b7 Fusion',
        description:
            'Japan artist residency in Kaga City, Ishikawa \u2014 studio time, place-based exchange, and how to apply on Fusion. Flights and accommodations details on the program page.',
        canonicalPath: '/program/kaga-ishikawa',
        h1: 'Japan artist residency in Kaga, Ishikawa',
        bodyHtml: `
<p>Fusion\u2019s Japan artist residency in Kaga City, Ishikawa brings artists together for focused studio practice, collaboration, and exchange in Japan.</p>
<p>See schedule, costs, eligibility, and application options on this page after it loads \u2014 or browse all <a href="${ORIGIN}/programs">Japan artist residency programs</a>.</p>
<p>Galleries, curators, and collectors: <a href="${ORIGIN}/join-network">join Fusion\u2019s curated art network</a>.</p>
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
    {
        outDir: 'artists',
        title: 'Artists on Fusion | Curated Art Network',
        description:
            'Discover artists in Fusion\u2019s curated art network \u2014 Japan-based programs connecting artists, galleries, curators, and collectors.',
        canonicalPath: '/artists',
        h1: 'Artists on Fusion',
        bodyHtml: `
<p>Discover artists in Fusion\u2019s curated art network. Browse profiles of practicing artists connected through Japan-based residency programs.</p>
<p><a href="${ORIGIN}/programs">Japan artist residency programs</a> · <a href="${ORIGIN}/gallery-access">Gallery access</a> · <a href="${ORIGIN}/community">Community</a></p>
`.trim(),
    },
    {
        outDir: 'journal',
        title: 'Journal | Editorial & Field Notes | Fusion',
        description:
            'Editorial writing, documentation, and perspectives from Fusion\u2019s art platform.',
        canonicalPath: '/journal',
        h1: 'Journal \u2014 editorial and field notes',
        bodyHtml: `
<p>Editorial writing, studio documentation, and perspectives from Fusion\u2019s curated art network and Japan artist residency programs.</p>
<p><a href="${ORIGIN}/programs">Programs</a> · <a href="${ORIGIN}/artists">Artists</a> · <a href="${ORIGIN}/context">Context</a></p>
`.trim(),
    },
    {
        outDir: 'editions',
        title: 'Editions & objects | Fusion',
        description:
            'Prints, objects, and works released through Fusion artists and partners.',
        canonicalPath: '/editions',
        h1: 'Editions and objects',
        bodyHtml: `
<p>Prints, limited editions, and objects released through Fusion artists and partners. Browse available works and past releases.</p>
<p><a href="${ORIGIN}/artists">Artists</a> · <a href="${ORIGIN}/programs">Programs</a> · <a href="${ORIGIN}/gallery-access">Gallery access</a></p>
`.trim(),
    },
    {
        outDir: 'gallery-access',
        title: 'Gallery Access | Curated Art Network | Fusion',
        description:
            'Gallery access through Fusion\u2019s curated art network \u2014 studio visits, artist introductions, and previews for galleries and collectors.',
        canonicalPath: '/gallery-access',
        h1: 'Gallery access',
        bodyHtml: `
<p>Gallery access through Fusion\u2019s curated art network \u2014 studio visits, artist introductions, and previews for galleries and collectors.</p>
<p><a href="${ORIGIN}/artists">Artists</a> · <a href="${ORIGIN}/programs">Programs</a> · <a href="${ORIGIN}/join-network">Join the network</a></p>
`.trim(),
    },
    {
        outDir: 'community',
        title: 'Community | Curated Art Network | Fusion',
        description:
            'Community inside Fusion\u2019s curated art network \u2014 artists, galleries, curators, and collectors connected through programs rooted in Japan.',
        canonicalPath: '/community',
        h1: 'Community',
        bodyHtml: `
<p>Artists, galleries, curators, and collectors connected through Fusion\u2019s programs rooted in Japan. Events, sessions, and network features.</p>
<p><a href="${ORIGIN}/programs">Programs</a> · <a href="${ORIGIN}/artists">Artists</a> · <a href="${ORIGIN}/join-network">Join the network</a></p>
`.trim(),
    },
    {
        outDir: 'videos',
        title: 'Videos | Fusion',
        description:
            'Studio visits, conversations, and member-only full videos from Fusion artists.',
        canonicalPath: '/videos',
        h1: 'Videos',
        bodyHtml: `
<p>Studio visits, conversations, and member-only full videos from Fusion artists in Japan and beyond.</p>
<p><a href="${ORIGIN}/artists">Artists</a> · <a href="${ORIGIN}/journal">Journal</a> · <a href="${ORIGIN}/programs">Programs</a></p>
`.trim(),
    },
    {
        outDir: 'context',
        title: 'Context | Mission & Curated Art Network | Fusion',
        description:
            'Why Fusion exists: mission, ecosystem, and a curated art network in Japan connecting artists, galleries, curators, and collectors.',
        canonicalPath: '/context',
        h1: 'Context \u2014 mission and curated art network',
        bodyHtml: `
<p>Why Fusion exists: building a curated art network in Japan connecting artists, galleries, curators, and collectors through place-based programs.</p>
<p><a href="${ORIGIN}/programs">Programs</a> · <a href="${ORIGIN}/artists">Artists</a> · <a href="${ORIGIN}/join-network">Join the network</a></p>
`.trim(),
    },
    {
        outDir: 'contact',
        title: 'Contact | Fusion',
        description:
            'Contact the Fusion team \u2014 partnerships, programs, and general inquiries.',
        canonicalPath: '/contact',
        h1: 'Contact',
        bodyHtml: `
<p>Contact the Fusion team for partnerships, program inquiries, and general questions.</p>
<p><a href="${ORIGIN}/programs">Programs</a> · <a href="${ORIGIN}/context">Context</a> · <a href="${ORIGIN}/">Home</a></p>
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
      <h1>Fusion \u2014 Japan artist residency &amp; art platform</h1>
      <p>Fusion runs curated artist residency programs in Japan, from Kaga and Ishikawa to Tokyo and beyond, for artists, gallerists, and art enthusiasts worldwide.</p>
      <p><a href="${ORIGIN}/programs">Japan artist residency programs</a> \u00b7 <a href="${ORIGIN}/program/kaga-ishikawa">Kaga, Ishikawa residency</a> \u00b7 <a href="${ORIGIN}/join-network">Curated art network</a> \u00b7 <a href="${ORIGIN}/context">Context</a></p>
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

            // /residency → /programs: emit a lightweight redirect shell so crawlers
            // see a <link rel="canonical"> + <meta http-equiv="refresh"> instead of
            // relying on client-side replaceState (which Google treats as a soft redirect).
            const residencyDir = path.join(dist, 'residency');
            mkdirSync(residencyDir, { recursive: true });
            writeFileSync(
                path.join(residencyDir, 'index.html'),
                `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Redirecting to Programs | Fusion</title>
  <link rel="canonical" href="${ORIGIN}/programs" />
  <meta http-equiv="refresh" content="0;url=${ORIGIN}/programs" />
  <meta name="robots" content="noindex, follow" />
</head>
<body>
  <p>This page has moved. <a href="${ORIGIN}/programs">Go to Japan artist residency programs</a>.</p>
</body>
</html>`,
                'utf8',
            );
            console.log('[seo-prerender] wrote residency/index.html (redirect)');
        },
    };
}
