/**
 * PNG export for Studio social cards (html2canvas + blob download / clipboard).
 */
import html2canvas from 'html2canvas';
import { socialRatioPixels } from './socialCardLayout.js';

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
async function blobUrlForRemoteImage(url) {
    const src = String(url || '').trim();
    if (!src || src.startsWith('blob:') || src.startsWith('data:')) return src;
    try {
        const res = await fetch(src, { mode: 'cors', credentials: 'omit' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(
            `Could not load image for export (CORS or network): ${src.slice(0, 80)}. ${msg}`,
        );
    }
}

/**
 * Replace remote <img> srcs with blob URLs so the canvas is not tainted.
 * @param {HTMLElement} stageEl
 * @returns {Promise<() => void>} cleanup that revokes blob URLs
 */
export async function prepareStageImagesForExport(stageEl) {
    const imgs = [...stageEl.querySelectorAll('img')].filter((el) => el instanceof HTMLImageElement);
    /** @type {string[]} */
    const created = [];
    /** @type {Array<{ img: HTMLImageElement, prev: string }>} */
    const restored = [];

    for (const img of imgs) {
        const prev = img.getAttribute('src') || img.src || '';
        if (!prev || prev.startsWith('blob:') || prev.startsWith('data:')) continue;
        const blobUrl = await blobUrlForRemoteImage(prev);
        created.push(blobUrl);
        restored.push({ img, prev });
        img.crossOrigin = 'anonymous';
        img.src = blobUrl;
        if (!img.complete) {
            await new Promise((resolve, reject) => {
                img.onload = () => resolve(undefined);
                img.onerror = () => reject(new Error('Image failed to decode for export.'));
            });
        }
    }

    return () => {
        for (const { img, prev } of restored) {
            img.src = prev;
        }
        for (const u of created) {
            try {
                URL.revokeObjectURL(u);
            } catch {
                /* ignore */
            }
        }
    };
}

/**
 * Clone the card into an offscreen, unscaled host so parent preview transform
 * does not affect rasterization.
 * @param {HTMLElement} card
 * @param {{ width: number, height: number }} dims
 * @returns {{ host: HTMLElement, clone: HTMLElement }}
 */
function mountOffscreenClone(card, dims) {
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = [
        'position:fixed',
        'left:-10000px',
        'top:0',
        'width:' + dims.width + 'px',
        'height:' + dims.height + 'px',
        'overflow:hidden',
        'pointer-events:none',
        'z-index:-1',
    ].join(';');
    const clone = /** @type {HTMLElement} */ (card.cloneNode(true));
    clone.style.width = `${dims.width}px`;
    clone.style.height = `${dims.height}px`;
    clone.style.transform = 'none';
    clone.style.margin = '0';
    host.appendChild(clone);
    document.body.appendChild(host);
    return { host, clone };
}

/**
 * @param {HTMLElement} stageEl
 * @param {'1:1' | '4:5'} ratio
 * @returns {Promise<Blob>}
 */
export async function captureSocialCardPng(stageEl, ratio) {
    const card = stageEl.querySelector('.studio-ec-social-card');
    if (!(card instanceof HTMLElement)) {
        throw new Error('No social card to export. Apply content first.');
    }
    const dims = socialRatioPixels(ratio);
    const { host, clone } = mountOffscreenClone(card, dims);
    const cleanup = await prepareStageImagesForExport(clone);
    try {
        // Wait a frame so layout/fonts settle on the clone.
        await new Promise((r) => requestAnimationFrame(() => r(undefined)));
        const canvas = await html2canvas(clone, {
            backgroundColor: null,
            scale: 1,
            width: dims.width,
            height: dims.height,
            windowWidth: dims.width,
            windowHeight: dims.height,
            useCORS: true,
            allowTaint: false,
            logging: false,
        });
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(
                (b) => {
                    if (b) resolve(b);
                    else reject(new Error('Failed to encode PNG.'));
                },
                'image/png',
            );
        });
        return /** @type {Blob} */ (blob);
    } finally {
        cleanup();
        host.remove();
    }
}

/**
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadSocialPng(blob, filename) {
    const name = String(filename || 'fusion-social.png').replace(/[^\w.\-]+/g, '_');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * @returns {boolean}
 */
export function canCopySocialPng() {
    try {
        return Boolean(
            typeof navigator !== 'undefined' &&
                navigator.clipboard &&
                typeof navigator.clipboard.write === 'function' &&
                typeof ClipboardItem !== 'undefined',
        );
    } catch {
        return false;
    }
}

/**
 * @param {Blob} blob
 * @returns {Promise<void>}
 */
export async function copySocialPng(blob) {
    if (!canCopySocialPng()) {
        throw new Error('Clipboard image copy is not available here. Use Download PNG instead.');
    }
    try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/permissions policy|not allowed|blocked|Clipboard/i.test(msg)) {
            throw new Error(
                'Clipboard is blocked in this environment (permissions policy). Use Download PNG instead.',
            );
        }
        throw e instanceof Error ? e : new Error(String(e));
    }
}
