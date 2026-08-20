/**
 * Content sources for Studio email templates (artist, journal, program, website).
 */
import { artistDisplayName, artistEnglishBlock } from './artistSlug.js';
import {
    getArtistCardArtworkUrl,
    getArtistCardProfileUrl,
    isArtistHeroProfileImageApproved,
} from './artistCardImageMode.js';
import {
    getArtistsForStudio,
    getContentBundleForStudio,
    getJournalEntries,
    getPrograms,
    listCommunityVideosStudio,
} from './database.js';
import { getEmailTemplateById } from './emailCampaignTemplates.js';
import {
    renderFusionEmailFromSlots,
    fusionEmailParagraph,
    FUSION_EMAIL_STYLES,
    normalizeFusionEmailBodyHtml,
    isEmailVideoUrl,
    extractFusionEmailSlots,
} from './emailFusionLayout.js';
import { toCloudFrontAssetUrl } from './assetDistribution.js';
import { normalizeCommunityVideoRecord, parseVideoLocales } from './videoPageModel.js';

const META_PREFIX = 'FUSION_EC_META=';
const JOIN_NETWORK_CTA_HREF = 'https://fusionart.world/join-network';
const DEFAULT_WEBSITE_HERO =
    'https://fusionart-bucket.s3.us-east-2.amazonaws.com/uploads/platform-assets/program_hero-1.jpg';

/**
 * Templates that keep their own copy when a content source is applied;
 * only hero media + CTA href (and related alts) come from the source.
 */
const CONTENT_SOURCE_OVERLAY_ONLY = new Set(['tpl_reminder']);

/** Curated Website / Network items for onboarding templates. */
export const WEBSITE_NETWORK_SOURCE_ITEMS = [
    { id: 'why-join', label: 'Why join' },
    { id: 'residencies', label: 'Residencies' },
    { id: 'network', label: 'Network' },
    { id: 'context-mission', label: 'Context mission' },
];

/**
 * @typedef {{ type: 'artist' | 'journal' | 'program' | 'video' | 'website', id: string }} EmailContentSourceRef
 */

/**
 * @typedef {{
 *   templateId?: string,
 *   source?: EmailContentSourceRef | null,
 * }} EmailCampaignMeta
 */

/**
 * @typedef {{
 *   eyebrow?: string,
 *   heroImageUrl?: string,
 *   heroPosterUrl?: string,
 *   heroAlt?: string,
 *   pillLabel?: string,
 *   headlineHtml?: string,
 *   bodyHtml?: string,
 *   cta?: { label?: string, href?: string },
 *   footnote?: string,
 *   subject?: string,
 *   previewText?: string,
 * }} EmailLayoutSlots
 */

/**
 * @param {string} notes
 * @returns {{ meta: EmailCampaignMeta | null, humanNotes: string }}
 */
export function parseCampaignMeta(notes) {
    const raw = String(notes ?? '');
    const lineEnd = raw.indexOf('\n');
    const firstLine = lineEnd >= 0 ? raw.slice(0, lineEnd) : raw;
    if (!firstLine.startsWith(META_PREFIX)) {
        return { meta: null, humanNotes: raw };
    }
    try {
        const json = firstLine.slice(META_PREFIX.length).trim();
        const meta = JSON.parse(json);
        const humanNotes = lineEnd >= 0 ? raw.slice(lineEnd + 1).replace(/^\n/, '') : '';
        return { meta, humanNotes };
    } catch {
        return { meta: null, humanNotes: raw };
    }
}

/**
 * @param {EmailCampaignMeta | null | undefined} meta
 * @param {string} [humanNotes]
 * @returns {string}
 */
export function serializeCampaignMeta(meta, humanNotes = '') {
    const notes = String(humanNotes ?? '').trim();
    if (!meta || (!meta.templateId && !meta.source)) return notes;
    const line = `${META_PREFIX}${JSON.stringify(meta)}`;
    return notes ? `${line}\n${notes}` : line;
}

/**
 * @param {string} url
 * @returns {string}
 */
function normUrl(url) {
    const u = String(url ?? '').trim();
    if (!u) return '';
    try {
        return toCloudFrontAssetUrl(u) || u;
    } catch {
        return u;
    }
}

/**
 * Prefer still images for email heroes; fall back to video with optional poster.
 * @param {Array<string | null | undefined>} candidates
 * @returns {{ heroImageUrl: string, heroPosterUrl: string }}
 */
export function pickEmailHeroMedia(candidates = []) {
    let videoUrl = '';
    let posterUrl = '';
    for (const raw of candidates) {
        const u = normUrl(raw);
        if (!u) continue;
        if (isEmailVideoUrl(u)) {
            if (!videoUrl) videoUrl = u;
            continue;
        }
        if (!posterUrl) posterUrl = u;
        return { heroImageUrl: u, heroPosterUrl: '' };
    }
    if (videoUrl) {
        return { heroImageUrl: videoUrl, heroPosterUrl: posterUrl };
    }
    return { heroImageUrl: '', heroPosterUrl: '' };
}

/**
 * @param {object} artist
 * @returns {EmailLayoutSlots}
 */
export function resolveFeaturedArtistSource(artist) {
    const en = artistEnglishBlock(artist);
    const name = artistDisplayName(artist, 'en') || 'Artist';
    const slug = String(artist?.slug ?? '').trim();
    const approvedProfile = isArtistHeroProfileImageApproved(artist)
        ? getArtistCardProfileUrl(artist, { fallbackToArtwork: false })
        : '';
    const artwork = getArtistCardArtworkUrl(artist);
    const galleryStills = (Array.isArray(en?.introGallery) ? en.introGallery : [])
        .map((g) => g?.src)
        .filter(Boolean);
    // Profile (if approved) → roster artwork → first gallery stills
    const heroPick = pickEmailHeroMedia([
        approvedProfile,
        artwork,
        artist?.image,
        ...galleryStills,
        artist?.heroProfileImage,
    ]);
    const hero = heroPick.heroImageUrl || artwork || galleryStills[0] || '';
    const quote = String(en?.world?.quote ?? en?.wordsFromArtist?.body ?? '').trim();
    const bio = String(en?.bio ?? en?.bioLong ?? '').trim();
    const discipline = String(en?.discipline ?? '').trim();
    const quoteBlock = quote ? fusionEmailParagraph(`“${quote.replace(/"/g, '&quot;')}”`, 'quote') : '';
    const bioBlock = bio
        ? fusionEmailParagraph(`${bio.slice(0, 480)}${bio.length > 480 ? '…' : ''}`, 'last')
        : fusionEmailParagraph(`Discover ${name}'s practice on Fusion.`, 'last');
    const href = slug ? `https://www.fusionart.world/profile/${encodeURIComponent(slug)}` : 'https://www.fusionart.world/artists';
    return {
        eyebrow: 'Artist Spotlight',
        heroImageUrl: hero,
        heroPosterUrl: heroPick.heroPosterUrl,
        heroAlt: name,
        pillLabel: discipline ? discipline.toUpperCase() : 'FUSION ARTIST',
        headlineHtml: name.replace(/\s+/g, '<br>'),
        bodyHtml: `${quoteBlock}${bioBlock}`,
        cta: { label: 'VIEW PROFILE', href },
        subject: `${name} — Artist spotlight`,
        previewText: quote || bio.slice(0, 160) || `Meet ${name} on Fusion.`,
    };
}

/**
 * @param {object} video
 * @returns {string}
 */
export function videoEmailDisplayTitle(video) {
    const r = normalizeCommunityVideoRecord(video);
    const locales = parseVideoLocales(r.localesJson);
    return (
        String(locales.headlineEn ?? locales.lineEn ?? r.overlayTitle ?? r.slug ?? 'Video').trim() || 'Video'
    );
}

/**
 * @param {object} video
 * @returns {EmailLayoutSlots}
 */
export function resolveVideoSource(video) {
    const r = normalizeCommunityVideoRecord(video);
    const locales = parseVideoLocales(r.localesJson);
    const title = videoEmailDisplayTitle(r);
    const kicker = String(locales.kickerEn ?? '').trim();
    const line = String(locales.lineEn ?? '').trim();
    const body = String(locales.bodyEn ?? '').trim();
    const guests = String(r.overlayGuests ?? '').trim();
    const duration = String(r.overlayDuration ?? '').trim();
    const heroPick = pickEmailHeroMedia([
        r.posterUrl,
        r.imageUrl,
        r.previewVideoUrl,
        r.legacyVideoUrl,
    ]);
    const href = 'https://www.fusionart.world/videos';
    /** @type {string[]} */
    const bodyParts = [];
    if (body) {
        bodyParts.push(
            fusionEmailParagraph(`${body.slice(0, 520)}${body.length > 520 ? '…' : ''}`, 'lead'),
        );
    } else if (line) {
        bodyParts.push(fusionEmailParagraph(line, 'lead'));
    }
    if (guests) {
        const guestLine = duration ? `Featuring ${guests} · ${duration}` : `Featuring ${guests}`;
        bodyParts.push(fusionEmailParagraph(guestLine, bodyParts.length ? 'last' : 'lead'));
    }
    if (!bodyParts.length) {
        bodyParts.push(fusionEmailParagraph('Watch the latest studio visit and conversation on Fusion.', 'lead'));
    }
    if (bodyParts.length === 1) {
        bodyParts.push(fusionEmailParagraph('Watch the full video on fusionart.world.', 'last'));
    }
    return {
        eyebrow: kicker || 'Fusion Video',
        heroImageUrl: heroPick.heroImageUrl,
        heroPosterUrl: heroPick.heroPosterUrl,
        heroAlt: title,
        pillLabel: kicker ? kicker.toUpperCase() : 'FUSION VIDEO',
        headlineHtml: title.replace(/\s+/g, '<br>'),
        bodyHtml: bodyParts.join('\n'),
        cta: { label: 'WATCH NOW', href },
        subject: title,
        previewText: line || body.slice(0, 160) || `New video on Fusion: ${title}.`,
    };
}

/**
 * @param {object} entry
 * @returns {EmailLayoutSlots}
 */
export function resolveJournalSource(entry) {
    const en = entry?.en && typeof entry.en === 'object' ? entry.en : {};
    const title = String(en.title ?? 'Journal entry').trim();
    const desc = String(en.description ?? en.body ?? '').trim();
    const heroPick = pickEmailHeroMedia([entry?.imageSrc, en.imageSrc]);
    const hero = heroPick.heroImageUrl;
    const id = entry?.id != null ? String(entry.id) : '';
    const link = String(entry?.link ?? '').trim();
    const href =
        link ||
        (id ? `https://www.fusionart.world/journal/entry/${encodeURIComponent(id)}` : 'https://www.fusionart.world/journal');
    const body = desc
        ? fusionEmailParagraph(`${desc.slice(0, 520)}${desc.length > 520 ? '…' : ''}`, 'last')
        : fusionEmailParagraph('Read the latest from the Fusion journal.', 'last');
    return {
        eyebrow: 'Journal',
        heroImageUrl: hero,
        heroPosterUrl: heroPick.heroPosterUrl,
        heroAlt: title,
        pillLabel: 'FUSION JOURNAL',
        headlineHtml: title.replace(/\s+/g, '<br>'),
        bodyHtml: body,
        cta: { label: 'READ ENTRY', href },
        subject: title,
        previewText: desc.slice(0, 160) || 'From the Fusion journal.',
    };
}

/**
 * @param {object} program
 * @returns {EmailLayoutSlots}
 */
export function resolveProgramSource(program) {
    const card = program?.enCard && typeof program.enCard === 'object' ? program.enCard : program;
    const id = String(program?.id ?? card?.id ?? '').trim();
    const focus = String(card?.focus ?? 'Japan Artist Residency').trim();
    const location = String(card?.location ?? '').trim();
    const year = String(card?.year ?? '').trim();
    const start = String(card?.startDate ?? '').trim();
    const end = String(card?.endDate ?? '').trim();
    const dates = [start, end, year].filter(Boolean).join(' · ');
    const titleParts = [location.split(',')[0] || focus, year].filter(Boolean);
    const headline = titleParts.join('<br>') || 'Program Update';
    const heroMedia = normUrl(card?.heroMediaSrc);
    const imageStill = normUrl(card?.imageSrc);
    const heroPick = isEmailVideoUrl(heroMedia)
        ? {
              heroImageUrl: heroMedia,
              heroPosterUrl: imageStill && !isEmailVideoUrl(imageStill) ? imageStill : '',
          }
        : pickEmailHeroMedia([
              card?.heroMediaSrc,
              card?.imageSrc,
              card?.programPage?.fadeGalleryImages?.[0],
          ]);
    const hero = heroPick.heroImageUrl;
    const brief = String(card?.briefDescription ?? card?.programPage?.description ?? '').trim();
    const routeLink = String(program?.routeLink ?? card?.routeLink ?? '').trim();
    const href = routeLink
        ? routeLink.startsWith('http')
            ? routeLink
            : `https://www.fusionart.world${routeLink.startsWith('/') ? routeLink : `/${routeLink}`}`
        : 'https://www.fusionart.world/programs';
    const body = brief
        ? fusionEmailParagraph(brief, 'lead')
        : fusionEmailParagraph(`Applications and details for the ${focus} program.`, 'lead');
    const dateLine = dates
        ? fusionEmailParagraph(`<strong>Dates:</strong> ${dates}`, 'last')
        : '';
    return {
        eyebrow: 'Program Update',
        heroImageUrl: hero,
        heroPosterUrl: heroPick.heroPosterUrl,
        heroAlt: location || focus,
        pillLabel: focus.toUpperCase().includes('RESIDENCY') ? focus.toUpperCase() : 'JAPAN ARTIST RESIDENCY',
        headlineHtml: headline,
        bodyHtml: `${body}${dateLine}`,
        cta: { label: 'APPLY / LEARN MORE', href },
        subject: `${titleParts[0] || 'Fusion program'}${year ? ` (${year})` : ''}`,
        previewText: brief.slice(0, 160) || `Program update: ${focus}.`,
    };
}

/**
 * @param {string} id
 * @param {{ context?: object, joinNetworkFlow?: object, programs?: object[], featureCards?: object }} [ctx]
 * @returns {EmailLayoutSlots | null}
 */
export function resolveWebsiteSource(id, ctx = {}) {
    const key = String(id ?? '').trim();
    if (!WEBSITE_NETWORK_SOURCE_ITEMS.some((i) => i.id === key)) return null;

    const context = ctx.context && typeof ctx.context === 'object' ? ctx.context : {};
    const ctxEn =
        context.en && typeof context.en === 'object'
            ? context.en
            : context;
    const joinFlow =
        ctx.joinNetworkFlow && typeof ctx.joinNetworkFlow === 'object' ? ctx.joinNetworkFlow : {};
    const membership =
        joinFlow.membership && typeof joinFlow.membership === 'object' ? joinFlow.membership : {};
    const valueEn =
        membership.value?.en && typeof membership.value.en === 'object'
            ? membership.value.en
            : {};
    const bandEn =
        membership.band?.en && typeof membership.band.en === 'object' ? membership.band.en : {};
    const programs = Array.isArray(ctx.programs) ? ctx.programs : [];
    const featureCards =
        ctx.featureCards && typeof ctx.featureCards === 'object' ? ctx.featureCards : {};
    const groups = Array.isArray(featureCards.groups) ? featureCards.groups : [];
    const contextGroup = groups.find((g) => String(g?.id ?? '') === 'context') || groups[0];
    const cards = Array.isArray(contextGroup?.cards) ? contextGroup.cards : [];

    const firstProgram = programs[0];
    const enCard =
        firstProgram?.enCard && typeof firstProgram.enCard === 'object'
            ? firstProgram.enCard
            : firstProgram;
    const programHero = normUrl(enCard?.imageSrc ?? enCard?.heroMediaSrc ?? '') || DEFAULT_WEBSITE_HERO;
    const contextHero =
        normUrl(ctxEn?.subImage ?? context.subImage ?? '') || programHero || DEFAULT_WEBSITE_HERO;

    const includes = Array.isArray(valueEn.includes) ? valueEn.includes : [];
    const includesHtml = includes.length
        ? `<ul style="${FUSION_EMAIL_STYLES.bodyList}">${includes
              .map((line) => `<li>${String(line).replace(/</g, '&lt;')}</li>`)
              .join('')}</ul>`
        : `<ul style="${FUSION_EMAIL_STYLES.bodyList}">
<li>Artist profile + gallery system</li>
<li>Residency &amp; program applications included</li>
<li>Access to the network and platform updates</li>
</ul>`;

    const cta = { label: 'JOIN FUSION', href: JOIN_NETWORK_CTA_HREF };
    const footnote = 'Residency applications included · Cancel anytime';

    if (key === 'why-join') {
        const lead =
            String(valueEn.lead ?? bandEn.description ?? '').trim() ||
            'Join a curated art network connecting artists, galleries, curators, and collectors through programs rooted in Japan.';
        const whyHero = pickEmailHeroMedia([
            ctxEn?.subImage,
            context.subImage,
            enCard?.imageSrc,
            enCard?.heroMediaSrc,
            DEFAULT_WEBSITE_HERO,
        ]);
        return {
            eyebrow: 'Join the Network',
            heroImageUrl: whyHero.heroImageUrl || DEFAULT_WEBSITE_HERO,
            heroPosterUrl: whyHero.heroPosterUrl,
            heroAlt: 'Join FUSION',
            pillLabel: 'MEMBERSHIP',
            headlineHtml: 'Your practice<br>belongs in a<br>wider context.',
            bodyHtml: [
                fusionEmailParagraph(lead, 'lead'),
                includesHtml,
                fusionEmailParagraph(
                    'Create your membership in under two minutes. Secure payment by PayPal or card — cancel anytime.',
                    'last',
                ),
            ].join('\n'),
            cta,
            footnote,
            subject: 'Join a curated art network — Join FUSION',
            previewText: lead.slice(0, 160),
        };
    }

    if (key === 'residencies') {
        const visible = programs.slice(0, 3);
        const lines = visible.map((p) => {
            const card = p?.enCard && typeof p.enCard === 'object' ? p.enCard : p;
            const focus = String(card?.focus ?? card?.location ?? p?.id ?? 'Program').trim();
            const loc = String(card?.location ?? '').trim();
            const brief = String(card?.briefDescription ?? '').trim();
            return brief || (loc ? `${focus} — ${loc}` : focus);
        });
        const listHtml = lines.length
            ? `<ul style="${FUSION_EMAIL_STYLES.bodyList}">${lines
                  .map((line) => `<li>${String(line).replace(/</g, '&lt;')}</li>`)
                  .join('')}</ul>`
            : includesHtml;
        return {
            eyebrow: 'Join the Network',
            heroImageUrl: programHero,
            heroAlt: String(enCard?.focus ?? 'Fusion residencies'),
            pillLabel: 'JAPAN PROGRAMS',
            headlineHtml: 'Programs<br>rooted in<br>Japan.',
            bodyHtml: [
                fusionEmailParagraph(
                    'Membership includes residency and program applications — place, process, and exchange across Japan.',
                    'lead',
                ),
                listHtml,
                fusionEmailParagraph(
                    'Join FUSION to apply and stay connected to what comes next.',
                    'last',
                ),
            ].join('\n'),
            cta,
            footnote,
            subject: 'Programs rooted in Japan — Join FUSION',
            previewText: 'Membership includes residency and program applications.',
        };
    }

    if (key === 'network') {
        const cardLines = cards.slice(0, 4).map((c) => {
            const en = c?.en && typeof c.en === 'object' ? c.en : c;
            return String(en?.title ?? en?.name ?? c?.title ?? '').trim();
        }).filter(Boolean);
        const networkList = cardLines.length
            ? `<ul style="${FUSION_EMAIL_STYLES.bodyList}">${cardLines
                  .map((line) => `<li>${String(line).replace(/</g, '&lt;')}</li>`)
                  .join('')}</ul>`
            : includesHtml;
        return {
            eyebrow: 'Join the Network',
            heroImageUrl: contextHero,
            heroAlt: 'Fusion network',
            pillLabel: 'NETWORK',
            headlineHtml: 'A curated<br>art network.',
            bodyHtml: [
                fusionEmailParagraph(
                    String(bandEn.description ?? '').trim() ||
                        'Connect with artists, galleries, curators, and collectors through a curated art network built for exchange.',
                    'lead',
                ),
                networkList,
                fusionEmailParagraph('Start with membership — your profile and access grow with you.', 'last'),
            ].join('\n'),
            cta,
            footnote,
            subject: 'Join Fusion’s curated art network',
            previewText: 'Connect with artists, galleries, curators, and collectors.',
        };
    }

    // context-mission
    const headline = String(ctxEn?.headline ?? context.headline ?? '').trim() || 'Context';
    const sub = String(ctxEn?.subheadline ?? context.subheadline ?? '').trim();
    const h2 = String(ctxEn?.headline2 ?? context.headline2 ?? '').trim();
    const h3 = String(ctxEn?.headline3 ?? context.headline3 ?? '').trim();
    return {
        eyebrow: 'Join the Network',
        heroImageUrl: contextHero,
        heroAlt: headline,
        pillLabel: 'CONTEXT',
        headlineHtml: headline.replace(/\s+/g, '<br>'),
        bodyHtml: [
            fusionEmailParagraph(sub || h2 || 'Fusion is a curated art network rooted in Japan.', 'lead'),
            h2 && h2 !== sub ? fusionEmailParagraph(h2) : '',
            h3 ? fusionEmailParagraph(h3, 'last') : fusionEmailParagraph('Join the curated art network and bring your practice into a wider context.', 'last'),
        ]
            .filter(Boolean)
            .join('\n'),
        cta,
        footnote,
        subject: `${headline} — Join FUSION`,
        previewText: (sub || h2 || 'Join Fusion’s curated art network.').slice(0, 160),
    };
}

/**
 * @param {EmailContentSourceRef} ref
 * @param {object[]} [artistRows]
 * @param {object[]} [journalRows]
 * @param {object[]} [programRows]
 * @param {object[]} [videoRows]
 * @param {{ context?: object, joinNetworkFlow?: object, programs?: object[], featureCards?: object }} [websiteCtx]
 * @returns {EmailLayoutSlots | null}
 */
export function resolveContentSource(
    ref,
    artistRows = [],
    journalRows = [],
    programRows = [],
    videoRows = [],
    websiteCtx = {},
) {
    const type = ref?.type;
    const id = String(ref?.id ?? '').trim();
    if (!type || !id) return null;
    if (type === 'artist') {
        const row = artistRows.find(
            (a) => String(a?.id ?? '') === id || String(a?.slug ?? '') === id,
        );
        return row ? resolveFeaturedArtistSource(row) : null;
    }
    if (type === 'journal') {
        const row = journalRows.find((j) => String(j?.id ?? '') === id);
        return row ? resolveJournalSource(row) : null;
    }
    if (type === 'program') {
        const row = programRows.find((p) => String(p?.id ?? '') === id);
        return row ? resolveProgramSource(row) : null;
    }
    if (type === 'video') {
        const row = videoRows.find((v) => String(normalizeCommunityVideoRecord(v).id) === id);
        return row ? resolveVideoSource(row) : null;
    }
    if (type === 'website') {
        return resolveWebsiteSource(id, {
            ...websiteCtx,
            programs: websiteCtx.programs?.length ? websiteCtx.programs : programRows,
        });
    }
    return null;
}

/**
 * @param {'artist' | 'journal' | 'program' | 'video' | 'website'} type
 * @param {object[]} rows
 * @returns {Array<{ id: string, label: string, thumb: string }>}
 */
export function listContentSourceOptions(type, rows) {
    if (type === 'website') {
        const thumbById = new Map(
            (Array.isArray(rows) ? rows : [])
                .map((r) => [String(r?.id ?? ''), normUrl(r?.thumb ?? r?.imageSrc ?? '')])
                .filter(([id]) => id),
        );
        return WEBSITE_NETWORK_SOURCE_ITEMS.map((item) => ({
            id: item.id,
            label: item.label,
            thumb: thumbById.get(item.id) || '',
        }));
    }
    if (type === 'artist') {
        return rows
            .map((a) => ({
                id: String(a?.id ?? a?.slug ?? ''),
                label: artistDisplayName(a, 'en') || String(a?.slug ?? 'Artist'),
                thumb: normUrl(a?.heroProfileImage) || normUrl(a?.image) || '',
            }))
            .filter((o) => o.id);
    }
    if (type === 'journal') {
        return rows
            .map((j) => {
                const en = j?.en && typeof j.en === 'object' ? j.en : {};
                return {
                    id: String(j?.id ?? ''),
                    label: String(en.title ?? `Entry ${j?.id ?? ''}`),
                    thumb: normUrl(j?.imageSrc ?? en.imageSrc ?? ''),
                };
            })
            .filter((o) => o.id);
    }
    if (type === 'program') {
        return rows
            .map((p) => {
                const card = p?.enCard && typeof p.enCard === 'object' ? p.enCard : p;
                return {
                    id: String(p?.id ?? card?.id ?? ''),
                    label: String(card?.focus ?? card?.location ?? p?.id ?? 'Program'),
                    thumb: normUrl(card?.imageSrc ?? card?.heroMediaSrc ?? ''),
                };
            })
            .filter((o) => o.id);
    }
    if (type === 'video') {
        return rows
            .map((v) => {
                const r = normalizeCommunityVideoRecord(v);
                const title = videoEmailDisplayTitle(r);
                const hidden = r.visible === false ? ' (hidden)' : '';
                return {
                    id: String(r.id),
                    label: `${title}${hidden}`,
                    thumb: normUrl(r.posterUrl) || normUrl(r.imageUrl) || '',
                };
            })
            .filter((o) => o.id);
    }
    return [];
}

/**
 * Overlay program/media facts onto a template's own layout copy.
 * @param {string} templateId
 * @param {EmailLayoutSlots} sourceSlots
 * @returns {EmailLayoutSlots}
 */
function mergeOverlayOnlyTemplateSlots(templateId, sourceSlots) {
    const tpl = getEmailTemplateById(templateId);
    const base = extractFusionEmailSlots(String(tpl?.bodyHtml || ''));
    if (!base) return sourceSlots;
    const href = String(sourceSlots?.cta?.href || base.cta?.href || '').trim();
    const programLabel = String(sourceSlots?.subject || sourceSlots?.heroAlt || '')
        .replace(/\s*\(\d{4}\)\s*$/, '')
        .trim();
    return {
        ...base,
        heroImageUrl: String(sourceSlots?.heroImageUrl || base.heroImageUrl || '').trim(),
        heroPosterUrl: String(sourceSlots?.heroPosterUrl || base.heroPosterUrl || '').trim(),
        heroAlt: String(sourceSlots?.heroAlt || base.heroAlt || '').trim(),
        cta: {
            label: String(base.cta?.label || '').trim(),
            href: href || 'https://www.fusionart.world/programs',
        },
        subject: programLabel
            ? `Last chance to apply — ${programLabel}`
            : String(tpl?.defaultSubject || '').trim(),
        previewText: String(tpl?.defaultPreview || sourceSlots?.previewText || '')
            .trim()
            .slice(0, 200),
    };
}

/**
 * @param {string} templateId
 * @param {EmailLayoutSlots} slots
 * @returns {{ subject: string, previewText: string, bodyHtml: string }}
 */
export function buildTemplateDraftFromSlots(templateId, slots) {
    const tpl = getEmailTemplateById(templateId);
    const merged = CONTENT_SOURCE_OVERLAY_ONLY.has(templateId)
        ? mergeOverlayOnlyTemplateSlots(templateId, slots)
        : slots;
    return {
        subject: String(merged.subject ?? tpl?.defaultSubject ?? '').trim(),
        previewText: String(merged.previewText ?? tpl?.defaultPreview ?? '')
            .trim()
            .slice(0, 200),
        bodyHtml: renderFusionEmailFromSlots(merged),
    };
}

/**
 * @param {string} templateId
 * @param {EmailContentSourceRef | null} source
 * @param {object} caches
 * @returns {{ subject: string, previewText: string, bodyHtml: string } | null}
 */
export function buildTemplateDraftFromSource(templateId, source, caches = {}) {
    if (!source) return null;
    const slots = resolveContentSource(
        source,
        caches.artists || [],
        caches.journals || [],
        caches.programs || [],
        caches.videos || [],
        {
            context: caches.context,
            joinNetworkFlow: caches.joinNetworkFlow,
            programs: caches.programs || [],
            featureCards: caches.featureCards,
        },
    );
    if (!slots) return null;
    return buildTemplateDraftFromSlots(templateId, slots);
}

/**
 * @param {object[]} artists
 * @param {object[]} videos
 * @returns {Array<{ url: string, label: string, group: string, thumb: string, kind: 'image' | 'video', posterUrl?: string }>}
 */
export function collectStudioEmailMedia(artists = [], videos = []) {
    /** @type {Map<string, { url: string, label: string, group: string, thumb: string, kind: 'image' | 'video', posterUrl?: string }>} */
    const seen = new Map();
    const addImage = (url, label, group) => {
        const u = normUrl(url);
        if (!u || isEmailVideoUrl(u) || seen.has(u)) return;
        seen.set(u, {
            url: u,
            label: String(label || 'Image').trim(),
            group,
            thumb: u,
            kind: 'image',
        });
    };
    const addVideo = (url, label, group, posterUrl = '') => {
        const u = normUrl(url);
        if (!u || !isEmailVideoUrl(u) || seen.has(u)) return;
        const poster = normUrl(posterUrl);
        const thumb = poster && !isEmailVideoUrl(poster) ? poster : '';
        seen.set(u, {
            url: u,
            label: String(label || 'Video').trim(),
            group,
            thumb,
            kind: 'video',
            posterUrl: thumb,
        });
    };

    for (const a of artists) {
        const name = artistDisplayName(a, 'en') || 'Artist';
        addImage(a?.heroProfileImage, `${name} — hero profile`, 'Artist media');
        addImage(a?.image, `${name} — card image`, 'Artist media');
        const en = artistEnglishBlock(a);
        const gallery = Array.isArray(en?.introGallery) ? en.introGallery : [];
        gallery.forEach((g, i) => {
            const src = g?.src;
            if (isEmailVideoUrl(src)) {
                addVideo(src, `${name} — gallery video ${i + 1}`, 'Artist media');
            } else {
                addImage(src, `${name} — gallery ${i + 1}`, 'Artist media');
            }
        });
    }

    for (const v of videos) {
        const title = String(v?.slug ?? v?.id ?? 'Video');
        const poster = normUrl(v?.posterUrl);
        const imageStill = normUrl(v?.imageUrl);
        if (poster && !isEmailVideoUrl(poster)) {
            addImage(poster, `${title} — poster`, 'Video posters');
        }
        if (imageStill && !isEmailVideoUrl(imageStill)) {
            addImage(imageStill, `${title} — card image`, 'Video posters');
        }
        addVideo(v?.previewVideoUrl, `${title} — preview`, 'Videos', poster);
        addVideo(v?.legacyVideoUrl, `${title} — full video`, 'Videos', poster);
    }

    return [...seen.values()];
}

/**
 * Broader still-image library for Social image picker (tabs by content type).
 * @param {{
 *   artists?: object[],
 *   journals?: object[],
 *   programs?: object[],
 *   videos?: object[],
 *   context?: object,
 *   website?: Array<{ id?: string, thumb?: string }>,
 * }} caches
 * @returns {Array<{ url: string, label: string, group: string, thumb: string, kind: 'image' }>}
 */
export function collectStudioSocialMedia(caches = {}) {
    /** @type {Map<string, { url: string, label: string, group: string, thumb: string, kind: 'image' }>} */
    const seen = new Map();
    const add = (url, label, group) => {
        const u = normUrl(url);
        if (!u || isEmailVideoUrl(u) || seen.has(u)) return;
        seen.set(u, {
            url: u,
            label: String(label || 'Image').trim(),
            group,
            thumb: u,
            kind: 'image',
        });
    };

    for (const item of collectStudioEmailMedia(caches.artists || [], caches.videos || [])) {
        if (item.kind !== 'image') continue;
        const group =
            item.group === 'Video posters' || item.group === 'Videos' ? 'Videos' : 'Artists';
        add(item.url, item.label, group);
    }

    for (const p of caches.programs || []) {
        const card = p?.enCard && typeof p.enCard === 'object' ? p.enCard : p;
        const label = String(card?.focus ?? card?.location ?? p?.id ?? 'Program');
        add(card?.imageSrc, `${label} — card`, 'Programs');
        add(card?.heroMediaSrc, `${label} — hero`, 'Programs');
        const page = card?.programPage || p?.programPage;
        if (page && typeof page === 'object') {
            for (const u of Array.isArray(page.fadeGalleryImages) ? page.fadeGalleryImages : []) {
                add(u, `${label} — gallery`, 'Programs');
            }
            for (const u of Array.isArray(page.stripGalleryImages) ? page.stripGalleryImages : []) {
                add(u, `${label} — strip`, 'Programs');
            }
        }
    }

    for (const j of caches.journals || []) {
        const en = j?.en && typeof j.en === 'object' ? j.en : {};
        const title = String(en.title ?? `Entry ${j?.id ?? ''}`);
        add(j?.imageSrc ?? en.imageSrc, title, 'Journal');
    }

    const ctx = caches.context && typeof caches.context === 'object' ? caches.context : {};
    const ctxEn = ctx.en && typeof ctx.en === 'object' ? ctx.en : ctx;
    add(ctxEn?.subImage ?? ctx.subImage, 'Context — sub image', 'Website');
    add(ctxEn?.heroImage ?? ctx.heroImage, 'Context — hero', 'Website');
    for (const w of Array.isArray(caches.website) ? caches.website : []) {
        add(w?.thumb, `Website — ${w?.id || 'item'}`, 'Website');
    }
    add(DEFAULT_WEBSITE_HERO, 'Fusion — default program hero', 'Website');

    return [...seen.values()];
}

/** @deprecated Use collectStudioEmailMedia */
export function collectStudioImageUrls(artists = [], videos = []) {
    return collectStudioEmailMedia(artists, videos).filter((item) => item.kind === 'image');
}

/**
 * Load studio caches for content sources and media picker.
 */
export async function loadEmailStudioContentCaches() {
    const [artists, journals, programs, videos, context, joinNetworkFlow, featureCards] =
        await Promise.all([
            getArtistsForStudio().catch(() => []),
            getJournalEntries().catch(() => []),
            getPrograms().catch(() => []),
            listCommunityVideosStudio().catch(() => []),
            getContentBundleForStudio('context', { forStudio: true }).catch(() => ({})),
            getContentBundleForStudio('join-network-flow', { forStudio: true }).catch(() => ({})),
            getContentBundleForStudio('feature-cards', { forStudio: true }).catch(() => ({})),
        ]);
    const programRows = Array.isArray(programs) ? programs : [];
    const firstCard =
        programRows[0]?.enCard && typeof programRows[0].enCard === 'object'
            ? programRows[0].enCard
            : programRows[0];
    const ctxObj = context && typeof context === 'object' ? context : {};
    const ctxEn = ctxObj.en && typeof ctxObj.en === 'object' ? ctxObj.en : ctxObj;
    const websiteThumbs = [
        {
            id: 'why-join',
            thumb: normUrl(ctxEn?.subImage) || normUrl(firstCard?.imageSrc) || DEFAULT_WEBSITE_HERO,
        },
        {
            id: 'residencies',
            thumb: normUrl(firstCard?.imageSrc ?? firstCard?.heroMediaSrc) || DEFAULT_WEBSITE_HERO,
        },
        {
            id: 'network',
            thumb: normUrl(ctxEn?.subImage) || DEFAULT_WEBSITE_HERO,
        },
        {
            id: 'context-mission',
            thumb: normUrl(ctxEn?.subImage) || DEFAULT_WEBSITE_HERO,
        },
    ];
    return {
        artists: Array.isArray(artists) ? artists : [],
        journals: Array.isArray(journals) ? journals : [],
        programs: programRows,
        videos: Array.isArray(videos) ? videos : [],
        context: ctxObj,
        joinNetworkFlow: joinNetworkFlow && typeof joinNetworkFlow === 'object' ? joinNetworkFlow : {},
        featureCards: featureCards && typeof featureCards === 'object' ? featureCards : {},
        website: websiteThumbs,
        media: collectStudioEmailMedia(
            Array.isArray(artists) ? artists : [],
            Array.isArray(videos) ? videos : [],
        ),
        images: collectStudioEmailMedia(
            Array.isArray(artists) ? artists : [],
            Array.isArray(videos) ? videos : [],
        ),
        socialMedia: collectStudioSocialMedia({
            artists: Array.isArray(artists) ? artists : [],
            journals: Array.isArray(journals) ? journals : [],
            programs: programRows,
            videos: Array.isArray(videos) ? videos : [],
            context: ctxObj,
            website: websiteThumbs,
        }),
    };
}

/**
 * @param {string} templateId
 * @param {EmailContentSourceRef | null} source
 * @param {string} userPrompt
 * @param {object} caches
 * @returns {object}
 */
export function buildQuickDesignContext(templateId, source, userPrompt, caches = {}, editorDraft = {}) {
    const tpl = getEmailTemplateById(templateId);
    const websiteCtx = {
        context: caches.context,
        joinNetworkFlow: caches.joinNetworkFlow,
        programs: caches.programs || [],
        featureCards: caches.featureCards,
    };
    let sourceSlots = null;
    if (source) {
        sourceSlots = resolveContentSource(
            source,
            caches.artists || [],
            caches.journals || [],
            caches.programs || [],
            caches.videos || [],
            websiteCtx,
        );
    }
    const subject = String(editorDraft.subject ?? '').trim();
    const previewText = String(editorDraft.previewText ?? '').trim();
    const isBranded = Boolean(editorDraft.isBranded);
    const layoutSlots = editorDraft.layoutSlots || null;
    const bodyHtml = String(editorDraft.rawBodyHtml ?? '').trim();
    const isOnboarding = templateId === 'tpl_onboarding';
    const isReminder = templateId === 'tpl_reminder';
    return {
        templateId,
        templateName: tpl?.name ?? '',
        defaultEyebrow: tpl?.defaultEyebrow ?? 'Program Update',
        userPrompt: String(userPrompt ?? '').trim().slice(0, 2000),
        task: isOnboarding
            ? 'Write onboarding email copy inviting readers to join the FUSION membership network (Japan-rooted programs). Reformat existingDraft into layout JSON slots. CTA href must remain https://fusionart.world/join-network. Return text slots only; app applies the Fusion shell.'
            : isReminder
              ? 'Write a last-chance program application reminder. Keep urgency and invite readers to apply before the deadline. Use sourceFacts only for program name, hero image, dates, and apply URL — do not rewrite as a generic Program Update. Preserve reminder tone from existingDraft when present. Return text slots only; app applies the Fusion shell.'
              : 'Reformat existingDraft into layout JSON slots. The app applies the Fusion email shell (logo, hero, borders, footer) using styleGuide — return text slots only. Preserve factual names, dates, and URLs from sourceFacts when present.',
        styleGuide: {
            canvas: FUSION_EMAIL_STYLES.canvas,
            textColor: FUSION_EMAIL_STYLES.text,
            ctaBackground: FUSION_EMAIL_STYLES.ctaBg,
            bodyLeadStyle: FUSION_EMAIL_STYLES.bodyLead,
            bodyStyle: FUSION_EMAIL_STYLES.body,
            bodyLastStyle: FUSION_EMAIL_STYLES.bodyLast,
            linkStyle: FUSION_EMAIL_STYLES.link,
            headlineNote:
                'Use headlineHtml for the h1 slot only (shell renders 44px black). Use pillLabel for the black pill.',
            bodyNote:
                'bodyHtml: <p> paragraphs only inside the bordered content block. First p lead, middle body, last bodyLast. Black text only. Links black underline. No CTA button in bodyHtml — use layout.cta.',
            ...(isOnboarding
                ? {
                      onboardingNote:
                          'Emphasize membership value, Japan positioning, residency applications included, cancel anytime. Primary CTA label like JOIN FUSION linking to /join-network.',
                  }
                : {}),
            ...(isReminder
                ? {
                      reminderNote:
                          'Eyebrow like Final Days / Last chance. CTA label like APPLY BEFORE THE DEADLINE. Do not use Program Update eyebrow or generic program-update headlines.',
                  }
                : {}),
        },
        existingDraft: {
            subject,
            previewText,
            isBranded,
            layoutSlots,
            bodyHtml,
        },
        sourceFacts: sourceSlots
            ? isReminder
                ? {
                      heroImageUrl: sourceSlots.heroImageUrl,
                      heroAlt: sourceSlots.heroAlt,
                      programSubject: sourceSlots.subject,
                      programPreview: sourceSlots.previewText,
                      applyHref: sourceSlots.cta?.href,
                      dateHints: sourceSlots.bodyHtml,
                  }
                : {
                      eyebrow: sourceSlots.eyebrow,
                      headlineHtml: sourceSlots.headlineHtml,
                      heroImageUrl: sourceSlots.heroImageUrl,
                      heroAlt: sourceSlots.heroAlt,
                      pillLabel: sourceSlots.pillLabel,
                      bodyHtml: sourceSlots.bodyHtml,
                      cta: sourceSlots.cta,
                      subject: sourceSlots.subject,
                      previewText: sourceSlots.previewText,
                  }
            : null,
    };
}

/**
 * Merge LLM, source, and editor slots; enforce Fusion baseline paragraph + link styles.
 * @param {string} templateId
 * @param {EmailLayoutSlots} llmSlots
 * @param {{ sourceSlots?: EmailLayoutSlots | null, editorSlots?: EmailLayoutSlots | null }} [opts]
 * @returns {EmailLayoutSlots}
 */
export function finalizeQuickDesignSlots(templateId, llmSlots, opts = {}) {
    const tpl = getEmailTemplateById(templateId);
    const sourceSlots = opts.sourceSlots || null;
    const editor = opts.editorSlots || {};
    const overlayOnly = CONTENT_SOURCE_OVERLAY_ONLY.has(templateId);
    const tplSlots = overlayOnly ? extractFusionEmailSlots(String(tpl?.bodyHtml || '')) : null;

    const str = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : '');

    const rawBody = overlayOnly
        ? str(llmSlots.bodyHtml) ||
          str(editor.bodyHtml) ||
          str(tplSlots?.bodyHtml) ||
          ''
        : str(llmSlots.bodyHtml) || str(editor.bodyHtml) || str(sourceSlots?.bodyHtml) || '';
    const normalizedBody = normalizeFusionEmailBodyHtml(rawBody);

    return {
        eyebrow: overlayOnly
            ? str(llmSlots.eyebrow) ||
              str(editor.eyebrow) ||
              str(tplSlots?.eyebrow) ||
              tpl?.defaultEyebrow ||
              'Final Days'
            : str(sourceSlots?.eyebrow) ||
              str(llmSlots.eyebrow) ||
              str(editor.eyebrow) ||
              tpl?.defaultEyebrow ||
              'Program Update',
        heroImageUrl: str(sourceSlots?.heroImageUrl) || str(editor.heroImageUrl) || str(tplSlots?.heroImageUrl) || '',
        heroPosterUrl:
            str(sourceSlots?.heroPosterUrl) || str(editor.heroPosterUrl) || str(tplSlots?.heroPosterUrl) || '',
        heroAlt: str(sourceSlots?.heroAlt) || str(editor.heroAlt) || str(tplSlots?.heroAlt) || '',
        pillLabel: overlayOnly
            ? str(llmSlots.pillLabel) || str(editor.pillLabel) || str(tplSlots?.pillLabel) || ''
            : str(llmSlots.pillLabel) || str(sourceSlots?.pillLabel) || str(editor.pillLabel) || '',
        headlineHtml: overlayOnly
            ? str(llmSlots.headlineHtml) ||
              str(editor.headlineHtml) ||
              str(tplSlots?.headlineHtml) ||
              ''
            : str(sourceSlots?.headlineHtml) ||
              str(llmSlots.headlineHtml) ||
              str(editor.headlineHtml) ||
              '',
        bodyHtml: normalizedBody,
        footnote:
            str(llmSlots.footnote) || str(editor.footnote) || str(tplSlots?.footnote) || '',
        cta: {
            label: overlayOnly
                ? str(llmSlots.cta?.label) ||
                  str(editor.cta?.label) ||
                  str(tplSlots?.cta?.label) ||
                  'APPLY BEFORE THE DEADLINE'
                : str(sourceSlots?.cta?.label) ||
                  str(llmSlots.cta?.label) ||
                  str(editor.cta?.label) ||
                  (templateId === 'tpl_onboarding' ? 'JOIN FUSION' : ''),
            href:
                templateId === 'tpl_onboarding'
                    ? JOIN_NETWORK_CTA_HREF
                    : str(sourceSlots?.cta?.href) ||
                      str(llmSlots.cta?.href) ||
                      str(editor.cta?.href) ||
                      str(tplSlots?.cta?.href) ||
                      'https://www.fusionart.world',
        },
        subject: overlayOnly
            ? str(llmSlots.subject) ||
              str(editor.subject) ||
              tpl?.defaultSubject ||
              ''
            : str(llmSlots.subject) ||
              str(sourceSlots?.subject) ||
              str(editor.subject) ||
              tpl?.defaultSubject ||
              '',
        previewText: overlayOnly
            ? str(llmSlots.previewText) ||
              str(editor.previewText) ||
              tpl?.defaultPreview ||
              ''
            : str(llmSlots.previewText) ||
              str(sourceSlots?.previewText) ||
              str(editor.previewText) ||
              tpl?.defaultPreview ||
              '',
    };
}

/**
 * @param {EmailLayoutSlots} llmSlots
 * @param {EmailLayoutSlots | null} sourceSlots
 * @returns {EmailLayoutSlots}
 */
export function mergeQuickDesignSlots(llmSlots, sourceSlots) {
    return finalizeQuickDesignSlots('', llmSlots, { sourceSlots });
}

/**
 * @param {string} raw
 * @returns {{ subject?: string, previewText?: string, layout?: EmailLayoutSlots } | null}
 */
export function parseEmailLayoutLlmJson(raw) {
    const t0 = String(raw ?? '').trim();
    if (!t0) return null;
    const strip = (s) =>
        s
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
    const tryParse = (s) => {
        try {
            return JSON.parse(s);
        } catch {
            return null;
        }
    };
    let o = tryParse(strip(t0));
    if (!o) {
        const m = strip(t0).match(/\{[\s\S]*\}/);
        if (m) o = tryParse(m[0]);
    }
    if (!o || typeof o !== 'object') return null;
    const layout = o.layout && typeof o.layout === 'object' ? o.layout : {};
    return {
        subject: o.subject != null ? String(o.subject) : undefined,
        previewText: o.previewText != null ? String(o.previewText) : undefined,
        layout: {
            eyebrow: layout.eyebrow != null ? String(layout.eyebrow) : undefined,
            pillLabel: layout.pillLabel != null ? String(layout.pillLabel) : undefined,
            headlineHtml: layout.headlineHtml != null ? String(layout.headlineHtml) : undefined,
            bodyHtml: layout.bodyHtml != null ? String(layout.bodyHtml) : undefined,
            footnote: layout.footnote != null ? String(layout.footnote) : undefined,
            cta:
                layout.cta && typeof layout.cta === 'object'
                    ? {
                          label: layout.cta.label != null ? String(layout.cta.label) : undefined,
                          href: layout.cta.href != null ? String(layout.cta.href) : undefined,
                      }
                    : undefined,
        },
    };
}
