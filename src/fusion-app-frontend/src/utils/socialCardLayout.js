/**
 * Branded social card layouts for Studio → Email → Social.
 * Uses Fusion email design tokens; renders fixed-ratio DOM (not email tables).
 */
import {
    FUSION_EMAIL_FONT,
    FUSION_EMAIL_LOGO_URL,
    FUSION_EMAIL_STYLES,
    escapeHtmlForEmailLayout,
    isEmailVideoUrl,
} from './emailFusionLayout.js';

/** @typedef {'1:1' | '4:5'} SocialRatio */
/** @typedef {'spotlight' | 'editorial' | 'portrait'} SocialLayoutPreset */

/**
 * @typedef {{
 *   x: number,
 *   y: number,
 *   zoom: number,
 * }} SocialCrop
 */

/**
 * @typedef {{
 *   eyebrow?: string,
 *   heroUrl?: string,
 *   heroAlt?: string,
 *   pillLabel?: string,
 *   headlineHtml?: string,
 *   bodyText?: string,
 *   ctaLabel?: string,
 *   artistName?: string,
 *   crop?: SocialCrop,
 *   sourceType?: string,
 *   sourceId?: string,
 * }} SocialCardSlots
 */

export const SOCIAL_RATIO_PIXELS = {
    '1:1': { width: 1080, height: 1080 },
    '4:5': { width: 1080, height: 1350 },
};

export const DEFAULT_SOCIAL_CROP = { x: 50, y: 50, zoom: 1 };

/** Always appended to generated social captions. */
export const SOCIAL_CAPTION_HASHTAGS =
    '#artistresidency #japanartistresidency #japan #art #fusionartworld';

export const DEFAULT_SOCIAL_HERO =
    'https://fusionart-bucket.s3.us-east-2.amazonaws.com/uploads/platform-assets/program_hero-1.jpg';

/**
 * @param {SocialRatio} ratio
 * @returns {{ width: number, height: number }}
 */
export function socialRatioPixels(ratio) {
    return SOCIAL_RATIO_PIXELS[ratio] || SOCIAL_RATIO_PIXELS['1:1'];
}

/**
 * @param {Partial<SocialCrop> | null | undefined} crop
 * @returns {SocialCrop}
 */
export function normalizeSocialCrop(crop) {
    const x = Number(crop?.x);
    const y = Number(crop?.y);
    const zoom = Number(crop?.zoom);
    return {
        x: Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : 50,
        y: Number.isFinite(y) ? Math.max(0, Math.min(100, y)) : 50,
        zoom: Number.isFinite(zoom) ? Math.max(1, Math.min(2.5, zoom)) : 1,
    };
}

/**
 * Strip tags and collapse whitespace for short social body copy.
 * @param {string} html
 * @param {number} [maxLen]
 * @returns {string}
 */
export function plainTextFromHtml(html, maxLen = 160) {
    const text = String(html || '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/p>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
    if (text.length <= maxLen) return text;
    return `${text.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
}

/**
 * Prefer still image URL for social cards (skip video file URLs).
 * @param {string} url
 * @param {string} [posterUrl]
 * @returns {string}
 */
function stillHeroUrl(url, posterUrl = '') {
    const u = String(url || '').trim();
    const poster = String(posterUrl || '').trim();
    if (u && !isEmailVideoUrl(u)) return u;
    if (poster && !isEmailVideoUrl(poster)) return poster;
    return '';
}

/**
 * Ensure caption text always ends with required hashtags (deduped).
 * @param {string} caption
 * @returns {string}
 */
export function ensureSocialCaptionHashtags(caption) {
    const base = String(caption || '')
        .replace(/\s+/g, ' ')
        .trim();
    const tags = SOCIAL_CAPTION_HASHTAGS.split(/\s+/).filter(Boolean);
    let out = base;
    for (const tag of tags) {
        const re = new RegExp(tag.replace('#', '\\#'), 'i');
        if (!re.test(out)) out = `${out}${out ? ' ' : ''}${tag}`;
    }
    return out.trim();
}

/**
 * Strip known hashtags before translating caption body.
 * @param {string} caption
 * @returns {{ body: string, hadTags: boolean }}
 */
export function stripSocialCaptionHashtags(caption) {
    let body = String(caption || '').trim();
    const tags = SOCIAL_CAPTION_HASHTAGS.split(/\s+/).filter(Boolean);
    let hadTags = false;
    for (const tag of tags) {
        const re = new RegExp(`\\s*${tag.replace('#', '\\#')}\\b`, 'gi');
        if (re.test(body)) hadTags = true;
        body = body.replace(re, '');
    }
    body = body.replace(/\s+/g, ' ').trim();
    return { body, hadTags };
}

/**
 * Convert plain lines to headlineHtml (`<br>` separated).
 * @param {string} text
 * @returns {string}
 */
export function headlineHtmlFromPlain(text) {
    return String(text || '')
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .join('<br>');
}

/**
 * Map email layout slots → social card slots.
 * @param {object | null | undefined} emailSlots
 * @param {{ sourceType?: string, sourceId?: string, crop?: SocialCrop }} [extra]
 * @returns {SocialCardSlots}
 */
export function slotsFromEmailSource(emailSlots, extra = {}) {
    const s = /** @type {Record<string, any>} */ (emailSlots || {});
    const heroUrl = stillHeroUrl(s.heroImageUrl, s.heroPosterUrl);
    const headlineHtml = String(s.headlineHtml || '').trim();
    const isArtist = String(extra.sourceType || '') === 'artist';
    const artistName = isArtist
        ? plainTextFromHtml(headlineHtml.replace(/<br\s*\/?>/gi, ' '), 80)
        : '';
    // Prefer short quote / preview for social; keep portrait lines tight.
    const preview = String(s.previewText || '').trim();
    const fromBody = plainTextFromHtml(s.bodyHtml || '', isArtist ? 110 : 140);
    const bodyText = (preview && preview.length <= 140 ? preview : fromBody).slice(
        0,
        isArtist ? 110 : 140,
    );
    return {
        eyebrow: String(s.eyebrow || '').trim() || 'Fusion',
        heroUrl: heroUrl || DEFAULT_SOCIAL_HERO,
        heroAlt: String(s.heroAlt || '').trim() || artistName || 'Fusion',
        pillLabel: String(s.pillLabel || '').trim(),
        headlineHtml: headlineHtml || 'Fusion',
        bodyText,
        ctaLabel: '',
        artistName,
        crop: normalizeSocialCrop(extra.crop),
        sourceType: String(extra.sourceType || '').trim(),
        sourceId: String(extra.sourceId || '').trim(),
    };
}

/**
 * Default layout preset for a content source type.
 * @param {string} sourceType
 * @returns {SocialLayoutPreset}
 */
export function defaultLayoutForSourceType(sourceType) {
    if (sourceType === 'artist') return 'portrait';
    if (sourceType === 'journal' || sourceType === 'program') return 'editorial';
    if (sourceType === 'website' || sourceType === 'video') return 'spotlight';
    return 'spotlight';
}

/**
 * @param {SocialCardSlots} slots
 * @returns {string}
 */
function cropStyle(slots) {
    const crop = normalizeSocialCrop(slots.crop);
    const scale = crop.zoom;
    return `position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${crop.x}% ${crop.y}%;transform:scale(${scale});transform-origin:${crop.x}% ${crop.y}%;`;
}

/** Red “story” accent with pagination dots (not a tappable CTA). */
function socialDotsBlock() {
    return `<div class="studio-ec-social-card__dots" aria-hidden="true"><span class="is-on"></span><span></span><span></span></div>`;
}

/**
 * @param {SocialCardSlots} slots
 * @param {{ ratio: SocialRatio, layout: SocialLayoutPreset }} opts
 * @returns {string}
 */
export function renderSocialCardHtml(slots, opts) {
    const ratio = opts.ratio === '4:5' ? '4:5' : '1:1';
    const layout = opts.layout || 'spotlight';
    const dims = socialRatioPixels(ratio);
    const eyebrow = escapeHtmlForEmailLayout(slots.eyebrow || 'Fusion');
    const pill = String(slots.pillLabel || '').trim();
    const headline = String(slots.headlineHtml || 'Fusion').trim();
    const body = escapeHtmlForEmailLayout(slots.bodyText || '');
    const heroUrl = String(slots.heroUrl || '').trim() || DEFAULT_SOCIAL_HERO;
    const heroAlt = escapeHtmlForEmailLayout(slots.heroAlt || 'Fusion');
    const artistName = escapeHtmlForEmailLayout(
        slots.artistName || plainTextFromHtml(headline.replace(/<br\s*\/?>/gi, ' '), 80),
    );
    const heroStyle = cropStyle(slots);
    // Do not set crossorigin on preview imgs — many CDN/S3 URLs lack CORS and fail to paint.
    const heroImg = `<img class="studio-ec-social-card__hero-img" src="${escapeHtmlForEmailLayout(heroUrl)}" alt="${heroAlt}" draggable="false" data-social-hero="1" style="${heroStyle}" />`;
    const logoImg = `<img class="studio-ec-social-card__logo" src="${FUSION_EMAIL_LOGO_URL}" alt="Fusion" draggable="false" />`;

    const pillBlock = pill
        ? `<div class="studio-ec-social-card__pill">${escapeHtmlForEmailLayout(pill)}</div>`
        : '';
    const dotsBlock = socialDotsBlock();
    const bodyBlock = body ? `<p class="studio-ec-social-card__body">${body}</p>` : '';

    if (layout === 'portrait') {
        const shortBody = escapeHtmlForEmailLayout(
            plainTextFromHtml(slots.bodyText || '', 110),
        );
        const portraitBody = shortBody
            ? `<p class="studio-ec-social-card__body">${shortBody}</p>`
            : '';
        return `<div class="studio-ec-social-card studio-ec-social-card--portrait" data-ratio="${ratio}" data-layout="portrait" style="width:${dims.width}px;height:${dims.height}px;font-family:${FUSION_EMAIL_FONT};background:${FUSION_EMAIL_STYLES.canvas};color:${FUSION_EMAIL_STYLES.text};">
  <div class="studio-ec-social-card__top">
    ${logoImg}
    <span class="studio-ec-social-card__eyebrow">${eyebrow}</span>
  </div>
  <div class="studio-ec-social-card__portrait-frame" data-social-crop-target>
    ${heroImg}
  </div>
  <div class="studio-ec-social-card__portrait-copy">
    ${pillBlock}
    <h1 class="studio-ec-social-card__name">${artistName}</h1>
    ${portraitBody}
    ${dotsBlock}
  </div>
</div>`;
    }

    if (layout === 'editorial') {
        return `<div class="studio-ec-social-card studio-ec-social-card--editorial" data-ratio="${ratio}" data-layout="editorial" style="width:${dims.width}px;height:${dims.height}px;font-family:${FUSION_EMAIL_FONT};background:${FUSION_EMAIL_STYLES.canvas};color:${FUSION_EMAIL_STYLES.text};">
  <div class="studio-ec-social-card__top">
    ${logoImg}
    <span class="studio-ec-social-card__eyebrow">${eyebrow}</span>
  </div>
  <div class="studio-ec-social-card__band" data-social-crop-target>
    ${heroImg}
  </div>
  <div class="studio-ec-social-card__editorial-copy">
    ${pillBlock}
    <h1 class="studio-ec-social-card__headline">${headline}</h1>
    ${bodyBlock}
    ${dotsBlock}
  </div>
</div>`;
    }

    // spotlight — full-bleed hero + bottom gradient type
    return `<div class="studio-ec-social-card studio-ec-social-card--spotlight" data-ratio="${ratio}" data-layout="spotlight" style="width:${dims.width}px;height:${dims.height}px;font-family:${FUSION_EMAIL_FONT};background:${FUSION_EMAIL_STYLES.canvas};color:${FUSION_EMAIL_STYLES.text};">
  <div class="studio-ec-social-card__bleed" data-social-crop-target>
    ${heroImg}
    <div class="studio-ec-social-card__veil" aria-hidden="true"></div>
  </div>
  <div class="studio-ec-social-card__spotlight-ui">
    <div class="studio-ec-social-card__top studio-ec-social-card__top--on-media">
      <img class="studio-ec-social-card__logo studio-ec-social-card__logo--light" src="${FUSION_EMAIL_LOGO_URL}" alt="Fusion" draggable="false" />
      <span class="studio-ec-social-card__eyebrow studio-ec-social-card__eyebrow--light">${eyebrow}</span>
    </div>
    <div class="studio-ec-social-card__spotlight-copy">
      ${pillBlock}
      <h1 class="studio-ec-social-card__headline studio-ec-social-card__headline--light">${headline}</h1>
      ${body ? `<p class="studio-ec-social-card__body studio-ec-social-card__body--light">${body}</p>` : ''}
      ${dotsBlock}
    </div>
  </div>
</div>`;
}

/**
 * Apply crop CSS to the live hero image inside a stage root.
 * @param {HTMLElement} stageRoot
 * @param {SocialCrop} crop
 */
export function applySocialCropToStage(stageRoot, crop) {
    const c = normalizeSocialCrop(crop);
    const img = stageRoot.querySelector('.studio-ec-social-card__hero-img');
    if (!(img instanceof HTMLImageElement)) return;
    img.style.position = 'absolute';
    img.style.inset = '0';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.objectPosition = `${c.x}% ${c.y}%`;
    img.style.transform = `scale(${c.zoom})`;
    img.style.transformOrigin = `${c.x}% ${c.y}%`;
}

/**
 * Build a download filename.
 * @param {SocialCardSlots} slots
 * @param {SocialRatio} ratio
 * @returns {string}
 */
export function socialExportFilename(slots, ratio) {
    const type = String(slots.sourceType || 'general').replace(/[^\w-]+/g, '') || 'general';
    const id = String(slots.sourceId || 'card').replace(/[^\w-]+/g, '').slice(0, 40) || 'card';
    const r = ratio === '4:5' ? '4x5' : '1x1';
    return `fusion-social-${type}-${id}-${r}.png`;
}
