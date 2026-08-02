/**
 * Shared join-network / unlock collage: fade-swap program + artist stills on an interval.
 */
import {
    filterProgramsBlockToPublicListing,
    getAllProgramsBlock,
    getArtists,
} from './database.js';
import {
    getArtistCardArtworkUrl,
    getArtistCardProfileUrl,
    isArtistHeroProfileImageApproved,
} from './artistCardImageMode.js';

export const JOIN_COLLAGE_ROTATE_MS = 10000;

/** @param {unknown} url */
function isUsableImageUrl(url) {
    const u = String(url ?? '').trim();
    if (!u) return false;
    if (/^(blob:|data:)/i.test(u)) return false;
    if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u)) return false;
    return true;
}

/**
 * @param {Set<string>} out
 * @param {unknown} url
 */
function pushImageUrl(out, url) {
    if (isUsableImageUrl(url)) out.add(String(url).trim());
}

/**
 * @param {unknown} program
 * @returns {string[]}
 */
function collectProgramImageUrls(program) {
    const out = new Set();
    if (!program || typeof program !== 'object') return [];
    const p = /** @type {Record<string, any>} */ (program);
    pushImageUrl(out, p.imageSrc);
    pushImageUrl(out, p.heroMediaSrc);
    const page = p.programPage && typeof p.programPage === 'object' ? p.programPage : null;
    if (page) {
        for (const u of Array.isArray(page.fadeGalleryImages) ? page.fadeGalleryImages : []) {
            pushImageUrl(out, u);
        }
        for (const u of Array.isArray(page.stripGalleryImages) ? page.stripGalleryImages : []) {
            pushImageUrl(out, u);
        }
        for (const card of Array.isArray(page.offeringCards) ? page.offeringCards : []) {
            for (const u of Array.isArray(card?.gallery) ? card.gallery : []) {
                pushImageUrl(out, u);
            }
        }
        const facilities = page.programDetails?.facilities;
        if (Array.isArray(facilities)) {
            for (const f of facilities) {
                for (const u of Array.isArray(f?.gallery) ? f.gallery : []) {
                    pushImageUrl(out, u);
                }
            }
        }
    }
    return [...out];
}

/**
 * @param {unknown} artist
 * @returns {string}
 */
function artistCollageImageUrl(artist) {
    if (isArtistHeroProfileImageApproved(artist)) {
        const profile = getArtistCardProfileUrl(artist, { fallbackToArtwork: false });
        if (isUsableImageUrl(profile)) return profile;
    }
    const artwork = getArtistCardArtworkUrl(artist);
    return isUsableImageUrl(artwork) ? artwork : '';
}

/**
 * @template T
 * @param {T[]} items
 * @param {number} n
 * @returns {T[]}
 */
function pickRandomUnique(items, n) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = copy[i];
        copy[i] = copy[j];
        copy[j] = tmp;
    }
    return copy.slice(0, Math.max(0, Math.min(n, copy.length)));
}

/**
 * Fade out → swap src → fade in once the new image has loaded.
 * @param {HTMLImageElement} img
 * @param {string} url
 * @param {string} [alt]
 * @returns {Promise<void>}
 */
export function swapCollageImage(img, url, alt) {
    const next = String(url || '').trim();
    if (!next) return Promise.resolve();

    const current = String(img.currentSrc || img.src || '').trim();
    if (current === next || current.endsWith(next) || next.endsWith(current)) {
        if (alt != null && alt !== '') img.alt = alt;
        return Promise.resolve();
    }

    const waitOpacity = () =>
        new Promise((resolve) => {
            let done = false;
            const finish = () => {
                if (done) return;
                done = true;
                img.removeEventListener('transitionend', onEnd);
                window.clearTimeout(fallback);
                resolve();
            };
            const onEnd = (/** @type {TransitionEvent} */ e) => {
                if (e.target === img && e.propertyName === 'opacity') finish();
            };
            img.addEventListener('transitionend', onEnd);
            const fallback = window.setTimeout(finish, 500);
        });

    const waitLoad = () =>
        new Promise((resolve) => {
            let done = false;
            const finish = () => {
                if (done) return;
                done = true;
                img.removeEventListener('load', finish);
                img.removeEventListener('error', finish);
                resolve();
            };
            img.addEventListener('load', finish);
            img.addEventListener('error', finish);
            img.src = next;
            if (alt != null && alt !== '') img.alt = alt;
            if (img.complete) finish();
        });

    return (async () => {
        img.classList.add('is-swapping');
        await waitOpacity();
        await waitLoad();
        void img.offsetWidth;
        img.classList.remove('is-swapping');
    })();
}

/**
 * @param {ParentNode} root
 * @param {string} attrName e.g. data-jnp-collage or data-mpd-join-collage
 * @returns {HTMLImageElement[]}
 */
export function queryCollageImages(root, attrName) {
    return /** @type {HTMLImageElement[]} */ (
        [0, 1, 2]
            .map((i) => root.querySelector(`[${attrName}="${i}"]`))
            .filter((el) => el instanceof HTMLImageElement)
    );
}

/**
 * Left: random program image. Right two: random artist stills.
 * @param {HTMLImageElement[]} imgs
 * @param {unknown[]} [artistsPrefetch]
 */
export async function hydrateCollageImages(imgs, artistsPrefetch) {
    if (!Array.isArray(imgs) || imgs.length < 3) return;
    if (imgs.some((img) => !img.isConnected)) return;

    try {
        const [block, artists] = await Promise.all([
            getAllProgramsBlock(),
            artistsPrefetch ? Promise.resolve(artistsPrefetch) : getArtists(),
        ]);
        const publicBlock = filterProgramsBlockToPublicListing(block);
        const programs = Array.isArray(publicBlock?.programs?.en) ? publicBlock.programs.en : [];
        const programPool = [];
        for (const p of programs) {
            programPool.push(...collectProgramImageUrls(p));
        }
        const uniquePrograms = [...new Set(programPool)];
        /** @type {Promise<void>[]} */
        const swaps = [];
        if (uniquePrograms.length) {
            const left = uniquePrograms[Math.floor(Math.random() * uniquePrograms.length)];
            swaps.push(swapCollageImage(imgs[0], left, imgs[0].alt || 'FUSION program'));
        }

        const artistPool = (Array.isArray(artists) ? artists : [])
            .map((a) => {
                const url = artistCollageImageUrl(a);
                if (!url) return null;
                const name =
                    String(/** @type {any} */ (a)?.locales?.en?.name ?? '').trim() ||
                    String(/** @type {any} */ (a)?.slug ?? '').trim() ||
                    'Artist';
                return { url, name, id: String(/** @type {any} */ (a)?.id ?? name) };
            })
            .filter(Boolean);
        const picked = pickRandomUnique(
            /** @type {{ url: string, name: string, id: string }[]} */ (artistPool),
            2,
        );
        picked.forEach((item, i) => {
            const img = imgs[i + 1];
            if (!img || !item) return;
            swaps.push(swapCollageImage(img, item.url, item.name));
        });
        await Promise.all(swaps);
    } catch {
        /* keep CMS / default collage srcs */
    }
}

/**
 * Initial hydrate + rotate every `intervalMs`. Stops when images leave the DOM.
 * @param {ParentNode} root
 * @param {{
 *   attrName?: string,
 *   artistsPrefetch?: unknown[],
 *   intervalMs?: number,
 *   rotateImmediately?: boolean,
 * }} [opts]
 * @returns {() => void} cleanup
 */
export function startJoinCollageRotation(root, opts = {}) {
    const attrName = opts.attrName || 'data-jnp-collage';
    const intervalMs =
        Number.isFinite(opts.intervalMs) && Number(opts.intervalMs) > 0
            ? Number(opts.intervalMs)
            : JOIN_COLLAGE_ROTATE_MS;
    /** @type {unknown[] | undefined} */
    let artistsCache = opts.artistsPrefetch;
    let busy = false;
    /** @type {ReturnType<typeof setInterval> | null} */
    let timer = null;
    let stopped = false;

    const getImgs = () => queryCollageImages(root, attrName);

    const run = async () => {
        if (stopped || busy) return;
        const imgs = getImgs();
        if (imgs.length < 3 || imgs.some((img) => !img.isConnected)) {
            stop();
            return;
        }
        busy = true;
        try {
            if (!artistsCache) {
                try {
                    artistsCache = await getArtists();
                } catch {
                    artistsCache = [];
                }
            }
            await hydrateCollageImages(imgs, artistsCache);
        } finally {
            busy = false;
        }
    };

    const stop = () => {
        stopped = true;
        if (timer != null) {
            window.clearInterval(timer);
            timer = null;
        }
    };

    if (opts.rotateImmediately !== false) {
        void run();
    }
    timer = window.setInterval(() => {
        void run();
    }, intervalMs);

    return stop;
}
