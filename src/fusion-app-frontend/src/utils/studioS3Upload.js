import { presignUpload } from './integrationApi.js';
import { toCloudFrontAssetUrl } from './assetDistribution.js';

/**
 * Logical prefixes for S3 object keys (after server `S3_KEY_PREFIX`, usually `uploads/`).
 * Keys look like `{area}/{shortId}-{safeBase}` — no epoch timestamps; `shortId` is 8 hex chars.
 * @type {readonly string[]}
 */
export const S3_UPLOAD_AREAS = [
    'studio/content',
    'studio/artists',
    'studio/programs',
    'studio/editions',
    'studio/journal',
    'studio/sound',
    'studio/community',
    'studio/email',
    'studio/misc',
    'account/profile',
    'services/test',
];

const DEFAULT_UPLOAD_AREA = 'studio/misc';
const COMMUNITY_MEDIA_ROOT_PREFIX = 'fusionMedia/uploads/';

/**
 * @param {unknown} area
 * @returns {string}
 */
function normalizeUploadArea(area) {
    const s = String(area ?? '')
        .trim()
        .replace(/^\/+/g, '')
        .replace(/\/+$/g, '')
        .replace(/\/+/g, '/');
    if (!s) return DEFAULT_UPLOAD_AREA;
    return S3_UPLOAD_AREAS.includes(s) ? s : DEFAULT_UPLOAD_AREA;
}

function shortId8() {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

/**
 * @param {string} s
 * @returns {string}
 */
function slugPathPart(s) {
    return String(s || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._/-]+/g, '-')
        .replace(/\/+/g, '/')
        .replace(/^\/+|\/+$/g, '')
        .replace(/-+/g, '-');
}

/**
 * @param {File} file
 * @returns {string}
 */
function fileExtFromUpload(file) {
    const name = String(file?.name || '').trim();
    const dot = name.lastIndexOf('.');
    if (dot > 0 && dot < name.length - 1) {
        return `.${slugPathPart(name.slice(dot + 1)).replace(/\./g, '') || 'bin'}`;
    }
    return '.bin';
}

/**
 * Build a deterministic key for overwrite semantics.
 * @param {string} area
 * @param {File} file
 * @param {{ entityType?: string, entityId?: string, fieldKey?: string }} options
 * @returns {string | null}
 */
function deterministicKey(area, file, options) {
    const entityType = slugPathPart(options?.entityType || '');
    const entityId = slugPathPart(options?.entityId || '');
    const fieldKey = slugPathPart(options?.fieldKey || '');
    if (!entityType || !entityId || !fieldKey) return null;
    const ext = fileExtFromUpload(file);
    return `${area}/${entityType}/${entityId}/${fieldKey}${ext}`;
}

/**
 * Sanitize filename and cap stem length (extension preserved).
 * @param {string} fileName
 * @param {number} [maxStem]
 */
function truncatedSafeBase(fileName, maxStem = 40) {
    const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'file';
    const dot = safe.lastIndexOf('.');
    if (dot > 0 && dot < safe.length - 1) {
        const stem = safe.slice(0, dot);
        const ext = safe.slice(dot);
        return `${stem.slice(0, maxStem)}${ext}`;
    }
    return safe.slice(0, maxStem + 16);
}

/**
 * Presign + PUT; sets input value to public URL on success.
 *
 * Object key: `{area}/{shortId}-{safeBase}` (integration API prepends `uploads/` or `S3_KEY_PREFIX` when needed).
 *
 * @param {File} file
 * @param {HTMLInputElement | null} [inputEl]
 * @param {{ area?: string, entityType?: string, entityId?: string, fieldKey?: string }} [options]
 * `area` should be one of {@link S3_UPLOAD_AREAS}; unknown values fall back to `studio/misc`.
 * When `entityType`, `entityId`, and `fieldKey` are provided, upload uses a deterministic key and overwrites existing asset.
 * @returns {Promise<string>}
 */
export async function uploadBlobToS3(file, inputEl, options = {}) {
    const area = normalizeUploadArea(options.area);
    const deterministic = deterministicKey(area, file, options);
    const key = deterministic || `${area}/${shortId8()}-${truncatedSafeBase(file.name)}`;
    const ct = file.type || 'application/octet-stream';
    const rootPrefix = area === 'studio/community' ? COMMUNITY_MEDIA_ROOT_PREFIX : undefined;
    const { putUrl, publicUrl } = await presignUpload(key, ct, { rootPrefix });
    const res = await fetch(putUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': ct },
    });
    if (!res.ok) {
        throw new Error(`S3 upload failed: HTTP ${res.status}`);
    }
    const distributedUrl = toCloudFrontAssetUrl(publicUrl);
    if (inputEl) inputEl.value = distributedUrl;
    return distributedUrl;
}
