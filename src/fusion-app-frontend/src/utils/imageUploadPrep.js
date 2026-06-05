/**
 * Client-side image prep before S3 upload — MIME normalization and size compression.
 */

/** Default max bytes (1 MB) — matches member profile limit. */
export const DEFAULT_IMAGE_UPLOAD_MAX_BYTES = 1 * 1024 * 1024;

/** Max longest edge when compressing. */
const COMPRESS_MAX_DIMENSION = 2400;

/**
 * @param {string} name
 * @returns {string}
 */
function mimeFromFileName(name) {
    const lower = String(name || '').toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
    return '';
}

/**
 * @param {File} file
 * @returns {string}
 */
export function normalizeImageMime(file) {
    const t = String(file?.type || '').trim();
    if (t.startsWith('image/')) return t;
    return mimeFromFileName(file?.name) || 'application/octet-stream';
}

/**
 * @param {string} mime
 * @returns {boolean}
 */
export function isHeicMime(mime) {
    return /heic|heif/i.test(mime) || /\.heic$|\.heif$/i.test(mime);
}

/**
 * @param {Blob} blob
 * @param {string} name
 * @param {string} type
 * @returns {File}
 */
function blobToFile(blob, name, type) {
    try {
        return new File([blob], name, { type });
    } catch {
        const f = /** @type {File} */ (blob);
        f.name = name;
        return f;
    }
}

/**
 * @param {File} file
 * @param {number} maxDimension
 * @param {number} quality
 * @returns {Promise<File | null>}
 */
function compressImageFile(file, maxDimension, quality) {
    if (typeof document === 'undefined') return Promise.resolve(null);
    const mime = normalizeImageMime(file);
    if (isHeicMime(mime)) return Promise.resolve(null);

    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            const scale = Math.min(1, maxDimension / Math.max(width, height, 1));
            width = Math.max(1, Math.round(width * scale));
            height = Math.max(1, Math.round(height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(null);
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        resolve(null);
                        return;
                    }
                    const base = file.name.replace(/\.[^.]+$/, '') || 'upload';
                    resolve(blobToFile(blob, `${base}.jpg`, 'image/jpeg'));
                },
                'image/jpeg',
                quality,
            );
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
        };
        img.src = url;
    });
}

/**
 * Resize/compress image files over `maxBytes`. Returns original file when already small enough.
 * @param {File} file
 * @param {number} [maxBytes]
 * @returns {Promise<{ file: File, compressed: boolean, heicWarning?: boolean }>}
 */
export async function prepareImageFileForUpload(file, maxBytes = DEFAULT_IMAGE_UPLOAD_MAX_BYTES) {
    const mime = normalizeImageMime(file);
    if (isHeicMime(mime)) {
        if (file.size <= maxBytes) {
            return { file, compressed: false, heicWarning: true };
        }
        throw new Error(
            'HEIC/HEIF photos must be converted to JPEG or WebP before upload. Export from Photos or use a converter, then try again.',
        );
    }
    if (file.size <= maxBytes) {
        return { file, compressed: false };
    }

    const qualities = [0.88, 0.75, 0.62, 0.5];
    /** @type {File | null} */
    let best = null;
    for (const q of qualities) {
        const next = await compressImageFile(file, COMPRESS_MAX_DIMENSION, q);
        if (!next) break;
        best = next;
        if (next.size <= maxBytes) {
            return { file: next, compressed: true };
        }
    }

    if (best && best.size < file.size) {
        if (best.size <= maxBytes) return { file: best, compressed: true };
        const kb = Math.round(best.size / 1024);
        throw new Error(
            `Image is still too large after compression (${kb} KB). Use a smaller photo or JPEG/WebP under ${Math.round(maxBytes / 1024)} KB.`,
        );
    }

    const kb = Math.round(file.size / 1024);
    throw new Error(
        `Image is too large (${kb} KB). Each image must be ${Math.round(maxBytes / 1024)} KB or smaller.`,
    );
}
