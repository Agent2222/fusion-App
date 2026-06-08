/**
 * Video uploads with XHR progress + optional R2/S3 multipart.
 */
import { toCloudFrontAssetUrl } from './assetDistribution.js';
import {
    MULTIPART_THRESHOLD_BYTES,
    abortPrivateVideoMultipartUpload,
    abortPublicMultipartUpload,
    completePrivateVideoMultipartUpload,
    completePublicMultipartUpload,
    initPrivateVideoMultipartUpload,
    initPublicMultipartUpload,
    presignPrivateVideoMultipartPart,
    presignPrivateVideoUpload,
    presignPublicMultipartPart,
    presignUpload,
} from './integrationApi.js';
import { openUploadProgressModal } from '../components/studio/uploadProgressModal.js';
import { assertIntegrationUploadReady } from './studioS3Upload.js';

const COMMUNITY_MEDIA_ROOT_PREFIX = 'fusionMedia/uploads/';
const PART_UPLOAD_MAX_ATTEMPTS = 4;

/**
 * @param {number} bytes
 */
function formatUploadBytes(bytes) {
    const n = Math.max(0, Number(bytes) || 0);
    if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    if (n >= 1024) return `${Math.round(n / 1024)} KB`;
    return `${n} B`;
}

/**
 * @param {File | Blob} file
 */
function normalizeVideoContentType(file) {
    const t = String(file?.type || '').trim();
    if (t && /^video\//i.test(t)) return t;
    const name = String(file instanceof File ? file.name : '').toLowerCase();
    if (name.endsWith('.mp4')) return 'video/mp4';
    if (name.endsWith('.webm')) return 'video/webm';
    if (name.endsWith('.mov')) return 'video/quicktime';
    return 'application/octet-stream';
}

/**
 * @param {number} status
 * @param {{ partNumber?: number, partCount?: number, bytesUploaded?: number }} [ctx]
 */
function uploadFailureMessage(status, ctx = {}) {
    const partLabel =
        ctx.partNumber != null
            ? `part ${ctx.partNumber}${ctx.partCount ? ` of ${ctx.partCount}` : ''}`
            : '';
    const progressLabel =
        ctx.bytesUploaded != null && ctx.bytesUploaded > 0
            ? ` (~${formatUploadBytes(ctx.bytesUploaded)} uploaded)`
            : '';

    if (status === 0) {
        if (ctx.partNumber != null && ctx.partNumber > 1) {
            return (
                `Connection dropped while uploading ${partLabel}${progressLabel}. ` +
                'Large uploads often fail here due to network timeouts — retry the upload on a stable connection. ' +
                'If it always fails at the same spot, confirm bucket CORS includes PUT, AllowedHeaders "*", and ExposeHeaders "ETag".'
            );
        }
        return (
            'Upload blocked by the browser (usually bucket CORS or CSP). ' +
            'In Cloudflare R2 or AWS S3, add your exact Studio origin to bucket CORS with PUT allowed, ' +
            'AllowedHeaders ["*"], and ExposeHeaders ["ETag"]. See docs/DEPLOY_RENDER_AND_ICP.md → Object storage CORS.'
        );
    }
    if (status === 403) {
        return `Upload rejected (HTTP 403)${partLabel ? ` on ${partLabel}` : ''}. Check storage credentials and presigned URL expiry.`;
    }
    return `Upload failed: HTTP ${status}${partLabel ? ` (${partLabel})` : ''}`;
}

/**
 * @param {number} ms
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} putUrl
 * @param {Blob} body
 * @param {{ contentType?: string, signal?: AbortSignal, onProgress?: (loaded: number, total: number) => void, partNumber?: number, partCount?: number, bytesUploaded?: number }} [opts]
 */
function xhrPut(putUrl, body, opts = {}) {
    const { contentType, signal, onProgress, partNumber, partCount, bytesUploaded } = opts;
    const errCtx = { partNumber, partCount, bytesUploaded };
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', putUrl, true);
        xhr.timeout = 0;
        if (contentType) {
            xhr.setRequestHeader('Content-Type', contentType);
        }
        if (signal) {
            if (signal.aborted) {
                reject(new DOMException('Aborted', 'AbortError'));
                return;
            }
            signal.addEventListener('abort', () => {
                xhr.abort();
                reject(new DOMException('Aborted', 'AbortError'));
            });
        }
        xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) onProgress?.(ev.loaded, ev.total);
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const etag = xhr.getResponseHeader('ETag') || xhr.getResponseHeader('etag') || '';
                const cleaned = String(etag).replace(/^"|"$/g, '');
                if (!cleaned) {
                    reject(
                        new Error(
                            `Upload ${partNumber != null ? `part ${partNumber} ` : ''}returned no ETag. ` +
                                'Add "ExposeHeaders": ["ETag"] to your R2/S3 bucket CORS rule (required to finish multipart uploads).',
                        ),
                    );
                    return;
                }
                resolve(cleaned);
                return;
            }
            reject(new Error(uploadFailureMessage(xhr.status, errCtx)));
        };
        xhr.onerror = () => reject(new Error(uploadFailureMessage(xhr.status || 0, errCtx)));
        xhr.ontimeout = () =>
            reject(
                new Error(
                    `Upload timed out${partNumber != null ? ` on part ${partNumber}` : ''}. Retry on a stable network connection.`,
                ),
            );
        xhr.send(body);
    });
}

/**
 * @param {() => Promise<string>} getPutUrl
 * @param {Blob} body
 * @param {{ contentType?: string, signal?: AbortSignal, onProgress?: (loaded: number, total: number) => void, partNumber?: number, partCount?: number, bytesUploaded?: number, onRetry?: (attempt: number, maxAttempts: number) => void }} opts
 */
async function putWithRetries(getPutUrl, body, opts) {
    let lastError = null;
    for (let attempt = 1; attempt <= PART_UPLOAD_MAX_ATTEMPTS; attempt++) {
        if (opts.signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }
        if (attempt > 1) {
            opts.onRetry?.(attempt, PART_UPLOAD_MAX_ATTEMPTS);
            await sleep(400 * attempt);
        }
        try {
            const putUrl = await getPutUrl();
            return await xhrPut(putUrl, body, opts);
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (lastError instanceof DOMException && lastError.name === 'AbortError') {
                throw lastError;
            }
            if (attempt >= PART_UPLOAD_MAX_ATTEMPTS) break;
        }
    }
    throw lastError || new Error('Upload failed');
}

function shortId8() {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

function truncatedSafeBase(fileName, maxStem = 40) {
    const safe = String(fileName || 'video.mp4').replace(/[^a-zA-Z0-9._-]/g, '_') || 'video.mp4';
    const dot = safe.lastIndexOf('.');
    if (dot > 0 && dot < safe.length - 1) {
        return `${safe.slice(0, dot).slice(0, maxStem)}${safe.slice(dot)}`;
    }
    return safe.slice(0, maxStem + 16);
}

/**
 * @param {number} partNumber
 * @param {number} partCount
 * @param {number} partSize
 * @param {number} fileSize
 * @param {(loaded: number, total: number, phase: string) => void} report
 * @param {() => Promise<string>} getPutUrl
 * @param {Blob} chunk
 * @param {AbortSignal} signal
 */
async function uploadMultipartPart(partNumber, partCount, partSize, fileSize, report, getPutUrl, chunk, signal) {
    const start = (partNumber - 1) * partSize;
    return putWithRetries(getPutUrl, chunk, {
        signal,
        partNumber,
        partCount,
        bytesUploaded: start,
        onProgress: (loaded) => {
            report(start + loaded, fileSize, `Uploading part ${partNumber} of ${partCount}…`);
        },
        onRetry: (attempt, maxAttempts) => {
            report(start, fileSize, `Retrying part ${partNumber} of ${partCount} (${attempt}/${maxAttempts})…`);
        },
    });
}

/**
 * @param {File} file
 * @param {{ kind: 'preview' | 'full', contentId?: string, videoId?: string, showModal?: boolean, signal?: AbortSignal }} opts
 */
export async function uploadVideoFile(file, opts = {}) {
    assertIntegrationUploadReady();
    const kind = opts.kind === 'full' ? 'full' : 'preview';
    const contentType = normalizeVideoContentType(file);
    const contentId = String(opts.contentId || opts.videoId || 'community-video').trim() || 'community-video';
    const useMultipart = file.size > MULTIPART_THRESHOLD_BYTES;

    let modal = null;
    let abortController = new AbortController();
    if (opts.signal) {
        opts.signal.addEventListener('abort', () => abortController.abort());
    }
    if (opts.showModal !== false) {
        modal = openUploadProgressModal(file.name, file.size, {
            onCancel: () => abortController.abort(),
        });
    }

    const report = (loaded, total, phase) => {
        modal?.update({ loaded, total, phase });
    };

    try {
        if (kind === 'full') {
            if (!useMultipart) {
                modal?.update({ phase: 'Preparing upload…' });
                const signed = await presignPrivateVideoUpload({
                    contentId,
                    fileName: file.name,
                    contentType,
                });
                report(0, file.size, 'Uploading…');
                await putWithRetries(async () => signed.putUrl, file, {
                    contentType,
                    signal: abortController.signal,
                    onProgress: (loaded, total) => report(loaded, total, 'Uploading…'),
                });
                modal?.complete();
                return { key: signed.key, fileName: signed.fileName || file.name };
            }

            modal?.update({ phase: 'Starting multipart upload…' });
            const init = await initPrivateVideoMultipartUpload({
                contentId,
                fileName: file.name,
                contentType,
                fileSize: file.size,
            });
            const parts = [];
            const partSize = Number(init.partSize) || 32 * 1024 * 1024;
            const partCount = Number(init.partCount) || Math.ceil(file.size / partSize);
            try {
                for (let partNumber = 1; partNumber <= partCount; partNumber++) {
                    const start = (partNumber - 1) * partSize;
                    const end = Math.min(file.size, start + partSize);
                    const chunk = file.slice(start, end);
                    const etag = await uploadMultipartPart(
                        partNumber,
                        partCount,
                        partSize,
                        file.size,
                        report,
                        async () => {
                            const { putUrl } = await presignPrivateVideoMultipartPart({
                                key: init.key,
                                uploadId: init.uploadId,
                                partNumber,
                            });
                            return putUrl;
                        },
                        chunk,
                        abortController.signal,
                    );
                    parts.push({ partNumber, etag });
                }
                modal?.update({ phase: 'Finishing upload…', percent: 99 });
                const done = await completePrivateVideoMultipartUpload({
                    key: init.key,
                    uploadId: init.uploadId,
                    parts,
                });
                modal?.complete();
                return { key: done.key || init.key, fileName: done.fileName || file.name };
            } catch (e) {
                await abortPrivateVideoMultipartUpload({ key: init.key, uploadId: init.uploadId }).catch(() => {});
                throw e;
            }
        }

        const key = `studio/videos/${contentId}/${shortId8()}-${truncatedSafeBase(file.name)}`;
        const rootPrefix = COMMUNITY_MEDIA_ROOT_PREFIX;

        if (!useMultipart) {
            modal?.update({ phase: 'Preparing upload…' });
            const { putUrl, publicUrl } = await presignUpload(key, contentType, { rootPrefix });
            report(0, file.size, 'Uploading…');
            await putWithRetries(async () => putUrl, file, {
                contentType,
                signal: abortController.signal,
                onProgress: (loaded, total) => report(loaded, total, 'Uploading…'),
            });
            const url = toCloudFrontAssetUrl(publicUrl);
            modal?.complete();
            return { publicUrl: url, url };
        }

        modal?.update({ phase: 'Starting multipart upload…' });
        const init = await initPublicMultipartUpload({
            key,
            contentType,
            fileSize: file.size,
            rootPrefix,
        });
        const parts = [];
        const partSize = Number(init.partSize) || 32 * 1024 * 1024;
        const partCount = Number(init.partCount) || Math.ceil(file.size / partSize);
        try {
            for (let partNumber = 1; partNumber <= partCount; partNumber++) {
                const start = (partNumber - 1) * partSize;
                const end = Math.min(file.size, start + partSize);
                const chunk = file.slice(start, end);
                const etag = await uploadMultipartPart(
                    partNumber,
                    partCount,
                    partSize,
                    file.size,
                    report,
                    async () => {
                        const { putUrl } = await presignPublicMultipartPart({
                            key: init.key,
                            uploadId: init.uploadId,
                            partNumber,
                        });
                        return putUrl;
                    },
                    chunk,
                    abortController.signal,
                );
                parts.push({ partNumber, etag });
            }
            modal?.update({ phase: 'Finishing upload…', percent: 99 });
            const done = await completePublicMultipartUpload({
                key: init.key,
                uploadId: init.uploadId,
                parts,
            });
            const url = toCloudFrontAssetUrl(done.publicUrl);
            modal?.complete();
            return { publicUrl: url, url, key: done.key };
        } catch (e) {
            await abortPublicMultipartUpload({ key: init.key, uploadId: init.uploadId }).catch(() => {});
            throw e;
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (err instanceof DOMException && err.name === 'AbortError') {
            modal?.fail('Upload cancelled');
            throw new Error('Upload cancelled');
        }
        modal?.fail(msg);
        throw err instanceof Error ? err : new Error(msg);
    }
}
