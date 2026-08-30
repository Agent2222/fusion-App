/**
 * Branded Fusion email layout (General template design system).
 * All campaign templates should render through {@link fusionEmailLayout}.
 */

export const FUSION_EMAIL_LAYOUT_MARKER = '<!-- fusion-email-layout -->';

export const FUSION_EMAIL_LOGO_URL = 'https://fusionart.world/email/Fusion-X-logo-02.png';
export const FUSION_EMAIL_SIG_URL = 'https://fusionart.world/email/Fusion-Logo-Sig-1.png';

export const FUSION_EMAIL_FONT =
    "'momochidori-variable','Momochidori','Helvetica Neue',Helvetica,Arial,sans-serif";

/** Canonical Fusion email design tokens (General / Program Update base). */
export const FUSION_EMAIL_STYLES = {
    canvas: '#faf3f4',
    text: '#000000',
    ctaBg: '#c12525',
    /** Sage green — `--c4` / schedule download CTA. */
    ctaSecondaryBg: '#a2b792',
    ctaText: '#ffffff',
    pillBg: '#000000',
    pillText: '#ffffff',
    footerMuted: '#4a4a4a',
    bodyLead: 'font-size:16px;line-height:1.6;margin:0 0 16px;color:#000000',
    body: 'font-size:15px;line-height:1.6;margin:0 0 20px;color:#000000',
    bodyLast: 'font-size:15px;line-height:1.6;margin:0 0 28px;color:#000000',
    bodyQuote: 'font-size:15px;line-height:1.6;margin:0 0 20px;color:#000000;font-style:italic',
    bodyList: 'font-size:15px;line-height:1.6;margin:0 0 28px;padding-left:1.2em;color:#000000',
    link: 'color:#000000;text-decoration:none;border-bottom:1px solid #000000',
    footnote: 'font-size:12px;margin:26px 0 0;color:#000000',
};

const DEFAULT_HERO =
    'https://fusionart-bucket.s3.us-east-2.amazonaws.com/uploads/platform-assets/program_hero-1.jpg';

/**
 * @param {string} html
 * @returns {boolean}
 */
export function isFusionEmailLayout(html) {
    return String(html || '').includes(FUSION_EMAIL_LAYOUT_MARKER);
}

/**
 * @param {string} s
 * @returns {string}
 */
export function escapeHtmlForEmailLayout(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isEmailVideoUrl(url) {
    const u = String(url || '')
        .split(/[?#]/)[0]
        .toLowerCase();
    return /\.(mp4|webm|ogg|mov)$/i.test(u);
}

/**
 * @param {string} url
 * @param {string} [alt]
 * @param {string} [posterUrl]
 * @returns {string}
 */
export function emailHeroVideoBlock(url, alt = '', posterUrl = '') {
    const src = String(url || '').trim();
    if (!src || !isEmailVideoUrl(src)) return '';
    const safeAlt = escapeHtmlForEmailLayout(alt || 'Video');
    const poster = String(posterUrl || '').trim();
    const posterAttr =
        poster && !isEmailVideoUrl(poster) ? ` poster="${escapeHtmlForEmailLayout(poster)}"` : '';
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
<tbody><tr>
<td align="center">
<video src="${escapeHtmlForEmailLayout(src)}" width="552" controls playsinline${posterAttr} style="display:block;width:100%;max-width:552px;height:auto;border:0;margin:0 auto;" aria-label="${safeAlt}"></video>
</td>
</tr></tbody></table>`;
}

/**
 * @param {string} url
 * @param {string} [alt]
 * @param {string} [posterUrl]
 * @returns {string}
 */
export function emailInlineVideoBlock(url, alt = '', posterUrl = '') {
    const src = String(url || '').trim();
    if (!src || !isEmailVideoUrl(src)) return '';
    const safeAlt = escapeHtmlForEmailLayout(alt || 'Video');
    const poster = String(posterUrl || '').trim();
    const posterAttr =
        poster && !isEmailVideoUrl(poster) ? ` poster="${escapeHtmlForEmailLayout(poster)}"` : '';
    return `<p style="${FUSION_EMAIL_STYLES.bodyLead};text-align:center;"><video src="${escapeHtmlForEmailLayout(src)}" controls playsinline${posterAttr} style="display:inline-block;max-width:100%;height:auto;border:0" aria-label="${safeAlt}"></video></p>`;
}

/**
 * @param {string} url
 * @param {string} [alt]
 * @param {string} [posterUrl]
 * @returns {string}
 */
export function emailHeroMediaBlock(url, alt = '', posterUrl = '') {
    if (isEmailVideoUrl(url)) return emailHeroVideoBlock(url, alt, posterUrl);
    return emailHeroImageBlock(url, alt);
}

/**
 * @param {string} url
 * @param {string} [alt]
 * @param {string} [posterUrl]
 * @returns {string}
 */
export function emailInlineMediaBlock(url, alt = '', posterUrl = '') {
    if (isEmailVideoUrl(url)) return emailInlineVideoBlock(url, alt, posterUrl);
    return emailInlineImageBlock(url, alt);
}

/**
 * @param {string} url
 * @param {string} [alt]
 * @returns {string}
 */
export function emailHeroImageBlock(url, alt = '') {
    const src = String(url || '').trim();
    if (!src) return '';
    if (isEmailVideoUrl(src)) return emailHeroVideoBlock(src, alt);
    const safeAlt = escapeHtmlForEmailLayout(alt || 'Fusion');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
<tbody><tr>
<td align="center">
<img src="${src}" alt="${safeAlt}" width="552" style="display:block;width:100%;max-width:552px;height:auto;border:0;margin:0 auto;">
</td>
</tr></tbody></table>`;
}

/**
 * @param {string} url
 * @param {string} [alt]
 * @returns {string}
 */
export function emailInlineImageBlock(url, alt = '') {
    const src = String(url || '').trim();
    if (!src) return '';
    if (isEmailVideoUrl(src)) return emailInlineVideoBlock(src, alt);
    const safeAlt = escapeHtmlForEmailLayout(alt || '');
    return `<p style="${FUSION_EMAIL_STYLES.bodyLead};text-align:center;"><img src="${src}" alt="${safeAlt}" style="display:inline-block;max-width:100%;height:auto;border:0" /></p>`;
}

/**
 * @param {string} innerHtml
 * @param {'lead' | 'body' | 'last' | 'quote'} [variant]
 * @returns {string}
 */
export function fusionEmailParagraph(innerHtml, variant = 'body') {
    const style =
        variant === 'lead'
            ? FUSION_EMAIL_STYLES.bodyLead
            : variant === 'last'
              ? FUSION_EMAIL_STYLES.bodyLast
              : variant === 'quote'
                ? FUSION_EMAIL_STYLES.bodyQuote
                : FUSION_EMAIL_STYLES.body;
    return `<p style="${style}">${innerHtml}</p>`;
}

/**
 * Prominent checkout-code block for Radar / invite emails.
 * @param {{ code?: string, label?: string }} [opts]
 */
export function fusionEmailDiscountCodeBlock(opts = {}) {
    const code = escapeHtmlForEmailLayout(opts.code || '{{DISCOUNT_CODE}}');
    const label = escapeHtmlForEmailLayout(opts.label || '{{DISCOUNT_LABEL}}');
    return `<div style="margin:8px 0 28px;padding:22px 18px 20px;border:1px solid #000000;text-align:center;background:#ffffff">
<p style="margin:0 0 10px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#000000">Your invite code</p>
<p style="margin:0 0 12px;font-size:26px;letter-spacing:0.12em;font-weight:700;font-family:ui-monospace,Menlo,Consolas,monospace;color:#000000">${code}</p>
<p style="margin:0;font-size:14px;line-height:1.45;color:#000000">${label}</p>
</div>`;
}

/**
 * @param {string} href
 * @param {string} label
 * @returns {string}
 */
export function fusionEmailLink(href, label) {
    const safeHref = escapeHtmlForEmailLayout(href);
    const safeLabel = escapeHtmlForEmailLayout(label);
    return `<a href="${safeHref}" style="${FUSION_EMAIL_STYLES.link}">${safeLabel}</a>`;
}

/**
 * Normalize LLM or legacy body HTML to Fusion paragraph + link styles.
 * @param {string} html
 * @returns {string}
 */
export function normalizeFusionEmailBodyHtml(html) {
    const raw = String(html ?? '').trim();
    if (!raw) return '';

    const fixLinks = (chunk) =>
        chunk.replace(/<a\b([^>]*)>/gi, (_m, attrs) => {
            const hrefMatch = String(attrs).match(/\bhref=(["'])(.*?)\1/i);
            const href = hrefMatch ? hrefMatch[2] : 'https://www.fusionart.world';
            return `<a href="${href}" style="${FUSION_EMAIL_STYLES.link}">`;
        });

    const listBlocks = [];
    const listRegex = /<(ul|ol)[^>]*>[\s\S]*?<\/\1>/gi;
    let listMatch;
    while ((listMatch = listRegex.exec(raw)) !== null) {
        const tag = listMatch[1];
        listBlocks.push(
            fixLinks(
                listMatch[0].replace(
                    new RegExp(`<${tag}[^>]*>`, 'i'),
                    `<${tag} style="${FUSION_EMAIL_STYLES.bodyList}">`,
                ),
            ),
        );
    }

    const withoutLists = listBlocks.length
        ? raw.replace(/<(ul|ol)[^>]*>[\s\S]*?<\/\1>/gi, '').trim()
        : raw;
    const paragraphs = [];
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let match;
    while ((match = pRegex.exec(withoutLists)) !== null) {
        const inner = match[1].trim();
        if (inner) paragraphs.push(inner);
    }

    const listHtml = listBlocks.join('\n');

    if (!paragraphs.length) {
        const plain = withoutLists.replace(/<\/?p[^>]*>/gi, '').trim();
        if (!plain) return listHtml;
        return fixLinks(fusionEmailParagraph(plain, 'last')) + (listHtml ? `\n${listHtml}` : '');
    }

    const body = paragraphs
        .map((inner, i) => {
            const variant = i === 0 ? 'lead' : i === paragraphs.length - 1 ? 'last' : 'body';
            const isQuote = /^[“"']/.test(inner.replace(/<[^>]+>/g, '').trim());
            return fusionEmailParagraph(fixLinks(inner), isQuote && i === 0 ? 'quote' : variant);
        })
        .join('\n');

    return listHtml ? `${body}\n${listHtml}` : body;
}

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
 *   ctaSecondary?: { label?: string, href?: string },
 *   footnote?: string,
 * }} FusionEmailLayoutOpts
 */

/**
 * @param {FusionEmailLayoutOpts} [opts]
 * @returns {string}
 */
export function fusionEmailLayout(opts = {}) {
    const eyebrow = escapeHtmlForEmailLayout(opts.eyebrow || 'Program Update');
    const heroUrl = String(opts.heroImageUrl || '').trim();
    const heroPoster = String(opts.heroPosterUrl || '').trim();
    const heroAlt = escapeHtmlForEmailLayout(opts.heroAlt || '');
    const pill = String(opts.pillLabel || '').trim();
    const headline = String(opts.headlineHtml || '').trim();
    const body = String(opts.bodyHtml || '').trim();
    const footnote = String(opts.footnote || '').trim();
    const ctaButton = (cta, background) => {
        const label = String(cta?.label || '').trim();
        const href = String(cta?.href || 'https://www.fusionart.world').trim();
        if (!label) return '';
        const bg = String(background || FUSION_EMAIL_STYLES.ctaBg).trim() || FUSION_EMAIL_STYLES.ctaBg;
        return `<a href="${escapeHtmlForEmailLayout(href)}" style="display:inline-block;background:${escapeHtmlForEmailLayout(bg)};color:${FUSION_EMAIL_STYLES.ctaText};text-decoration:none;padding:14px 20px;font-size:12px;font-weight:800;letter-spacing:0.08em;">${escapeHtmlForEmailLayout(label)}</a>`;
    };
    const ctaPrimary = ctaButton(opts.cta, FUSION_EMAIL_STYLES.ctaBg);
    const ctaSecondary = ctaButton(opts.ctaSecondary, FUSION_EMAIL_STYLES.ctaSecondaryBg);
    const ctaBlock = [ctaPrimary, ctaSecondary]
        .filter(Boolean)
        .join('<div style="height:12px;line-height:12px;font-size:12px;">&nbsp;</div>');

    const pillBlock = pill
        ? `<div style="display:inline-block;background:${FUSION_EMAIL_STYLES.pillBg};color:${FUSION_EMAIL_STYLES.pillText};padding:6px 12px;font-size:11px;font-weight:700;margin-bottom:18px;letter-spacing:0.06em;">${escapeHtmlForEmailLayout(pill)}</div>`
        : '';

    const headlineBlock = headline
        ? `<h1 style="margin:0 0 20px;font-size:44px;line-height:0.95;font-weight:900;letter-spacing:-0.04em;color:${FUSION_EMAIL_STYLES.text};">${headline}</h1>`
        : '';

    const footnoteBlock = footnote
        ? `<p style="${FUSION_EMAIL_STYLES.footnote}">${footnote}</p>`
        : '';

    return `${FUSION_EMAIL_LAYOUT_MARKER}
<div style="font-family:${FUSION_EMAIL_FONT};max-width:600px;margin:0 auto;background:${FUSION_EMAIL_STYLES.canvas};color:${FUSION_EMAIL_STYLES.text};padding:40px 24px;line-height:1.5">
  <div style="padding-bottom:22px;margin-bottom:26px;display:flex;justify-content:space-between;align-items:center;">
    <img src="${FUSION_EMAIL_LOGO_URL}" alt="Fusion" width="160" style="display:block;height:auto;border:0">
    <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;color:${FUSION_EMAIL_STYLES.text};">${eyebrow}</div>
  </div>
  ${heroUrl ? emailHeroMediaBlock(heroUrl, heroAlt, heroPoster) : ''}
  <div style="border-top:1px solid #000000;border-bottom:1px solid #000000;padding:32px 0;">
    ${pillBlock}
    ${headlineBlock}
    ${body}
    ${ctaBlock}
    ${footnoteBlock}
  </div>
  <div style="margin-top:30px;padding-top:22px;">
    <p style="margin:0 0 12px;font-size:13px;color:${FUSION_EMAIL_STYLES.text};">— Fusion Team</p>
    <img src="${FUSION_EMAIL_SIG_URL}" alt="Fusion" width="110" style="display:block;margin-bottom:16px;border:0">
    <p style="margin:0 0 8px;font-size:13px;">
      <a href="https://www.fusionart.world" style="${FUSION_EMAIL_STYLES.link}">fusionart.world</a>
    </p>
    <p style="margin:0;font-size:12px;color:${FUSION_EMAIL_STYLES.footerMuted};letter-spacing:0.05em;">
      IG: @fusion_intl &nbsp;/&nbsp; TT: @fusion_intl &nbsp;/&nbsp; YT: @fusionartworld
    </p>
  </div>
</div>`;
}

/** Default General / Program Update starter slots. */
export function defaultProgramUpdateLayoutSlots() {
    return {
        eyebrow: 'Program Update',
        heroImageUrl: DEFAULT_HERO,
        heroAlt: 'Kaga City, Ishikawa',
        pillLabel: 'JAPAN ARTIST RESIDENCY',
        headlineHtml: 'Kaga City,<br>Ishikawa<br>Fall 2026',
        bodyHtml: [
            fusionEmailParagraph(
                'Applications are now open for the next FUSION Artist Residency in Japan.',
                'lead',
            ),
            fusionEmailParagraph(
                'A program shaped around place, process, and exchange, moving from the cultural energy of Japan to the quiet, craft-rich landscape of Kaga City.',
            ),
            fusionEmailParagraph(
                'Join an evolving platform connecting artists, curators, collectors, and galleries through residency, dialogue, and visibility.',
                'last',
            ),
        ].join('\n'),
        cta: { label: 'APPLY / LEARN MORE', href: 'https://fusionart.world/program/kaga-ishikawa' },
        footnote: 'Space is limited. Early applications encouraged.',
    };
}

/**
 * @param {FusionEmailLayoutOpts} slots
 * @returns {string}
 */
export function renderFusionEmailFromSlots(slots) {
    return fusionEmailLayout(slots);
}

/**
 * Parse branded Fusion email HTML back into layout slots (Quick Design reformat).
 * @param {string} html
 * @returns {FusionEmailLayoutOpts | null}
 */
export function extractFusionEmailSlots(html) {
    const raw = String(html ?? '').trim();
    if (!isFusionEmailLayout(raw)) return null;

    const unescape = (s) =>
        String(s ?? '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"');

    const eyebrow =
        raw.match(/text-transform:uppercase;font-weight:600;color:#000000;">([^<]*)</i)?.[1]?.trim() ||
        raw.match(/text-transform:uppercase;font-weight:600;">([^<]*)</i)?.[1]?.trim() ||
        '';

    const heroTable = raw.match(/<table role="presentation"[\s\S]*?<\/table>/i)?.[0] || '';
    const heroImg = heroTable.match(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/i);
    const heroImageUrl = heroImg?.[1] ? unescape(heroImg[1]) : '';
    const heroAlt = heroImg?.[2] ? unescape(heroImg[2]) : '';

    const pillLabel = raw.match(/letter-spacing:0\.06em;">([^<]+)<\/div>/i)?.[1]?.trim() || '';
    const headlineHtml = raw.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.trim() || '';

    const ctaRe =
        /<a href="([^"]+)" style="display:inline-block;background:([^;]+);color:#ffffff[^"]*"[^>]*>([^<]+)<\/a>/gi;
    /** @type {{ href: string, label: string }[]} */
    const ctas = [];
    let ctaMatch = ctaRe.exec(raw);
    while (ctaMatch) {
        ctas.push({ href: unescape(ctaMatch[1]), label: unescape(ctaMatch[3]).trim() });
        ctaMatch = ctaRe.exec(raw);
    }
    const cta = ctas[0];
    const ctaSecondary = ctas[1];

    const bordered = raw.match(
        /border-top:1px solid #000000;border-bottom:1px solid #000000;padding:32px 0;">([\s\S]*?)<\/div>\s*<div style="margin-top:30px/,
    );
    let bodyHtml = '';
    let footnote = '';
    if (bordered) {
        let inner = bordered[1];
        inner = inner.replace(
            /<div style="display:inline-block;background:[^"]*#000000[^"]*[\s\S]*?<\/div>\s*/i,
            '',
        );
        inner = inner.replace(/<h1[\s\S]*?<\/h1>\s*/i, '');
        inner = inner.replace(
            /<a href="[^"]*" style="display:inline-block;background:[^;]+;color:#ffffff[\s\S]*?<\/a>\s*/gi,
            '',
        );
        inner = inner.replace(
            /<div style="height:12px;line-height:12px;font-size:12px;">&nbsp;<\/div>\s*/gi,
            '',
        );
        const footnoteMatch = inner.match(
            /<p style="font-size:12px;margin:26px 0 0[^"]*">([\s\S]*?)<\/p>\s*$/i,
        );
        if (footnoteMatch) {
            footnote = footnoteMatch[1].replace(/<[^>]+>/g, '').trim();
            inner = inner.replace(footnoteMatch[0], '');
        }
        bodyHtml = inner.trim();
    }

    return {
        eyebrow: unescape(eyebrow),
        heroImageUrl,
        heroAlt: unescape(heroAlt),
        pillLabel: unescape(pillLabel),
        headlineHtml,
        bodyHtml: normalizeFusionEmailBodyHtml(bodyHtml) || bodyHtml,
        cta,
        ctaSecondary,
        footnote: unescape(footnote),
    };
}

/**
 * @param {string} html
 * @returns {{ isBranded: boolean, layoutSlots: FusionEmailLayoutOpts | null, rawBodyHtml: string }}
 */
export function extractEmailDraftForQuickDesign(html) {
    const branded = extractFusionEmailSlots(html);
    if (branded) {
        return { isBranded: true, layoutSlots: branded, rawBodyHtml: branded.bodyHtml || '' };
    }
    const stripped = String(html ?? '').trim();
    if (!stripped || stripped === '<p><br></p>' || stripped === '<p></p>') {
        return { isBranded: false, layoutSlots: null, rawBodyHtml: '' };
    }
    return {
        isBranded: false,
        layoutSlots: null,
        rawBodyHtml: normalizeFusionEmailBodyHtml(stripped) || stripped,
    };
}
