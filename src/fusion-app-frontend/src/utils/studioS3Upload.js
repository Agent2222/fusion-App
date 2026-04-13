import { presignUpload } from './integrationApi.js';

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
    'studio/misc',
    'account/profile',
    'services/test',
];

const DEFAULT_UPLOAD_AREA = 'studio/misc';

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
 * @param {{ area?: string }} [options] `area` should be one of {@link S3_UPLOAD_AREAS}; unknown values fall back to `studio/misc`.
 * @returns {Promise<string>}
 */
export async function uploadBlobToS3(file, inputEl, options = {}) {
    const area = normalizeUploadArea(options.area);
    const shortId = shortId8();
    const safeBase = truncatedSafeBase(file.name);
    const key = `${area}/${shortId}-${safeBase}`;
    const ct = file.type || 'application/octet-stream';
    const { putUrl, publicUrl } = await presignUpload(key, ct);
    const res = await fetch(putUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': ct },
    });
    if (!res.ok) {
        throw new Error(`S3 upload failed: HTTP ${res.status}`);
    }
    if (inputEl) inputEl.value = publicUrl;
    return publicUrl;
}
