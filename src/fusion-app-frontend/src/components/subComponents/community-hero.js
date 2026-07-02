import { getMembershipAccessForCaller } from '../../utils/database.js';
import { getAuthSnapshot } from '../../utils/icAuth.js';
import { signPrivateVideoPlayback } from '../../utils/integrationApi.js';
import { normalizePrivateVideoStorageKey } from '../../utils/privateVideoKey.js';
import { PH_LOADER_BASE_STYLES, programHeroLoaderHtml } from '../../utils/programHeroLoader.js';
import { withSeoVideoLabel } from '../../utils/mediaAltSeo.js';
import { captureCommunityEvent, communityDestinationProps } from '../../utils/communityPosthog.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatTime(sec) {
    const n = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(n / 60);
    const s = n % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function localeText(obj, key, loc, fallback = '') {
    if (!obj || typeof obj !== 'object') return fallback;
    const source = /** @type {Record<string, unknown>} */ (obj);
    const en = String(source[`${key}En`] ?? '').trim();
    const ja = String(source[`${key}Ja`] ?? '').trim();
    return loc === 'ja'
        ? (ja || en || fallback)
        : (en || ja || fallback);
}

function artistLocale(artist, loc) {
    const locales = artist?.locales && typeof artist.locales === 'object' ? artist.locales : {};
    const local = /** @type {Record<string, unknown>} */ (locales)[loc];
    const fallback = /** @type {Record<string, unknown>} */ (locales).en;
    return local && typeof local === 'object'
        ? /** @type {Record<string, unknown>} */ (local)
        : fallback && typeof fallback === 'object'
          ? /** @type {Record<string, unknown>} */ (fallback)
          : {};
}

function artistLocaleFallback(artist) {
    const locales = artist?.locales && typeof artist.locales === 'object' ? artist.locales : {};
    const fallback = /** @type {Record<string, unknown>} */ (locales).en;
    return fallback && typeof fallback === 'object'
        ? /** @type {Record<string, unknown>} */ (fallback)
        : {};
}

function firstText(...values) {
    for (const value of values) {
        const text = String(value ?? '').trim();
        if (text) return text;
    }
    return '';
}

function artistName(artist, loc) {
    const local = artistLocale(artist, loc);
    const fallback = artistLocaleFallback(artist);
    return firstText(local.name, fallback.name, artist?.name, artist?.slug);
}

function artistRole(artist, loc) {
    const local = artistLocale(artist, loc);
    const fallback = artistLocaleFallback(artist);
    return firstText(local.discipline, fallback.discipline, artist?.discipline, artist?.filter?.disciplineKey, 'Artist');
}

function artistBio(artist, loc) {
    const local = artistLocale(artist, loc);
    const fallback = artistLocaleFallback(artist);
    return firstText(local.bio, local.bioLong, fallback.bio, fallback.bioLong, artist?.bio);
}

function truncateWords(text, maxWords = 30) {
    const raw = String(text ?? '').trim();
    const words = raw.split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return raw;
    return `${words.slice(0, maxWords).join(' ')}...`;
}

function artistLocation(artist, loc) {
    const local = artistLocale(artist, loc);
    const fallback = artistLocaleFallback(artist);
    const location = local.location && typeof local.location === 'object' ? local.location : {};
    const fallbackLocation = fallback.location && typeof fallback.location === 'object' ? fallback.location : {};
    return firstText(
        /** @type {Record<string, unknown>} */ (location).display,
        /** @type {Record<string, unknown>} */ (fallbackLocation).display,
        artist?.location,
    );
}

function artistImage(artist, loc) {
    const local = artistLocale(artist, loc);
    const world = local.world && typeof local.world === 'object' ? local.world : {};
    const gallery = Array.isArray(/** @type {Record<string, unknown>} */ (world).introGallery)
        ? /** @type {Array<Record<string, unknown>>} */ (/** @type {Record<string, unknown>} */ (world).introGallery)
        : [];
    return String(artist?.heroProfileImage || artist?.image || gallery[0]?.src || '');
}

function artistArtImage(artist, loc) {
    const local = artistLocale(artist, loc);
    const world = local.world && typeof local.world === 'object' ? local.world : {};
    const gallery = Array.isArray(/** @type {Record<string, unknown>} */ (world).introGallery)
        ? /** @type {Array<Record<string, unknown>>} */ (/** @type {Record<string, unknown>} */ (world).introGallery)
        : [];
    const profileImage = artistImage(artist, loc);
    return String(gallery[1]?.src || gallery[0]?.src || artist?.image || artist?.heroProfileImage || profileImage || '');
}

function artistHref(artist) {
    const slug = String(artist?.slug ?? '').trim();
    return slug ? `/profile/${encodeURIComponent(slug)}` : '/artists';
}

class CommunityHero extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {Record<string, unknown> | null} */
        this._data = null;
        /** @type {Array<Record<string, unknown>>} */
        this._artists = [];
        this._activeIndex = -1;
        this._activeChapterIndex = 0;
        this._activeTopicIndex = 0;
        this._activeChapterTab = 'people';
        this._signedFullVideoUrl = '';
        this._unlockError = '';
        this._fullPlaybackFailed = false;
        this._lastMediaKey = '';
        this._lastGateSignature = '';
        this._refreshGateTimer = 0;
        this._refreshInFlight = false;
        this._profileTransitionTimer = 0;
        this._topicOverlayTimer = 0;
        this._railResizeObserver = null;
        this._onAuth = () => {
            if (this._refreshGateTimer) {
                window.clearTimeout(this._refreshGateTimer);
            }
            this._refreshGateTimer = window.setTimeout(() => {
                this._refreshGateTimer = 0;
                void this._refreshGate();
            }, 200);
        };
    }

    connectedCallback() {
        window.addEventListener('fusion-auth-change', this._onAuth);
        if (!this._data) this.renderLoading();
        if (this._data) void this._refreshGate();
    }

    disconnectedCallback() {
        window.removeEventListener('fusion-auth-change', this._onAuth);
        if (this._refreshGateTimer) {
            window.clearTimeout(this._refreshGateTimer);
            this._refreshGateTimer = 0;
        }
        if (this._profileTransitionTimer) {
            window.clearTimeout(this._profileTransitionTimer);
            this._profileTransitionTimer = 0;
        }
        if (this._topicOverlayTimer) {
            window.clearTimeout(this._topicOverlayTimer);
            this._topicOverlayTimer = 0;
        }
        if (this._railResizeObserver) {
            this._railResizeObserver.disconnect();
            this._railResizeObserver = null;
        }
    }

    renderLoading() {
        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    margin: 0 0 clamp(2.5rem, 5vw, 4.5rem);
                }
                ${PH_LOADER_BASE_STYLES}
                .community-hero-pending-loader {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    min-height: min(72vh, 720px);
                    background: var(--bg, #f8f4f0);
                    box-sizing: border-box;
                }
            </style>
            ${programHeroLoaderHtml({ wrapperClass: 'community-hero-pending-loader', ariaLabel: 'Loading community hero' })}
        `;
    }

    /**
     * @param {Record<string, unknown>} data — `communityPage.hero`
     * @param {{ artists?: Array<Record<string, unknown>>, activeIndex?: number }} [opts]
     */
    setData(data, opts = {}) {
        const nextData = data && typeof data === 'object' ? data : null;
        const nextMediaKey = nextData
            ? [
                  nextData.videoUrl,
                  nextData.previewVideoUrl,
                  nextData.fullVideoKey,
                  nextData.posterUrl,
              ].map((v) => String(v ?? '')).join('|')
            : '';
        this._data = data && typeof data === 'object' ? data : null;
        this._artists = Array.isArray(opts.artists) ? opts.artists : this._artists;
        this._activeIndex = Number.isFinite(opts.activeIndex) ? Number(opts.activeIndex) : this._activeIndex;
        this._activeChapterIndex = 0;
        this._activeTopicIndex = 0;
        this._activeChapterTab = 'people';
        if (nextMediaKey !== this._lastMediaKey) {
            this._signedFullVideoUrl = '';
            this._unlockError = '';
            this._fullPlaybackFailed = false;
            this._lastGateSignature = '';
            this._lastMediaKey = nextMediaKey;
        }
        if (this.isConnected) void this._refreshGate();
    }

    async _refreshGate() {
        if (!this._data || this._refreshInFlight) return;
        let gate = '';
        try {
            gate = await getMembershipAccessForCaller();
        } catch {
            gate = '';
        }
        const canWatch = gate === 'ok' || gate === 'exempt';
        const fullVideoKey = normalizePrivateVideoStorageKey(this._data.fullVideoKey);
        let principalText = '';
        if (canWatch) {
            try {
                const snap = await getAuthSnapshot();
                if (snap.authenticated) principalText = snap.principal.toText();
            } catch {
                principalText = '';
            }
        }
        const gateSignature = `${canWatch ? '1' : '0'}|${fullVideoKey}|${principalText}`;
        if (
            gateSignature === this._lastGateSignature
            && (this._signedFullVideoUrl || this._fullPlaybackFailed || !fullVideoKey || !canWatch)
        ) {
            this.render(canWatch);
            return;
        }
        this._refreshInFlight = true;
        this._lastGateSignature = gateSignature;
        this._unlockError = '';
        if (!canWatch || !fullVideoKey) {
            this._signedFullVideoUrl = '';
            this._fullPlaybackFailed = false;
            this._refreshInFlight = false;
            this.render(canWatch);
            return;
        }
        if (!this._fullPlaybackFailed) {
            this._signedFullVideoUrl = '';
        }
        try {
            if (!principalText) throw new Error('Sign in required');
            const signed = await signPrivateVideoPlayback({
                key: fullVideoKey,
                principal: principalText,
            });
            this._signedFullVideoUrl = String(signed.url || '').trim();
            if (this._signedFullVideoUrl) {
                this._fullPlaybackFailed = false;
            }
        } catch {
            this._signedFullVideoUrl = '';
            this._unlockError = 'Could not unlock full video. Please try again.';
        }
        this._refreshInFlight = false;
        this.render(canWatch);
    }

    _requestFullVideoUnlock() {
        this._fullPlaybackFailed = false;
        this._lastGateSignature = '';
        void this._refreshGate();
    }

    /**
     * @param {boolean} canWatch
     */
    render(canWatch) {
        const d = this._data && typeof this._data === 'object' ? this._data : {};
        const loc =
            typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
        const artistById = new Map(this._artists.map((artist) => [String(artist?.id ?? ''), artist]));
        const legacyVideoUrl = String(d.videoUrl ?? '').trim();
        const previewVideoUrl = String(d.previewVideoUrl ?? '').trim();
        const fullVideoKey = normalizePrivateVideoStorageKey(d.fullVideoKey);
        const signedFullReady = Boolean(
            canWatch && this._signedFullVideoUrl && fullVideoKey && !this._fullPlaybackFailed,
        );
        const fullTimelineActive = signedFullReady;
        const previewChapterSource = Array.isArray(d.previewChapters) ? d.previewChapters : d.chapters;
        const previewTopicSource = Array.isArray(d.previewTopics) ? d.previewTopics : d.topics;
        const fullChapterSource = Array.isArray(d.fullChapters) && d.fullChapters.length
            ? d.fullChapters
            : previewChapterSource;
        const fullTopicSource = Array.isArray(d.fullTopics) && d.fullTopics.length
            ? d.fullTopics
            : previewTopicSource;
        const chapterSource = fullTimelineActive ? fullChapterSource : previewChapterSource;
        const topicSource = fullTimelineActive ? fullTopicSource : previewTopicSource;
        const configuredChapters = (Array.isArray(chapterSource) ? chapterSource : [])
            .map((raw) => {
                const c = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
                const artistId = String(c.artistId ?? '').trim();
                const artist = artistById.get(artistId);
                const timestampSec = Math.max(0, Math.floor(Number(c.timestampSec) || 0));
                return artist ? { artistId, artist, timestampSec } : null;
            })
            .filter(Boolean)
            .sort((a, b) => a.timestampSec - b.timestampSec);
        const fallbackChapterTimes = [0, 22, 48, 72, 96, 118, 138, 162, 182, 200];
        const chapters = configuredChapters.length
            ? configuredChapters
            : this._artists.slice(0, 10).map((artist, i) => ({
                  artistId: String(artist?.id ?? ''),
                  artist,
                  timestampSec: fallbackChapterTimes[i] ?? i * 24,
              }));
        if (this._activeChapterIndex >= chapters.length) this._activeChapterIndex = 0;
        const topics = (Array.isArray(topicSource) ? topicSource : [])
            .map((raw) => {
                const t = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
                const title = loc === 'ja'
                    ? firstText(t.titleJa, t.titleEn, t.title)
                    : firstText(t.titleEn, t.titleJa, t.title);
                const quote = loc === 'ja'
                    ? firstText(t.quoteJa, t.quoteEn, t.quote)
                    : firstText(t.quoteEn, t.quoteJa, t.quote);
                const timestampSec = Math.max(0, Math.floor(Number(t.timestampSec) || 0));
                return title || quote ? { title, quote, timestampSec } : null;
            })
            .filter(Boolean)
            .sort((a, b) => a.timestampSec - b.timestampSec);
        if (this._activeTopicIndex >= topics.length) this._activeTopicIndex = 0;
        if (this._activeChapterTab === 'ideas' && topics.length === 0) this._activeChapterTab = 'people';
        const activeChapter = chapters[this._activeChapterIndex] || chapters[0] || null;
        const kicker = localeText(d, 'kicker', loc);
        const headline = localeText(d, 'headline', loc);
        const body = localeText(d, 'body', loc);
        const joinLabel = localeText(d, 'ctaJoinLabel', loc, 'JOIN');
        const watchLabel = localeText(d, 'ctaWatchLabel', loc, 'WATCH');
        const posterUrl = String(d.posterUrl ?? '').trim();
        const overlayTitle = String(d.overlayTitle ?? '').trim();
        const overlayGuests = String(d.overlayGuests ?? '').trim();
        const overlayDuration = String(d.overlayDuration ?? '').trim();

        const chVideoLabel = withSeoVideoLabel(headline || 'Community video');
        const isLegacyPublicVideo = Boolean(legacyVideoUrl && !previewVideoUrl && !fullVideoKey);
        const videoUrl =
            signedFullReady
                ? this._signedFullVideoUrl
                : previewVideoUrl || (isLegacyPublicVideo ? legacyVideoUrl : '');
        const hasGuestPreview = Boolean(videoUrl && !canWatch && !signedFullReady);
        const hasLockedFullVideo = Boolean(fullVideoKey && canWatch && !signedFullReady);
        const showDualCtas = hasGuestPreview && !canWatch;
        const videoTier = fullTimelineActive ? 'full' : videoUrl ? 'preview' : 'none';
        const trackingBase = () => ({
            hero_source: this._activeIndex >= 0 ? 'exclusive' : 'hero',
            active_index: this._activeIndex,
            video_tier: videoTier,
            can_watch: Boolean(canWatch),
            has_preview_video: Boolean(previewVideoUrl || legacyVideoUrl),
            has_full_video: Boolean(fullVideoKey),
        });
        const emptyCopy = hasLockedFullVideo
            ? (this._fullPlaybackFailed
                ? 'Full video unavailable — showing preview'
                : 'Members-only full video')
            : 'Video URL (Studio)';
        const chapterButtons = chapters.map((chapter, i) => {
            const active = i === this._activeChapterIndex;
            return `
                <button type="button" class="ch-chapter ${active ? 'is-active' : ''}" data-chapter-index="${i}" aria-pressed="${active ? 'true' : 'false'}">
                    <span class="ch-chapter__thumb" style="${artistImage(chapter.artist, loc) ? `background-image:url(${esc(artistImage(chapter.artist, loc))})` : ''}"></span>
                    <span class="ch-chapter__copy">
                        <strong>${esc(artistName(chapter.artist, loc))}</strong>
                        <small>${esc(artistRole(chapter.artist, loc))}</small>
                    </span>
                    <time>${esc(formatTime(chapter.timestampSec))}</time>
                </button>
            `;
        }).join('');
        const topicButtons = topics.map((topic, i) => {
            const active = i === this._activeTopicIndex;
            return `
                <button type="button" class="ch-topic ${active ? 'is-active' : ''}" data-topic-index="${i}" aria-pressed="${active ? 'true' : 'false'}">
                    <span class="ch-topic__copy">
                        <strong>${esc(topic.title)}</strong>
                        ${topic.quote ? `<small>${esc(topic.quote)}</small>` : ''}
                    </span>
                    <time>${esc(formatTime(topic.timestampSec))}</time>
                </button>
            `;
        }).join('');
        const profileMarkup = (chapter) => {
            const artist = chapter?.artist || null;
            if (!artist) return '';
            const artImage = artistArtImage(artist, loc);
            const profileImage = artistImage(artist, loc);
            return `
                <div class="ch-profile">
                    <div class="ch-profile__intro">
                        <div class="ch-profile__avatar" style="${profileImage ? `background-image:url(${esc(profileImage)})` : ''}"></div>
                        <div>
                            <h2>${esc(artistName(artist, loc))}</h2>
                            <p class="ch-profile__role">${esc(artistRole(artist, loc))} ${chapter ? `· ${esc(formatTime(chapter.timestampSec))}` : ''}</p>
                            <p>${esc(truncateWords(artistBio(artist, loc), 30))}</p>
                            <a class="ch-profile__link" href="${esc(artistHref(artist))}" target="_blank" rel="noopener noreferrer">View artist profile</a>
                        </div>
                    </div>
                    <div class="ch-profile__meta">
                        ${artistLocation(artist, loc) ? `<span><strong>Based in</strong>${esc(artistLocation(artist, loc))}</span>` : ''}
                        ${artist?.mostRecentProgram ? `<span><strong>Recent Program</strong>${esc(artist.mostRecentProgram)}</span>` : ''}
                    </div>
                    <div class="ch-profile__art" data-art-url="${esc(artImage)}" data-profile-url="${esc(profileImage)}" style="${(artImage || profileImage) ? `background-image:url(${esc(artImage || profileImage)})` : ''}"></div>
                </div>
            `;
        };

        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    margin: 0 0 clamp(2.5rem, 5vw, 4.5rem);
                    box-sizing: border-box;
                    font-family: inherit;
                    color: inherit;
                    border-bottom: 1px solid black;
                }
                .ch-wrap {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(190px, 22vw);
                    align-items: stretch;
                    max-width: 100%;
                    min-height: calc(max(310px, 42vw) + max(9.4rem, calc(clamp(6.5rem, 9vw, 8rem) + clamp(1.9rem, 4vw, 2.7rem))));
                    margin: 0 auto;
                    padding: 0;
                    box-sizing: border-box;
                    background: var(--bg, #f8f4f0);
                }
                .ch-stage {
                    min-width: 0;
                    display: grid;
                    grid-template-rows: minmax(310px, 42vw) auto;
                }
                .ch-media {
                    position: relative;
                    background: #080808;
                    overflow: hidden;
                    min-height: 310px;
                }
                .ch-media::before {
                    content: "";
                    position: absolute;
                    z-index: 1;
                    inset: 0 auto clamp(2.8rem, 5vw, 3.4rem) 0;
                    width: min(58rem, 68%);
                    pointer-events: none;
                    background:
                        linear-gradient(90deg, #000 0%, rgba(0, 0, 0, 0.78) 38%, rgba(0, 0, 0, 0) 100%);
                    -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 78%, rgba(0, 0, 0, 0) 100%);
                    mask-image: linear-gradient(180deg, #000 0%, #000 78%, rgba(0, 0, 0, 0) 100%);
                    opacity: 0.72;
                    transition: opacity 260ms ease;
                }
                .ch-media.is-playing::before {
                    opacity: 0;
                }
                .ch-media video {
                    position: relative;
                    z-index: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                    min-height: 310px;
                }
                .ch-media video::-webkit-media-controls-enclosure {
                    z-index: 4;
                }
                .ch-copy {
                    position: absolute;
                    z-index: 2;
                    top: clamp(1rem, 2.2vw, 1.45rem);
                    left: clamp(1rem, 2.2vw, 1.45rem);
                    display: flex;
                    flex-direction: column;
                    gap: 0.72rem;
                    max-width: min(31rem, 56vw);
                    color: #fff;
                    text-shadow: 0 1px 18px rgba(0,0,0,0.45);
                    opacity: 1;
                    visibility: visible;
                    transition: opacity 260ms ease, visibility 260ms ease;
                }
                .ch-copy.is-hidden {
                    opacity: 0;
                    visibility: hidden;
                    pointer-events: none;
                }
                .ch-kicker {
                    font-size: clamp(0.68rem, 0.9vw, 0.78rem);
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    font-variation-settings: var(--fv-label);
                    color: inherit;
                    opacity: 0.78;
                }
                .ch-headline {
                    font-size: clamp(1.55rem, 3vw, 2.35rem);
                    line-height: 1.12;
                    font-variation-settings: var(--fv-title-medium-wide);
                    letter-spacing: 0.02em;
                    color: inherit;
                }
                .ch-body {
                    font-size: clamp(0.86rem, 1vw, 1rem);
                    line-height: 1.55;
                    max-width: 27rem;
                    font-variation-settings: var(--fv-body);
                    color: inherit;
                    opacity: 0.92;
                }
                .ch-copy.ch-copy--has-video .ch-kicker,
                .ch-copy.ch-copy--has-video .ch-headline,
                .ch-copy.ch-copy--has-video .ch-body {
                    cursor: pointer;
                }
                .ch-cta-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    align-self: flex-start;
                    margin-top: 0.5rem;
                }
                .ch-cta {
                    padding: 0.72rem 1.25rem;
                    border: 1px solid rgba(255,255,255,0.78);
                    background: rgba(0,0,0,0.28);
                    color: #fff;
                    font-size: clamp(0.72rem, 0.95vw, 0.82rem);
                    letter-spacing: 0.06em;
                    font-variation-settings: var(--fv-cta);
                    cursor: pointer;
                    border-radius: 2px;
                }
                .ch-cta:hover { background: rgba(255,255,255,0.12); }
                .ch-cta--secondary {
                    background: transparent;
                    border-color: rgba(255,255,255,0.42);
                }
                .ch-cta--secondary:hover { background: rgba(255,255,255,0.08); }
                .ch-locked {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    min-height: 240px;
                    padding: 1.5rem;
                    color: #fff;
                    text-align: center;
                    font-size: 0.9rem;
                    background: rgba(0,0,0,0.42);
                }
                .ch-unlock-note {
                    margin-top: -0.35rem;
                    color: inherit;
                    opacity: 0.72;
                    font-size: 0.82rem;
                    line-height: 1.35;
                    font-variation-settings: var(--fv-caption);
                }
                .ch-overlay {
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 3;
                    padding: 0.8rem 1rem 3.25rem;
                    background: linear-gradient(transparent, rgba(0,0,0,0.65));
                    color: #fff;
                    font-size: clamp(0.78rem, 1vw, 0.88rem);
                    font-variation-settings: var(--fv-caption);
                    display: flex;
                    flex-wrap: wrap;
                    align-items: flex-end;
                    gap: 0.5rem 1rem;
                    transition: opacity 260ms ease, visibility 260ms ease;
                    pointer-events: none;
                }
                .ch-overlay.is-hidden {
                    opacity: 0;
                    visibility: hidden;
                }
                .ch-overlay.ch-overlay--interactive {
                    pointer-events: auto;
                    cursor: pointer;
                }
                .ch-overlay > span {
                    pointer-events: auto;
                    cursor: pointer;
                }
                .ch-overlay strong { font-variation-settings: var(--fv-subtitle); }
                .ch-topic-overlay {
                    position: absolute;
                    z-index: 3;
                    top: clamp(1rem, 2.2vw, 1.45rem);
                    left: 50%;
                    transform: translateX(-50%) translateY(-0.35rem);
                    max-width: min(32rem, calc(100% - 2rem));
                    padding: 0.8rem 1rem;
                    border: 1px solid rgba(255,255,255,0.42);
                    background: rgba(0,0,0,0.62);
                    color: #fff;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 500ms ease-in-out, transform 500ms ease-in-out;
                    text-align: center;
                }
                .ch-topic-overlay.is-visible {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
                .ch-topic-overlay strong {
                    display: block;
                    font-size: clamp(0.95rem, 1.4vw, 1.18rem);
                    font-variation-settings: var(--fv-nav-active);
                }
                .ch-topic-overlay span {
                    display: block;
                    margin-top: 0.25rem;
                    font-size: clamp(0.78rem, 1vw, 0.92rem);
                    line-height: 1.35;
                    font-variation-settings: var(--fv-nav);
                }
                .ch-rail {
                    align-self: stretch;
                    box-sizing: border-box;
                    background: #151515;
                    color: #fff;
                    min-width: 0;
                    height: var(--ch-rail-max-height, 100%);
                    min-height: 0;
                    max-height: var(--ch-rail-max-height, calc(max(310px, 42vw) + max(9.4rem, calc(clamp(6.5rem, 9vw, 8rem) + clamp(1.9rem, 4vw, 2.7rem)))));
                    padding: clamp(0.9rem, 1.5vw, 1.15rem);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .ch-rail-title {
                    padding: 0 0 0.7rem;
                    font-size: 0.68rem;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    font-variation-settings: var(--fv-label);
                    opacity: 0.86;
                }
                .ch-tabs {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 0.4rem;
                    margin-bottom: 0.72rem;
                }
                .ch-tab {
                    border: 1px solid rgba(255,255,255,0.24);
                    background: transparent;
                    color: rgba(255,255,255,0.74);
                    padding: 0.46rem 0.5rem;
                    cursor: pointer;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    font-size: 0.62rem;
                    font-variation-settings: var(--fv-nav-active);
                }
                .ch-tab.is-active,
                .ch-tab:hover {
                    background: rgba(255,255,255,0.1);
                    color: #fff;
                }
                .ch-tab:disabled {
                    opacity: 0.34;
                    cursor: not-allowed;
                }
                .ch-chapters {
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    overflow-x: hidden;
                    overscroll-behavior: contain;
                    padding-right: 0.25rem;
                    scrollbar-width: thin;
                    scrollbar-color: var(--c2, #000) var(--bg, #faf3f4);
                    scrollbar-gutter: stable;
                }
                .ch-chapters::-webkit-scrollbar {
                    width: 6px;
                }
                .ch-chapters::-webkit-scrollbar-track {
                    background-color: var(--bg, #faf3f4);
                }
                .ch-chapters::-webkit-scrollbar-thumb {
                    background: var(--c2, #000);
                    border-radius: 5px;
                }
                .ch-chapters[hidden] { display: none; }
                .ch-chapter {
                    display: grid;
                    grid-template-columns: 3.6rem minmax(0, 1fr) auto;
                    gap: 0.65rem;
                    align-items: center;
                    width: 100%;
                    min-height: 3.45rem;
                    padding: 0.55rem 0;
                    border: 0;
                    border-top: 1px solid rgba(255,255,255,0.12);
                    background: transparent;
                    color: inherit;
                    text-align: left;
                    cursor: pointer;
                }
                .ch-chapter.is-active,
                .ch-chapter:hover {
                    background: rgba(255,255,255,0.08);
                }
                .ch-chapter__thumb {
                    width: 3.4rem;
                    aspect-ratio: 1;
                    border-radius: 2px;
                    background: rgba(255,255,255,0.12) center/cover no-repeat;
                }
                .ch-chapter__copy {
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                    gap: 0.12rem;
                }
                .ch-chapter strong {
                    font-size: 0.78rem;
                    line-height: 1.1;
                    font-variation-settings: var(--fv-subtitle);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .ch-chapter small,
                .ch-chapter time {
                    font-size: 0.62rem;
                    line-height: 1.1;
                    color: rgba(255,255,255,0.68);
                    font-variation-settings: var(--fv-caption);
                }
                .ch-topic {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) auto;
                    gap: 0.7rem;
                    align-items: center;
                    width: 100%;
                    min-height: 3.45rem;
                    padding: 0.62rem 0;
                    border: 0;
                    border-top: 1px solid rgba(255,255,255,0.12);
                    background: transparent;
                    color: inherit;
                    text-align: left;
                    cursor: pointer;
                }
                .ch-topic.is-active,
                .ch-topic:hover {
                    background: rgba(255,255,255,0.08);
                }
                .ch-topic__copy {
                    display: flex;
                    flex-direction: column;
                    gap: 0.16rem;
                    min-width: 0;
                }
                .ch-topic strong {
                    font-size: 0.78rem;
                    line-height: 1.18;
                    font-variation-settings: var(--fv-nav-active);
                }
                .ch-topic small,
                .ch-topic time {
                    font-size: 0.62rem;
                    line-height: 1.2;
                    color: rgba(255,255,255,0.68);
                    font-variation-settings: var(--fv-caption);
                }
                .ch-profile {
                    display: grid;
                    grid-template-columns: minmax(260px, 0.42fr) minmax(0, 0.2fr) minmax(280px, 0.38fr);
                    gap: clamp(1.2rem, 3vw, 2rem);
                    align-items: center;
                    min-height: 9.4rem;
                    padding: clamp(0.95rem, 2vw, 1.35rem) clamp(1rem, 3vw, 2rem);
                    color: var(--c2, #111);
                    background: var(--bg, #f8f4f0);
                    opacity: 1;
                    transition: opacity 500ms ease-in-out;
                }
                .ch-profile.is-transitioning {
                    opacity: 0;
                }
                .ch-profile__intro {
                    display: grid;
                    grid-template-columns: clamp(6.5rem, 9vw, 8rem) minmax(0, 1fr);
                    gap: clamp(1rem, 2vw, 1.35rem);
                    align-items: center;
                }
                .ch-profile__avatar {
                    width: clamp(6.5rem, 9vw, 8rem);
                    aspect-ratio: 1;
                    border-radius: 50%;
                    background: #ddd center/cover no-repeat;
                }
                .ch-profile h2 {
                    margin: 0 0 0.25rem;
                    font-size: clamp(1rem, 1.4vw, 1.28rem);
                    font-variation-settings: var(--fv-nav-active);
                }
                .ch-profile p {
                    margin: 0;
                    font-size: 0.78rem;
                    line-height: 1.45;
                    font-variation-settings: var(--fv-nav);
                }
                .ch-profile__role {
                    font-variation-settings: var(--fv-nav-active);
                    letter-spacing: 0.01em;
                    font-weight: 750;
                }
                .ch-profile__link {
                    display: inline-flex;
                    width: fit-content;
                    margin-top: 0.9rem;
                    padding: 0.72rem 1rem;
                    border: 1px solid currentColor;
                    color: inherit;
                    text-decoration: none;
                    font-size: 0.66rem;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    font-variation-settings: var(--fv-nav-active);
                }
                .ch-profile__meta {
                    align-self: stretch;
                    padding-left: clamp(1rem, 2vw, 1.5rem);
                    border-left: 1px solid rgba(0,0,0,0.28);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 0.8rem;
                    font-size: 0.72rem;
                    line-height: 1.35;
                    font-variation-settings: var(--fv-nav);
                }
                .ch-profile__meta strong {
                    display: block;
                    margin-bottom: 0.12rem;
                    font-variation-settings: var(--fv-nav-active);
                }
                .ch-profile__art {
                    width: 100%;
                    aspect-ratio: 16 / 9;
                    background: #ddd center/cover no-repeat;
                }
                @media (max-width: 900px) {
                    .ch-wrap {
                        grid-template-columns: 1fr;
                        height: auto;
                        max-height: none;
                    }
                    .ch-stage { grid-template-rows: auto auto; }
                    .ch-media,
                    .ch-media video { min-height: 420px; }
                    .ch-copy { max-width: calc(100vw - 2rem); }
                    .ch-rail {
                        max-height: none;
                        height: auto;
                        overflow: visible;
                        padding: clamp(1rem, 3vw, 1.4rem);
                    }
                    .ch-chapters {
                        display: grid;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        gap: 0 1.1rem;
                    }
                    .ch-chapter {
                        grid-template-columns: 2.8rem minmax(0, 1fr) auto;
                        min-height: 3.8rem;
                    }
                    .ch-profile {
                        grid-template-columns: 1fr;
                        gap: 1.15rem;
                        padding: clamp(1.35rem, 5vw, 2rem);
                    }
                    .ch-profile__intro {
                        grid-template-columns: 1fr;
                        justify-items: start;
                        align-items: start;
                    }
                    .ch-profile__avatar { width: clamp(7rem, 28vw, 9rem); }
                    .ch-profile h2 { font-size: clamp(1.22rem, 4vw, 1.65rem); }
                    .ch-profile p {
                        font-size: clamp(0.94rem, 3.2vw, 1.08rem);
                        line-height: 1.5;
                    }
                    .ch-profile__role { font-size: clamp(0.98rem, 3.3vw, 1.12rem); }
                    .ch-profile__meta {
                        border-left: 0;
                        padding-left: 0;
                        font-size: clamp(0.9rem, 3vw, 1rem);
                        line-height: 1.45;
                    }
                    .ch-profile__link { font-size: 0.74rem; }
                }
                @media (max-width: 640px) {
                    .ch-media,
                    .ch-media video { min-height: 520px; }
                    .ch-chapters { grid-template-columns: 1fr; }
                    .ch-chapter {
                        grid-template-columns: 3rem minmax(0, 1fr) auto;
                        min-height: 4rem;
                    }
                    .ch-chapter__thumb { width: 2.75rem; }
                    .ch-chapter strong { font-size: 0.9rem; }
                    .ch-chapter small,
                    .ch-chapter time { font-size: 0.72rem; }
                    .ch-topic {
                        min-height: 4rem;
                        padding: 0.7rem 0;
                    }
                    .ch-topic strong { font-size: 0.9rem; }
                    .ch-topic small,
                    .ch-topic time { font-size: 0.72rem; }
                    .ch-profile__avatar { width: min(9rem, 46vw); }
                }
            </style>
            <div class="ch-wrap">
                <div class="ch-stage">
                    <div class="ch-media">
                        ${videoUrl ? `<video id="chVideo" class="ch-video" playsinline controls controlsList="nodownload" aria-label="${esc(chVideoLabel)}" title="${esc(chVideoLabel)}" ${posterUrl ? `poster="${esc(posterUrl)}"` : ''} src="${esc(videoUrl)}"></video>` : `<div class="ch-locked">${esc(emptyCopy)}</div>`}
                        <div id="ch-copy" class="ch-copy${videoUrl ? ' ch-copy--has-video' : ''}">
                            <div class="ch-kicker">${esc(kicker)}</div>
                            <h1 class="ch-headline">${esc(headline)}</h1>
                            <p class="ch-body">${esc(body)}</p>
                            ${this._unlockError ? `<p class="ch-unlock-note">${esc(this._unlockError)}</p>` : ''}
                            ${fullVideoKey && !canWatch ? `<p class="ch-unlock-note">Preview available. Join the community to unlock the full video.</p>` : ''}
                            <div class="ch-cta-row">
                                ${showDualCtas
                                    ? `<button type="button" class="ch-cta" id="chPrimary">${esc(loc === 'ja' ? 'プレビューを見る' : 'WATCH PREVIEW')}</button>
                                       <button type="button" class="ch-cta ch-cta--secondary" id="chJoinCta">${esc(loc === 'ja' ? 'ネットワークに参加' : 'JOIN NETWORK')}</button>`
                                    : `<button type="button" class="ch-cta" id="chPrimary">${esc(canWatch ? watchLabel : joinLabel)}</button>`
                                }
                            </div>
                        </div>
                        <div class="ch-overlay${videoUrl ? ' ch-overlay--interactive' : ''}"${videoUrl ? ` role="button" tabindex="0" aria-label="${esc(canWatch ? watchLabel : (showDualCtas ? (loc === 'ja' ? 'プレビューを見る' : 'Watch preview') : joinLabel))}"` : ''}>
                            ${overlayTitle ? `<span><strong>${esc(overlayTitle)}</strong></span>` : ''}
                            ${overlayGuests ? `<span>${esc(overlayGuests)}</span>` : ''}
                            ${overlayDuration ? `<span>${esc(overlayDuration)}</span>` : ''}
                        </div>
                        <div id="chTopicOverlay" class="ch-topic-overlay" aria-live="polite"></div>
                    </div>
                    ${profileMarkup(activeChapter)}
                </div>
                <aside class="ch-rail" aria-label="Chapters">
                    <div class="ch-rail-title">Chapters</div>
                    <div class="ch-tabs" role="tablist" aria-label="Chapter type">
                        <button type="button" class="ch-tab ${this._activeChapterTab === 'people' ? 'is-active' : ''}" data-chapter-tab="people" role="tab" aria-selected="${this._activeChapterTab === 'people' ? 'true' : 'false'}">People</button>
                        <button type="button" class="ch-tab ${this._activeChapterTab === 'ideas' ? 'is-active' : ''}" data-chapter-tab="ideas" role="tab" aria-selected="${this._activeChapterTab === 'ideas' ? 'true' : 'false'}" ${topics.length ? '' : 'disabled'}>Ideas</button>
                    </div>
                    <div class="ch-chapters" data-chapter-panel="people" ${this._activeChapterTab === 'people' ? '' : 'hidden'}>
                        ${chapterButtons || '<div class="ch-locked">Add artist timestamps in Studio.</div>'}
                    </div>
                    <div class="ch-chapters" data-chapter-panel="ideas" ${this._activeChapterTab === 'ideas' ? '' : 'hidden'}>
                        ${topicButtons || '<div class="ch-locked">Add idea timestamps in Studio.</div>'}
                    </div>
                </aside>
                </div>
        `;

        const btn = this.shadow.querySelector('#chPrimary');
        const vid = /** @type {HTMLVideoElement | null} */ (this.shadow.querySelector('#chVideo'));
        const media = this.shadow.querySelector('.ch-media');
        const copy = this.shadow.querySelector('#ch-copy');
        const overlay = this.shadow.querySelector('.ch-overlay');
        const topicOverlay = /** @type {HTMLElement | null} */ (this.shadow.querySelector('#chTopicOverlay'));
        const syncRailHeight = () => {
            const stage = /** @type {HTMLElement | null} */ (this.shadow.querySelector('.ch-stage'));
            const rail = /** @type {HTMLElement | null} */ (this.shadow.querySelector('.ch-rail'));
            if (!stage || !rail) return;
            rail.style.setProperty('--ch-rail-max-height', `${Math.ceil(stage.getBoundingClientRect().height)}px`);
        };
        const syncCopyVisibility = () => {
            const playing = Boolean(vid && !vid.paused && !vid.ended);
            copy?.classList.toggle('is-hidden', playing);
            overlay?.classList.toggle('is-hidden', playing);
            media?.classList.toggle('is-playing', playing);
        };
        const syncProfileArtFallback = () => {
            const art = /** @type {HTMLElement | null} */ (this.shadow.querySelector('.ch-profile__art'));
            if (!art) return;
            const artUrl = String(art.getAttribute('data-art-url') || '').trim();
            const profileUrl = String(art.getAttribute('data-profile-url') || '').trim();
            if (!artUrl || !profileUrl || artUrl === profileUrl) return;
            const img = new Image();
            img.addEventListener('error', () => {
                art.style.backgroundImage = `url(${JSON.stringify(profileUrl)})`;
            }, { once: true });
            img.src = artUrl;
        };
        const syncTabUi = () => {
            this.shadow.querySelectorAll('[data-chapter-tab]').forEach((tab) => {
                const key = tab.getAttribute('data-chapter-tab') || 'people';
                const active = key === this._activeChapterTab;
                tab.classList.toggle('is-active', active);
                tab.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            this.shadow.querySelectorAll('[data-chapter-panel]').forEach((panel) => {
                const key = panel.getAttribute('data-chapter-panel') || 'people';
                panel.toggleAttribute('hidden', key !== this._activeChapterTab);
            });
        };
        const syncActiveTopicUi = () => {
            this.shadow.querySelectorAll('.ch-topic').forEach((topicBtn) => {
                const idx = Number(topicBtn.getAttribute('data-topic-index') ?? 0);
                const active = idx === this._activeTopicIndex;
                topicBtn.classList.toggle('is-active', active);
                topicBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
        };
        const showTopicOverlay = (topic) => {
            if (!topicOverlay || !topic) return;
            if (this._topicOverlayTimer) {
                window.clearTimeout(this._topicOverlayTimer);
                this._topicOverlayTimer = 0;
            }
            topicOverlay.innerHTML = `
                <strong>${esc(topic.title)}</strong>
                ${topic.quote ? `<span>${esc(topic.quote)}</span>` : ''}
            `;
            topicOverlay.classList.add('is-visible');
            this._topicOverlayTimer = window.setTimeout(() => {
                topicOverlay.classList.remove('is-visible');
                this._topicOverlayTimer = 0;
            }, 2200);
        };
        const syncActiveChapterUi = () => {
            this.shadow.querySelectorAll('.ch-chapter').forEach((chapterBtn) => {
                const idx = Number(chapterBtn.getAttribute('data-chapter-index') ?? 0);
                const active = idx === this._activeChapterIndex;
                chapterBtn.classList.toggle('is-active', active);
                chapterBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
            const stage = this.shadow.querySelector('.ch-stage');
            if (!stage) return;
            const html = profileMarkup(chapters[this._activeChapterIndex]);
            const existing = this.shadow.querySelector('.ch-profile');
            if (this._profileTransitionTimer) {
                window.clearTimeout(this._profileTransitionTimer);
                this._profileTransitionTimer = 0;
            }
            if (!existing) {
                if (html) {
                    stage.insertAdjacentHTML('beforeend', html);
                    const next = this.shadow.querySelector('.ch-profile');
                    next?.classList.add('is-transitioning');
                    syncProfileArtFallback();
                    requestAnimationFrame(() => {
                        next?.classList.remove('is-transitioning');
                        syncRailHeight();
                    });
                }
                return;
            }
            existing.classList.add('is-transitioning');
            this._profileTransitionTimer = window.setTimeout(() => {
                existing.remove();
                if (html) {
                    stage.insertAdjacentHTML('beforeend', html);
                    const next = this.shadow.querySelector('.ch-profile');
                    next?.classList.add('is-transitioning');
                    syncProfileArtFallback();
                    requestAnimationFrame(() => {
                        next?.classList.remove('is-transitioning');
                        syncRailHeight();
                    });
                }
                this._profileTransitionTimer = 0;
                syncRailHeight();
            }, 500);
        };
        syncProfileArtFallback();
        syncRailHeight();
        requestAnimationFrame(syncRailHeight);
        if (typeof ResizeObserver !== 'undefined') {
            if (this._railResizeObserver) this._railResizeObserver.disconnect();
            const stage = /** @type {HTMLElement | null} */ (this.shadow.querySelector('.ch-stage'));
            this._railResizeObserver = new ResizeObserver(syncRailHeight);
            if (stage) this._railResizeObserver.observe(stage);
        }
        syncTabUi();
        syncActiveTopicUi();
        if (vid && signedFullReady) {
            vid.addEventListener('error', () => {
                captureCommunityEvent('community_hero_full_video_playback_failed', trackingBase());
                this._fullPlaybackFailed = true;
                this._unlockError = 'Full video could not load. Showing preview instead.';
                this.render(canWatch);
            }, { once: true });
        }
        const openJoinModal = (trigger) => {
            captureCommunityEvent('community_hero_unlock_clicked', {
                ...trackingBase(),
                trigger,
            });
            window.dispatchEvent(new CustomEvent('fusion-open-join-network', { detail: {} }));
        };
        const requestHeroPlayback = (trigger) => {
            if (!vid) return;
            if (!canWatch) {
                if (hasGuestPreview) {
                    captureCommunityEvent('community_hero_video_toggled', {
                        ...trackingBase(),
                        action: vid.paused || vid.ended ? 'play' : 'pause',
                        trigger,
                    });
                    if (vid.paused || vid.ended) {
                        try {
                            void vid.play();
                        } catch {
                            /* autoplay policy */
                        }
                    } else {
                        vid.pause();
                    }
                    vid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
                openJoinModal(trigger);
                return;
            }
            if (canWatch && fullVideoKey && !signedFullReady) {
                captureCommunityEvent('community_hero_full_video_unlock_requested', {
                    ...trackingBase(),
                    trigger,
                });
                this._requestFullVideoUnlock();
                return;
            }
            captureCommunityEvent('community_hero_watch_clicked', {
                ...trackingBase(),
                trigger,
            });
            try {
                void vid.play();
            } catch {
                /* autoplay policy */
            }
            vid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
        if (vid) {
            vid.addEventListener('play', syncCopyVisibility);
            vid.addEventListener('pause', syncCopyVisibility);
            vid.addEventListener('ended', () => {
                if (videoUrl) {
                    captureCommunityEvent('community_hero_video_completed', trackingBase());
                }
                try {
                    vid.pause();
                    vid.currentTime = 0;
                    if (posterUrl) vid.load();
                } catch {
                    /* media reset best effort */
                }
                syncCopyVisibility();
            });
            const isNativeControlTarget = (event) => {
                const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
                return path.some(
                    (node) =>
                        node instanceof Element
                        && (node.classList?.contains('webkit-media-controls-enclosure')
                            || node.getAttribute?.('pseudo') === '-webkit-media-controls'
                            || node.tagName === 'INPUT'
                            || node.tagName === 'BUTTON'),
                );
            };
            vid.addEventListener('click', (event) => {
                const rect = vid.getBoundingClientRect();
                const controlsBand = Math.max(48, rect.height * 0.16);
                if (event.clientY >= rect.bottom - controlsBand || isNativeControlTarget(event)) return;
                if (!videoUrl && !canWatch) {
                    captureCommunityEvent('community_hero_unlock_clicked', {
                        ...trackingBase(),
                        trigger: 'video_surface',
                    });
                    window.dispatchEvent(new CustomEvent('fusion-open-join-network', { detail: {} }));
                    return;
                }
                if (canWatch && fullVideoKey && !signedFullReady) {
                    captureCommunityEvent('community_hero_full_video_unlock_requested', {
                        ...trackingBase(),
                        trigger: 'video_surface',
                    });
                    void this._requestFullVideoUnlock();
                    return;
                }
                captureCommunityEvent('community_hero_video_toggled', {
                    ...trackingBase(),
                    action: vid.paused || vid.ended ? 'play' : 'pause',
                    trigger: 'video_surface',
                });
                if (vid.paused || vid.ended) {
                    try {
                        void vid.play();
                    } catch {
                        /* autoplay policy */
                    }
                } else {
                    vid.pause();
                }
            });
            syncCopyVisibility();
        }
        if (copy instanceof HTMLElement && vid) {
            copy.addEventListener('click', (event) => {
                if (!(event.target instanceof Element)) return;
                if (event.target.closest('#chPrimary, .ch-unlock-note, button')) return;
                if (!event.target.closest('.ch-kicker, .ch-headline, .ch-body')) return;
                event.preventDefault();
                event.stopPropagation();
                requestHeroPlayback('hero_copy_text');
            });
        }
        if (overlay instanceof HTMLElement && vid) {
            overlay.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                requestHeroPlayback('overlay_text');
            });
            overlay.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                requestHeroPlayback('overlay_text');
            });
        }
        if (btn instanceof HTMLButtonElement) {
            btn.addEventListener('click', () => {
                if (showDualCtas) {
                    requestHeroPlayback('watch_preview_cta');
                } else if (canWatch) {
                    requestHeroPlayback('primary_cta');
                } else {
                    openJoinModal('primary_cta');
                }
            });
        }
        const joinBtn = this.shadow.querySelector('#chJoinCta');
        if (joinBtn instanceof HTMLButtonElement) {
            joinBtn.addEventListener('click', () => {
                openJoinModal('join_cta');
            });
        }
        this.shadow.querySelectorAll('[data-chapter-tab]').forEach((tab) => {
            tab.addEventListener('click', () => {
                const key = tab.getAttribute('data-chapter-tab') || 'people';
                if (key === 'ideas' && topics.length === 0) return;
                this._activeChapterTab = key === 'ideas' ? 'ideas' : 'people';
                captureCommunityEvent('community_hero_timestamp_tab_clicked', {
                    ...trackingBase(),
                    tab: this._activeChapterTab,
                    people_count: chapters.length,
                    idea_count: topics.length,
                });
                syncTabUi();
                if (this._activeChapterTab === 'people') syncActiveChapterUi();
                if (this._activeChapterTab === 'ideas') syncActiveTopicUi();
            });
        });
        this.shadow.querySelectorAll('.ch-chapter').forEach((chapterBtn) => {
            chapterBtn.addEventListener('click', () => {
                const idx = Number(chapterBtn.getAttribute('data-chapter-index') ?? 0);
                const chapter = chapters[idx];
                if (!chapter) return;
                this._activeChapterIndex = idx;
                this.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (!canWatch && fullVideoKey && !hasGuestPreview) {
                    captureCommunityEvent('community_hero_unlock_clicked', {
                        ...trackingBase(),
                        trigger: 'people_timestamp',
                        timestamp_index: idx,
                        timestamp_sec: chapter.timestampSec,
                    });
                    window.dispatchEvent(new CustomEvent('fusion-open-join-network', { detail: {} }));
                    syncActiveChapterUi();
                    return;
                }
                if (canWatch && fullVideoKey && !signedFullReady) {
                    captureCommunityEvent('community_hero_full_video_unlock_requested', {
                        ...trackingBase(),
                        trigger: 'people_timestamp',
                        timestamp_index: idx,
                        timestamp_sec: chapter.timestampSec,
                    });
                    void this._requestFullVideoUnlock();
                    syncActiveChapterUi();
                    return;
                }
                captureCommunityEvent('community_hero_timestamp_clicked', {
                    ...trackingBase(),
                    timestamp_type: 'people',
                    timestamp_index: idx,
                    timestamp_sec: chapter.timestampSec,
                });
                if (vid) {
                    vid.currentTime = chapter.timestampSec;
                    try {
                        void vid.play();
                    } catch {
                        /* autoplay policy */
                    }
                }
                syncActiveChapterUi();
            });
        });
        this.shadow.querySelectorAll('.ch-topic').forEach((topicBtn) => {
            topicBtn.addEventListener('click', () => {
                const idx = Number(topicBtn.getAttribute('data-topic-index') ?? 0);
                const topic = topics[idx];
                if (!topic) return;
                this._activeTopicIndex = idx;
                this._activeChapterTab = 'ideas';
                this.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (!canWatch && fullVideoKey && !hasGuestPreview) {
                    captureCommunityEvent('community_hero_unlock_clicked', {
                        ...trackingBase(),
                        trigger: 'idea_timestamp',
                        timestamp_index: idx,
                        timestamp_sec: topic.timestampSec,
                    });
                    window.dispatchEvent(new CustomEvent('fusion-open-join-network', { detail: {} }));
                    syncTabUi();
                    syncActiveTopicUi();
                    showTopicOverlay(topic);
                    return;
                }
                if (canWatch && fullVideoKey && !signedFullReady) {
                    captureCommunityEvent('community_hero_full_video_unlock_requested', {
                        ...trackingBase(),
                        trigger: 'idea_timestamp',
                        timestamp_index: idx,
                        timestamp_sec: topic.timestampSec,
                    });
                    void this._requestFullVideoUnlock();
                    syncTabUi();
                    syncActiveTopicUi();
                    showTopicOverlay(topic);
                    return;
                }
                captureCommunityEvent('community_hero_timestamp_clicked', {
                    ...trackingBase(),
                    timestamp_type: 'idea',
                    timestamp_index: idx,
                    timestamp_sec: topic.timestampSec,
                });
                if (vid) {
                    vid.currentTime = topic.timestampSec;
                    try {
                        void vid.play();
                    } catch {
                        /* autoplay policy */
                    }
                }
                syncTabUi();
                syncActiveTopicUi();
                showTopicOverlay(topic);
            });
        });
        this.shadow.querySelector('.ch-profile__link')?.addEventListener('click', (event) => {
            const href = event.currentTarget instanceof HTMLAnchorElement ? event.currentTarget.href : '';
            captureCommunityEvent('community_hero_artist_profile_clicked', {
                ...trackingBase(),
                ...communityDestinationProps(href),
            });
        });
        if (vid && (chapters.length > 0 || topics.length > 0)) {
            vid.addEventListener('timeupdate', () => {
                const current = vid.currentTime || 0;
                let next = 0;
                chapters.forEach((chapter, i) => {
                    if (current >= chapter.timestampSec) next = i;
                });
                if (next !== this._activeChapterIndex) {
                    this._activeChapterIndex = next;
                    if (this._activeChapterTab === 'people') syncActiveChapterUi();
                }
                let nextTopic = 0;
                topics.forEach((topic, i) => {
                    if (current >= topic.timestampSec) nextTopic = i;
                });
                if (topics.length && nextTopic !== this._activeTopicIndex) {
                    this._activeTopicIndex = nextTopic;
                    if (this._activeChapterTab === 'ideas') syncActiveTopicUi();
                }
            });
        }
    }
}

customElements.define('app-community-hero', CommunityHero);
export { CommunityHero };
