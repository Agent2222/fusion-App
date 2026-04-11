import { presignUpload } from './integrationApi.js';

/**
 * Presign + PUT; sets input value to public URL on success.
 * @param {File} file
 * @param {HTMLInputElement | null} [inputEl]
 * @returns {Promise<string>}
 */
export async function uploadBlobToS3(file, inputEl) {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'file';
    const key = `studio/${Date.now()}-${safe}`;
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
