/**
 * Scrub a video source and capture a JPEG frame for poster / card image.
 */
import { uploadBlobToS3 } from './studioS3Upload.js';
import { prepareImageFileForUpload } from './imageUploadPrep.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {number} sec
 */
function formatTime(sec) {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
}

/**
 * @param {HTMLVideoElement} video
 * @param {number} [quality]
 * @returns {Promise<Blob>}
 */
export function captureVideoFrameBlob(video, quality = 0.92) {
    return new Promise((resolve, reject) => {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) {
            reject(new Error('Video not ready for capture'));
            return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error('Canvas unavailable'));
            return;
        }
        try {
            ctx.drawImage(video, 0, 0, w, h);
        } catch {
            reject(new Error('Could not read video frame (CORS). Use a local file or preview URL with CORS.'));
            return;
        }
        canvas.toBlob(
            (blob) => {
                if (!blob) reject(new Error('Frame capture failed'));
                else resolve(blob);
            },
            'image/jpeg',
            quality,
        );
    });
}

/**
 * Mount frame capture UI into container.
 * @param {HTMLElement} container
 * @param {{ getVideoSrc: () => Promise<string | null>, videoId: string, onCaptured?: (urls: { posterUrl?: string, imageUrl?: string }) => void }} opts
 */
export function mountVideoFrameCapture(container, opts) {
    if (!container) return () => {};
    container.innerHTML = `
        <div class="studio-video-frame-capture">
            <h4 class="studio-subheading">Capture poster &amp; thumbnail</h4>
            <p class="studio-muted studio-video-frame-hint">Scrub to a frame, then capture. Upload preview or pick a local file first.</p>
            <div class="studio-video-frame-player-wrap">
                <video class="studio-video-frame-video" playsinline muted preload="metadata" crossorigin="anonymous"></video>
            </div>
            <input type="range" class="studio-video-frame-scrub" min="0" max="0" step="0.05" value="0" disabled />
            <div class="studio-video-frame-time">
                <span class="studio-video-frame-current">0:00</span>
                <span class="studio-video-frame-duration">0:00</span>
            </div>
            <div class="studio-video-frame-actions">
                <button type="button" class="studio-btn-ghost studio-video-frame-back">◀ 1s</button>
                <button type="button" class="studio-btn-ghost studio-video-frame-forward">1s ▶</button>
                <button type="button" class="studio-btn-secondary studio-video-frame-capture-btn" disabled>Capture frame</button>
            </div>
            <div class="studio-video-frame-preview-wrap" hidden>
                <img class="studio-video-frame-preview-img" alt="Captured frame preview" />
            </div>
            <fieldset class="studio-video-frame-targets">
                <label><input type="radio" name="frame-target" value="both" checked /> Poster &amp; card image</label>
                <label><input type="radio" name="frame-target" value="poster" /> Poster only</label>
                <label><input type="radio" name="frame-target" value="image" /> Card image only</label>
            </fieldset>
            <button type="button" class="studio-btn-primary studio-video-frame-upload-btn" disabled>Upload captured images</button>
            <p class="studio-video-frame-status studio-muted" role="status"></p>
        </div>
    `;

    const video = container.querySelector('.studio-video-frame-video');
    const scrub = container.querySelector('.studio-video-frame-scrub');
    const hint = container.querySelector('.studio-video-frame-hint');
    const captureBtn = container.querySelector('.studio-video-frame-capture-btn');
    const uploadBtn = container.querySelector('.studio-video-frame-upload-btn');
    const previewWrap = container.querySelector('.studio-video-frame-preview-wrap');
    const previewImg = container.querySelector('.studio-video-frame-preview-img');
    const statusEl = container.querySelector('.studio-video-frame-status');
    const curEl = container.querySelector('.studio-video-frame-current');
    const durEl = container.querySelector('.studio-video-frame-duration');
    /** @type {Blob | null} */
    let capturedBlob = null;
    let objectUrl = '';

    const setStatus = (msg) => {
        if (statusEl) statusEl.textContent = msg || '';
    };

    const syncTime = () => {
        if (!(video instanceof HTMLVideoElement)) return;
        if (curEl) curEl.textContent = formatTime(video.currentTime);
        if (durEl) durEl.textContent = formatTime(video.duration || 0);
        if (scrub instanceof HTMLInputElement) scrub.value = String(video.currentTime || 0);
    };

    const loadSource = async () => {
        if (!(video instanceof HTMLVideoElement)) return;
        const src = await opts.getVideoSrc();
        if (!src) {
            if (hint) hint.textContent = 'Upload a preview or select a local video file first.';
            if (scrub instanceof HTMLInputElement) scrub.disabled = true;
            if (captureBtn instanceof HTMLButtonElement) captureBtn.disabled = true;
            return;
        }
        if (objectUrl && objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
        video.src = src;
        objectUrl = src;
        if (scrub instanceof HTMLInputElement) scrub.disabled = false;
        if (captureBtn instanceof HTMLButtonElement) captureBtn.disabled = false;
        if (hint) hint.textContent = 'Scrub to the frame you want for the poster and card thumbnail.';
    };

    video?.addEventListener('loadedmetadata', () => {
        if (scrub instanceof HTMLInputElement && video instanceof HTMLVideoElement) {
            scrub.max = String(Math.max(0, video.duration || 0));
        }
        syncTime();
    });
    video?.addEventListener('timeupdate', syncTime);

    scrub?.addEventListener('input', () => {
        if (video instanceof HTMLVideoElement && scrub instanceof HTMLInputElement) {
            video.currentTime = Number(scrub.value);
        }
    });

    container.querySelector('.studio-video-frame-back')?.addEventListener('click', () => {
        if (video instanceof HTMLVideoElement) video.currentTime = Math.max(0, video.currentTime - 1);
    });
    container.querySelector('.studio-video-frame-forward')?.addEventListener('click', () => {
        if (video instanceof HTMLVideoElement) {
            video.currentTime = Math.min(video.duration || 0, video.currentTime + 1);
        }
    });

    captureBtn?.addEventListener('click', async () => {
        if (!(video instanceof HTMLVideoElement)) return;
        try {
            capturedBlob = await captureVideoFrameBlob(video);
            if (previewImg instanceof HTMLImageElement && previewWrap instanceof HTMLElement) {
                previewImg.src = URL.createObjectURL(capturedBlob);
                previewWrap.hidden = false;
            }
            if (uploadBtn instanceof HTMLButtonElement) uploadBtn.disabled = false;
            setStatus('Frame captured — choose target and upload.');
        } catch (err) {
            setStatus(err instanceof Error ? err.message : String(err));
        }
    });

    uploadBtn?.addEventListener('click', async () => {
        if (!capturedBlob) return;
        const target = container.querySelector('input[name="frame-target"]:checked')?.value || 'both';
        const videoId = String(opts.videoId || 'draft').trim() || 'draft';
        try {
            setStatus('Uploading captured frame…');
            const captureFile = new File([capturedBlob], 'poster.jpg', { type: 'image/jpeg' });
            const { file: preparedFile } = await prepareImageFileForUpload(captureFile);
            const urls = {};
            if (target === 'both' || target === 'poster') {
                urls.posterUrl = await uploadBlobToS3(preparedFile, null, {
                    area: 'studio/videos',
                    entityType: 'video',
                    entityId: videoId,
                    fieldKey: 'poster',
                });
            }
            if (target === 'both' || target === 'image') {
                urls.imageUrl = await uploadBlobToS3(preparedFile, null, {
                    area: 'studio/videos',
                    entityType: 'video',
                    entityId: videoId,
                    fieldKey: 'card-image',
                });
            }
            if (target === 'both' && urls.posterUrl && !urls.imageUrl) urls.imageUrl = urls.posterUrl;
            setStatus('Captured images uploaded.');
            opts.onCaptured?.(urls);
        } catch (err) {
            setStatus(err instanceof Error ? err.message : String(err));
        }
    });

    void loadSource();

    return () => {
        if (objectUrl && objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
        container.innerHTML = '';
    };
}

/** @param {string} videoId */
export function videoFrameCaptureShellHtml(videoId) {
    return `<div class="studio-video-frame-mount" data-video-id="${esc(videoId)}"></div>`;
}
