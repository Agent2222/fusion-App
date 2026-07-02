/**
 * Content sources for Studio email templates (artist, journal, program).
 */
import { artistDisplayName, artistEnglishBlock } from './artistSlug.js';
import { getArtistsForStudio, getJournalEntries, getPrograms, listCommunityVideosStudio } from './database.js';
import { getEmailTemplateById } from './emailCampaignTemplates.js';
import { renderFusionEmailFromSlots, fusionEmailParagraph, FUSION_EMAIL_STYLES, normalizeFusionEmailBodyHtml, isEmailVideoUrl } from './emailFusionLayout.js';
import { toCloudFrontAssetUrl } from './assetDistribution.js';

const META_PREFIX = 'FUSION_EC_META=';

/**
 * @typedef {{ type: 'artist' | 'journal' | 'program', id: string }} EmailContentSourceRef
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
    const heroPick = pickEmailHeroMedia([
        artist?.heroProfileImage,
        artist?.image,
        ...(Array.isArray(en?.introGallery) ? en.introGallery.map((g) => g?.src) : []),
    ]);
    const hero = heroPick.heroImageUrl;
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
 * @param {EmailContentSourceRef} ref
 * @param {object[]} [artistRows]
 * @param {object[]} [journalRows]
 * @param {object[]} [programRows]
 * @returns {EmailLayoutSlots | null}
 */
export function resolveContentSource(ref, artistRows = [], journalRows = [], programRows = []) {
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
    return null;
}

/**
 * @param {'artist' | 'journal' | 'program'} type
 * @param {object[]} rows
 * @returns {Array<{ id: string, label: string, thumb: string }>}
 */
export function listContentSourceOptions(type, rows) {
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
    return [];
}

/**
 * @param {string} templateId
 * @param {EmailLayoutSlots} slots
 * @returns {{ subject: string, previewText: string, bodyHtml: string }}
 */
export function buildTemplateDraftFromSlots(templateId, slots) {
    const tpl = getEmailTemplateById(templateId);
    return {
        subject: String(slots.subject ?? tpl?.defaultSubject ?? '').trim(),
        previewText: String(slots.previewText ?? tpl?.defaultPreview ?? '').trim().slice(0, 200),
        bodyHtml: renderFusionEmailFromSlots(slots),
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

/** @deprecated Use collectStudioEmailMedia */
export function collectStudioImageUrls(artists = [], videos = []) {
    return collectStudioEmailMedia(artists, videos).filter((item) => item.kind === 'image');
}

/**
 * Load studio caches for content sources and media picker.
 */
export async function loadEmailStudioContentCaches() {
    const [artists, journals, programs, videos] = await Promise.all([
        getArtistsForStudio().catch(() => []),
        getJournalEntries().catch(() => []),
        getPrograms().catch(() => []),
        listCommunityVideosStudio().catch(() => []),
    ]);
    return {
        artists: Array.isArray(artists) ? artists : [],
        journals: Array.isArray(journals) ? journals : [],
        programs: Array.isArray(programs) ? programs : [],
        videos: Array.isArray(videos) ? videos : [],
        media: collectStudioEmailMedia(
            Array.isArray(artists) ? artists : [],
            Array.isArray(videos) ? videos : [],
        ),
        images: collectStudioEmailMedia(
            Array.isArray(artists) ? artists : [],
            Array.isArray(videos) ? videos : [],
        ),
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
    let sourceSlots = null;
    if (source) {
        sourceSlots = resolveContentSource(
            source,
            caches.artists || [],
            caches.journals || [],
            caches.programs || [],
        );
    }
    const subject = String(editorDraft.subject ?? '').trim();
    const previewText = String(editorDraft.previewText ?? '').trim();
    const isBranded = Boolean(editorDraft.isBranded);
    const layoutSlots = editorDraft.layoutSlots || null;
    const bodyHtml = String(editorDraft.rawBodyHtml ?? '').trim();
    return {
        templateId,
        templateName: tpl?.name ?? '',
        defaultEyebrow: tpl?.defaultEyebrow ?? 'Program Update',
        userPrompt: String(userPrompt ?? '').trim().slice(0, 2000),
        task: 'Reformat existingDraft into layout JSON slots. The app applies the Fusion email shell (logo, hero, borders, footer) using styleGuide — return text slots only. Preserve factual names, dates, and URLs from sourceFacts when present.',
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
        },
        existingDraft: {
            subject,
            previewText,
            isBranded,
            layoutSlots,
            bodyHtml,
        },
        sourceFacts: sourceSlots
            ? {
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

    const str = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : '');

    const rawBody =
        str(llmSlots.bodyHtml) || str(editor.bodyHtml) || str(sourceSlots?.bodyHtml) || '';
    const normalizedBody = normalizeFusionEmailBodyHtml(rawBody);

    return {
        eyebrow:
            str(sourceSlots?.eyebrow) ||
            str(llmSlots.eyebrow) ||
            str(editor.eyebrow) ||
            tpl?.defaultEyebrow ||
            'Program Update',
        heroImageUrl: str(sourceSlots?.heroImageUrl) || str(editor.heroImageUrl) || '',
        heroPosterUrl: str(sourceSlots?.heroPosterUrl) || str(editor.heroPosterUrl) || '',
        heroAlt: str(sourceSlots?.heroAlt) || str(editor.heroAlt) || '',
        pillLabel: str(llmSlots.pillLabel) || str(sourceSlots?.pillLabel) || str(editor.pillLabel) || '',
        headlineHtml:
            str(sourceSlots?.headlineHtml) ||
            str(llmSlots.headlineHtml) ||
            str(editor.headlineHtml) ||
            '',
        bodyHtml: normalizedBody,
        footnote: str(llmSlots.footnote) || str(editor.footnote) || '',
        cta: {
            label:
                str(sourceSlots?.cta?.label) ||
                str(llmSlots.cta?.label) ||
                str(editor.cta?.label) ||
                '',
            href:
                str(sourceSlots?.cta?.href) ||
                str(llmSlots.cta?.href) ||
                str(editor.cta?.href) ||
                'https://www.fusionart.world',
        },
        subject:
            str(llmSlots.subject) ||
            str(sourceSlots?.subject) ||
            str(editor.subject) ||
            tpl?.defaultSubject ||
            '',
        previewText:
            str(llmSlots.previewText) ||
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
