/**
 * Studio Email — announce a program’s artists (3-up portrait grid + cohort page CTA).
 */
import { getPublicSiteOrigin } from '../config.js';
import { toCloudFrontAssetUrl } from './assetDistribution.js';
import {
    artistMatchesProgram,
    buildArtistCohortFilterOptions,
    programFilterSlug,
} from './artistCohortRoutes.js';
import { getArtistCardArtworkUrl, getArtistCardProfileUrl } from './artistCardImageMode.js';
import { artistDisplayName, artistEnglishBlock } from './artistSlug.js';
import {
    escapeHtmlForEmailLayout,
    fusionEmailParagraph,
    isEmailVideoUrl,
    renderFusionEmailFromSlots,
} from './emailFusionLayout.js';
import { normalizeProgramId } from './programAlumniEligibility.js';
import {
    programCohortBrandLabel,
    seasonFromProgramStartDate,
    stripArtistResidencyFromProgramTitle,
} from './programCohortHeadline.js';

export const PROGRAM_ARTISTS_ANNOUNCE_TEMPLATE_ID = 'tpl_program_artists';

const DEFAULT_HERO =
    'https://fusionart-bucket.s3.us-east-2.amazonaws.com/uploads/platform-assets/program_hero-1.jpg';
const DEFAULT_COHORT_PATH = '/artists/kaga-ishikawa-2026';
const GRID_MARKER = '<!-- fusion-email-artist-grid -->';

/**
 * @param {object | null | undefined} program
 * @returns {Record<string, unknown>}
 */
function programCard(program) {
    if (!program || typeof program !== 'object') return {};
    const rec = /** @type {Record<string, unknown>} */ (program);
    return rec.enCard && typeof rec.enCard === 'object'
        ? /** @type {Record<string, unknown>} */ (rec.enCard)
        : rec;
}

/**
 * @param {unknown} url
 * @returns {string}
 */
function stillImageUrl(url) {
    const raw = String(url ?? '').trim();
    if (!raw || isEmailVideoUrl(raw)) return '';
    try {
        return toCloudFrontAssetUrl(raw) || raw;
    } catch {
        return raw;
    }
}

/**
 * Short residency label for intro copy, e.g. "Kaga Fall 2026".
 * @param {object | null | undefined} program
 * @returns {string}
 */
export function programArtistsAnnounceLabel(program) {
    const card = programCard(program);
    const id = String(program?.id ?? card.id ?? '').trim();
    const year = String(card.year ?? program?.year ?? '').trim();
    const start = String(card.startDate ?? program?.startDate ?? '').trim();
    const headline = String(card.headline ?? card.focus ?? '').trim();
    const brand = stripArtistResidencyFromProgramTitle(programCohortBrandLabel(id, headline));
    const shortBrand = brand.replace(/^Fusion\s+/i, '').trim();
    const season = seasonFromProgramStartDate(start);
    if (shortBrand && season && year) return `${shortBrand} ${season} ${year}`;
    if (shortBrand && year) return `${shortBrand} ${year}`;
    return shortBrand || headline || 'upcoming';
}

/**
 * Public cohort artists page for the selected program.
 * @param {object | null | undefined} program
 * @param {object[]} [allPrograms]
 * @param {object[]} [artists]
 * @returns {string}
 */
export function programArtistsCohortPageHref(program, allPrograms = [], artists = []) {
    const origin = String(getPublicSiteOrigin() || 'https://www.fusionart.world').replace(/\/$/, '');
    if (!program || typeof program !== 'object') {
        return `${origin}${DEFAULT_COHORT_PATH}`;
    }
    const pid = normalizeProgramId(String(program.id ?? ''));
    const pool = (Array.isArray(allPrograms) ? allPrograms : []).length ? allPrograms : [program];
    const options = buildArtistCohortFilterOptions({ programs: pool, artists });
    const match = options.find((o) => o.kind === 'program' && o.id === pid);
    const path = match?.href || (programFilterSlug(program) ? `/artists/${programFilterSlug(program)}` : '');
    return `${origin}${path || DEFAULT_COHORT_PATH}`;
}

/**
 * Portrait-first still for the 3-up grid.
 * @param {object} artist
 * @returns {string}
 */
export function programArtistGridImageUrl(artist) {
    const en = artistEnglishBlock(artist);
    const galleryStills = (Array.isArray(en?.introGallery) ? en.introGallery : [])
        .map((g) => g?.src)
        .filter(Boolean);
    const candidates = [
        getArtistCardProfileUrl(artist, { fallbackToArtwork: false }),
        artist?.heroProfileImage,
        getArtistCardArtworkUrl(artist),
        artist?.image,
        ...galleryStills,
    ];
    for (const raw of candidates) {
        const u = stillImageUrl(raw);
        if (u) return u;
    }
    return '';
}

/**
 * Enrolled or confirmed-list artists for a program, A–Z by display name.
 * @param {object | null | undefined} program
 * @param {object[]} [artists]
 * @returns {object[]}
 */
export function artistsForProgramAnnounce(program, artists = []) {
    if (!program) return [];
    return (Array.isArray(artists) ? artists : [])
        .filter((a) => artistMatchesProgram(a, program))
        .slice()
        .sort((a, b) =>
            artistDisplayName(a, 'en').localeCompare(artistDisplayName(b, 'en'), undefined, {
                sensitivity: 'base',
            }),
        );
}

/**
 * Email-safe 3-column portrait table.
 * @param {object[]} artists
 * @returns {string}
 */
export function buildProgramArtistsGridHtml(artists = []) {
    const cells = (Array.isArray(artists) ? artists : [])
        .map((artist) => {
            const name = artistDisplayName(artist, 'en') || 'Artist';
            const src = programArtistGridImageUrl(artist);
            if (!src) return '';
            const slug = String(artist?.slug ?? '').trim();
            const origin = String(getPublicSiteOrigin() || 'https://www.fusionart.world').replace(/\/$/, '');
            const href = slug ? `${origin}/profile/${encodeURIComponent(slug)}` : '';
            const safeName = escapeHtmlForEmailLayout(name);
            const img = `<img src="${escapeHtmlForEmailLayout(src)}" alt="${safeName}" width="170" style="display:block;width:100%;max-width:170px;height:auto;border:0;margin:0 auto;">`;
            const media = href
                ? `<a href="${escapeHtmlForEmailLayout(href)}" style="text-decoration:none;color:#000000;">${img}</a>`
                : img;
            const caption = href
                ? `<a href="${escapeHtmlForEmailLayout(href)}" style="color:#000000;text-decoration:none;">${safeName}</a>`
                : safeName;
            return `<td width="33.33%" valign="top" style="padding:0 4px 16px;text-align:center;">
${media}
<p style="margin:8px 0 0;font-size:12px;line-height:1.3;font-weight:700;color:#000000;">${caption}</p>
</td>`;
        })
        .filter(Boolean);

    if (!cells.length) return '';

    /** @type {string[]} */
    const rows = [];
    for (let i = 0; i < cells.length; i += 3) {
        const slice = cells.slice(i, i + 3);
        while (slice.length < 3) {
            slice.push('<td width="33.33%" valign="top" style="padding:0 4px 16px;">&nbsp;</td>');
        }
        rows.push(`<tr>${slice.join('')}</tr>`);
    }

    return `${GRID_MARKER}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 28px;border-collapse:collapse;">
<tbody>
${rows.join('\n')}
</tbody>
</table>`;
}

/**
 * Default announcement copy (Kaga Fall 2026). Bind a program to fill portraits + cohort URL.
 * @returns {string}
 */
export function defaultProgramArtistsAnnounceBodyHtml() {
    return [
        fusionEmailParagraph(
            'Introducing the artists joining FUSION’s Kaga Fall 2026 residency!',
            'lead',
        ),
        fusionEmailParagraph(
            'Select a program under Content source to fill the artist portraits and the cohort artists page link.',
        ),
        fusionEmailParagraph(
            'This program considers the rise of the interdisciplinary artist, practices that move across mediums, ideas, cultures, and ways of making, resisting the boundaries of a single discipline.',
        ),
        fusionEmailParagraph(
            'Over three weeks in Kaga and Tokyo Japan, artists will encounter new environments, communities, and perspectives, exploring how place can enter the creative process and reshape the direction of a practice.',
        ),
        fusionEmailParagraph('The program begins later this week.'),
        fusionEmailParagraph(
            'With residence partners Hatori Onsen, Rurikoh Onsen, and WPU Shinjuku, and program partner Yamashiro Art Festival.',
        ),
        fusionEmailParagraph('Special thanks to Tokyo Gendai, ahead of their upcoming show.'),
        fusionEmailParagraph(
            'Meet the artists and discover more about their practices on the cohort artists page.',
            'last',
        ),
    ].join('\n');
}

/**
 * @returns {import('./emailFusionLayout.js').FusionEmailLayoutOpts}
 */
export function sampleProgramArtistsAnnounceLayoutSlots() {
    const origin = String(getPublicSiteOrigin() || 'https://www.fusionart.world').replace(/\/$/, '');
    return {
        eyebrow: 'Program Artists',
        heroImageUrl: DEFAULT_HERO,
        heroAlt: 'Kaga City, Ishikawa',
        pillLabel: 'MEET THE ARTISTS',
        headlineHtml: 'Meet The<br>Artists',
        bodyHtml: defaultProgramArtistsAnnounceBodyHtml(),
        cta: { label: 'MEET THE ARTISTS', href: `${origin}${DEFAULT_COHORT_PATH}` },
        footnote: 'Portraits and the cohort page update when you select a program.',
    };
}

/**
 * @returns {string}
 */
export function sampleProgramArtistsAnnounceHtml() {
    return renderFusionEmailFromSlots(sampleProgramArtistsAnnounceLayoutSlots());
}

/**
 * @param {string} intro
 */
export function buildProgramArtistsAnnounceSubject(introLabel) {
    const label = String(introLabel || '').trim() || 'the residency';
    return `Meet the artists — ${label}`;
}

/**
 * @param {string} introLabel
 */
export function buildProgramArtistsAnnouncePreview(introLabel) {
    const label = String(introLabel || '').trim() || 'the residency';
    return `Introducing the artists joining FUSION’s ${label} residency.`;
}

/**
 * Replace the lead paragraph and insert (or replace) the 3-up artist grid.
 * @param {string} bodyHtml
 * @param {string} introHtml
 * @param {string} gridHtml
 * @returns {string}
 */
export function withAnnounceLeadAndGrid(bodyHtml, introHtml, gridHtml) {
    let raw = String(bodyHtml || '');
    const intro = fusionEmailParagraph(introHtml, 'lead');
    raw = raw.replace(/<p[^>]*>[\s\S]*?<\/p>/i, intro);
    const grid = String(gridHtml || '').trim();
    if (!grid) return raw;
    raw = raw.replace(
        new RegExp(`${GRID_MARKER}\\s*<table\\b[\\s\\S]*?<\\/table>`, 'i'),
        '',
    );
    raw = raw.replace(
        /<p[^>]*>Select a program under Content source[\s\S]*?<\/p>\s*/i,
        '',
    );
    return raw.replace(/<p[^>]*>[\s\S]*?<\/p>/i, (lead) => `${lead}\n${grid}`);
}

/**
 * @param {{
 *   program?: object | null,
 *   artists?: object[],
 *   programs?: object[],
 *   heroImageUrl?: string,
 *   heroAlt?: string,
 * }} [opts]
 */
export function buildProgramArtistsAnnounceLayoutSlots(opts = {}) {
    const program = opts.program || null;
    const artists = Array.isArray(opts.artists) ? opts.artists : [];
    const programs = Array.isArray(opts.programs) ? opts.programs : [];
    const base = sampleProgramArtistsAnnounceLayoutSlots();
    if (!program) return base;

    const card = programCard(program);
    const label = programArtistsAnnounceLabel(program);
    const cohortHref = programArtistsCohortPageHref(program, programs, artists);
    const matched = artistsForProgramAnnounce(program, artists);
    const gridHtml = buildProgramArtistsGridHtml(matched);
    const intro = `Introducing the artists joining FUSION’s ${escapeHtmlForEmailLayout(label)} residency!`;
    const hero =
        stillImageUrl(opts.heroImageUrl) ||
        stillImageUrl(card.imageSrc) ||
        stillImageUrl(card.heroMediaSrc) ||
        base.heroImageUrl;
    const location = String(card.location ?? '').trim();

    return {
        ...base,
        heroImageUrl: hero,
        heroAlt: String(opts.heroAlt || location || label || base.heroAlt).trim(),
        bodyHtml: withAnnounceLeadAndGrid(base.bodyHtml, intro, gridHtml),
        cta: { label: 'MEET THE ARTISTS', href: cohortHref },
        footnote: gridHtml
            ? 'Meet the full cohort on fusionart.world.'
            : 'Add enrolled artists on this program to fill the portrait grid.',
        subject: buildProgramArtistsAnnounceSubject(label),
        previewText: buildProgramArtistsAnnouncePreview(label),
    };
}

/**
 * @param {Parameters<typeof buildProgramArtistsAnnounceLayoutSlots>[0]} [opts]
 * @returns {string}
 */
export function buildProgramArtistsAnnounceEmailHtml(opts = {}) {
    return renderFusionEmailFromSlots(buildProgramArtistsAnnounceLayoutSlots(opts));
}
