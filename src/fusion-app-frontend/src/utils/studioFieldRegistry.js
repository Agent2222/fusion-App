/**
 * Studio Content editor: classify flattened JSON paths so UI shows Route vs Media vs External vs Audio.
 * @see docs/STUDIO_FIELD_REGISTRY.md
 */

/** @typedef {'plainText' | 'route' | 'assetUrl' | 'externalUrl' | 'audioUrl'} StudioFieldKind */

/**
 * Legacy heuristic (narrower than original panels.js): true → treat as owned-media URL string.
 * Does NOT treat bare `link` as asset — registry handles `link` per slug.
 * @param {string} path
 * @returns {boolean}
 */
export function legacyHeuristicAssetPath(path) {
    const lower = path.toLowerCase();
    if (lower.includes('imagesrc')) return true;
    if (/\b(audio|sound|music|track|mp3|wav|ogg|m4a)\b/.test(lower) && /\b(src|url)\b/.test(lower) && !/\bhref\b/.test(lower)) {
        return true;
    }
    const last = (path.split('.').pop() || '').toLowerCase();
    const assetLast = new Set([
        'imagesrc',
        'imageurl',
        'imagesrcurl',
        'src',
        'videosrc',
        'poster',
        'thumbnailurl',
        'herourl',
        'coverurl',
        'bannerurl',
        'backgroundimage',
        'ogimage',
    ]);
    if (assetLast.has(last)) return true;
    if (last === 'image' && !lower.includes('subimage')) return true;
    if (last === 'url' && /image|hero|cover|banner|video|thumb|media|photo|logo|avatar|audio|sound/.test(lower)) {
        return true;
    }
    if (last === 'href' && /image|asset|media|photo/.test(lower)) return true;
    if (/\.gallery\.\d+$/.test(path)) return true;
    if (lower.includes('.gallery.') && /^\d+$/.test(last)) return true;
    if (lower.includes('introgallery') && (last === 'src' || /^\d+$/.test(last))) return true;
    if (lower.includes('masterportfolio') && last === 'src') return true;
    if (lower.includes('currentwork') && last === 'image') return true;
    if (lower.includes('offeringcards') && lower.includes('gallery') && /^\d+$/.test(last)) return true;
    return false;
}

/**
 * @param {string} slug Content page slug (e.g. journals-block)
 * @param {string} path Dotted path from flattenStringFields
 * @returns {StudioFieldKind}
 */
export function getFieldKind(slug, path) {
    const lower = path.toLowerCase();
    const segments = path.split('.');
    const last = segments[segments.length - 1] || '';
    const lastLower = last.toLowerCase();

    if (slug === 'audio') {
        if (lastLower === 'link') return 'audioUrl';
        return 'plainText';
    }

    if (lastLower === 'routelink' || lastLower === 'ctalink' || lastLower === 'attributionhref') {
        return 'route';
    }

    if (lastLower === 'href') {
        if (slug === 'editions-feed') return 'route';
        if (slug === 'join-network-flow') return 'route';
        if (slug === 'quote-row') return 'route';
        if (lower.includes('confirmation') && lower.includes('links')) return 'route';
        if (legacyHeuristicAssetPath(path)) return 'assetUrl';
        return 'route';
    }

    if (lastLower === 'link') {
        if (slug === 'journals-block' && /^journals\.\d+\.link$/.test(path)) return 'route';
        if (slug === 'journals-block' && lower.includes('journals.') && lower.endsWith('.link')) return 'route';
        if (slug === 'objects-highlight') return 'externalUrl';
        if (slug === 'context' && /ecosystempartnerscards|extendednetwork/i.test(path)) return 'externalUrl';
        if (slug === 'audio') return 'audioUrl';
        return legacyHeuristicAssetPath(path) ? 'assetUrl' : 'plainText';
    }

    if (slug === 'gallery-access-cta' && lastLower === 'ctalink') return 'route';

    if (lastLower === 'url' && lower.includes('links') && /\.links\.\d+\.url$/.test(lower)) {
        return 'externalUrl';
    }
    if (lastLower === 'url' && /locales\.(en|ja)\.links/.test(lower)) {
        return 'externalUrl';
    }

    if (lastLower === 'imagesrc' || (lastLower === 'image' && !lower.includes('subimage'))) {
        return 'assetUrl';
    }

    if (lastLower === 'subimage') return 'assetUrl';

    if (legacyHeuristicAssetPath(path)) return 'assetUrl';

    return 'plainText';
}

/**
 * @param {StudioFieldKind} kind
 */
export function shouldShowUploadButton(kind) {
    return kind === 'assetUrl' || kind === 'audioUrl' || kind === 'externalUrl';
}

/**
 * @param {string} path
 * @param {StudioFieldKind} kind
 */
export function getStudioUploadAccept(path, kind) {
    const lower = path.toLowerCase();
    const audioish =
        kind === 'audioUrl' ||
        /\b(audio|sound|music|track|mp3|wav|ogg|m4a)\b/.test(lower) ||
        /\.(mp3|wav|ogg|m4a)/.test(lower);
    if (audioish) return 'image/*,video/*,audio/*,.mp3,.wav,.ogg,.m4a,.pdf';
    return 'image/*,video/*,.pdf';
}

/**
 * @param {StudioFieldKind} kind
 */
export function getFieldKindBadgeLabel(kind) {
    switch (kind) {
        case 'route':
            return 'Route';
        case 'assetUrl':
            return 'Media';
        case 'externalUrl':
            return 'Link';
        case 'audioUrl':
            return 'Audio';
        default:
            return 'Text';
    }
}

/**
 * Short helper line under the control.
 * @param {StudioFieldKind} kind
 */
export function getFieldKindHelperText(kind) {
    switch (kind) {
        case 'route':
            return 'In-app path (starts with /). No file upload.';
        case 'assetUrl':
            return 'Paste a URL or upload to S3 (Services tab must be configured).';
        case 'externalUrl':
            return 'External URL. Open to verify; optional upload to your CDN.';
        case 'audioUrl':
            return 'Audio file URL or upload; save to persist.';
        default:
            return '';
    }
}
