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

/**
 * @param {string} putUrl
 * @param {Blob} body
 * @param {string} contentType
 * @param {AbortSignal} [signal]
 * @param {(loaded: number, total: number) => void} [onPartProgress]
 */
function xhrPut(putUrl, body, contentType, signal, onPartProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', putUrl, true);
        xhr.setRequestHeader('Content-Type', contentType);
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
            if (ev.lengthComputable) onPartProgress?.(ev.loaded, ev.total);
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const etag = xhr.getResponseHeader('ETag') || xhr.getResponseHeader('etag') || '';
                resolve(String(etag).replace(/^"|"$/g, ''));
            } else {
                reject(new Error(`Upload failed: HTTP ${xhr.status}`));
            }
        };
        xhr.onerror = () => reject(new Error('Upload network error'));
        xhr.send(body);
    });
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
 * @param {File} file
 * @param {{ kind: 'preview' | 'full', contentId?: string, videoId?: string, showModal?: boolean, signal?: AbortSignal }} opts
 */
export async function uploadVideoFile(file, opts = {}) {
    assertIntegrationUploadReady();
    const kind = opts.kind === 'full' ? 'full' : 'preview';
    const contentType = file.type || 'application/octet-stream';
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
                await xhrPut(signed.putUrl, file, contentType, abortController.signal, (loaded, total) => {
                    report(loaded, total, 'Uploading…');
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
            const partSize = Number(init.partSize) || 10 * 1024 * 1024;
            const partCount = Number(init.partCount) || Math.ceil(file.size / partSize);
            try {
                for (let partNumber = 1; partNumber <= partCount; partNumber++) {
                    const start = (partNumber - 1) * partSize;
                    const end = Math.min(file.size, start + partSize);
                    const chunk = file.slice(start, end);
                    const { putUrl } = await presignPrivateVideoMultipartPart({
                        key: init.key,
                        uploadId: init.uploadId,
                        partNumber,
                    });
                    const etag = await xhrPut(
                        putUrl,
                        chunk,
                        contentType,
                        abortController.signal,
                        (loaded) => {
                            const aggregate = start + loaded;
                            report(
                                aggregate,
                                file.size,
                                `Uploading part ${partNumber} of ${partCount}…`,
                            );
                        },
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
            await xhrPut(putUrl, file, contentType, abortController.signal, (loaded, total) => {
                report(loaded, total, 'Uploading…');
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
        const partSize = Number(init.partSize) || 10 * 1024 * 1024;
        const partCount = Number(init.partCount) || Math.ceil(file.size / partSize);
        try {
            for (let partNumber = 1; partNumber <= partCount; partNumber++) {
                const start = (partNumber - 1) * partSize;
                const end = Math.min(file.size, start + partSize);
                const chunk = file.slice(start, end);
                const { putUrl } = await presignPublicMultipartPart({
                    key: init.key,
                    uploadId: init.uploadId,
                    partNumber,
                });
                const etag = await xhrPut(putUrl, chunk, contentType, abortController.signal, (loaded) => {
                    report(start + loaded, file.size, `Uploading part ${partNumber} of ${partCount}…`);
                });
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
