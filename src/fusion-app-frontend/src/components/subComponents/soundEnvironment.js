import { getSoundEnvironmentPublic, getJournalEntries } from '../../utils/database.js';
import { artistLocaleBlock, artistDisplayName } from '../../utils/artistSlug.js';
import { escapeHtml } from '../../utils/textPreview.js';
import { navigate } from '../../router.js';

const LS = 'fusion-sound-env-v1';
const DUCK = 0.45;

/**
 * @returns {Record<string, number|boolean|undefined>}
 */
function readLocalMix() {
    try {
        const t = localStorage.getItem(LS);
        if (!t) return {};
        const o = JSON.parse(t);
        return o && typeof o === 'object' ? o : {};
    } catch {
        return {};
    }
}

/**
 * @param {Record<string, unknown>} p
 */
function writeLocalMix(p) {
    try {
        const cur = readLocalMix();
        localStorage.setItem(LS, JSON.stringify({ ...cur, ...p, updated: Date.now() }));
    } catch {
        /* ignore */
    }
}

/**
 * Same display string as the profile h1.artist-profile-name: locale `name`, else first+last, else title case from `slug` (see profile.js and artistDisplayName).
 * @param {object|undefined} artist
 * @param {string} [rawFallback]
 * @returns {string}
 */
function formatVoiceArtistDisplayName(artist, rawFallback = '') {
    if (!artist || typeof artist !== 'object') {
        return String(rawFallback || '').trim() || 'Artist';
    }
    const locale =
        typeof window !== 'undefined' && typeof window.getLocale === 'function' ? window.getLocale() : 'en';
    const loc = artistLocaleBlock(artist, locale);
    if (loc) {
        const n = String(loc.name ?? '').trim();
        if (n) return n;
        const fn = String(loc.firstName ?? '').trim();
        const ln = String(loc.lastName ?? '').trim();
        const joined = [fn, ln].filter(Boolean).join(' ');
        if (joined) return joined;
    }
    const fromSlug = artistDisplayName(artist, locale);
    if (fromSlug) return fromSlug;
    return String(rawFallback || '').trim() || 'Artist';
}

class SoundEnvironment extends HTMLElement {
    constructor() {
        super();
        this._shadow = this.attachShadow({ mode: 'open' });
        this._atmo = null;
        this._voice = null;
        this._config = null;
        this._learnHref = '/journal';
        /** `true` only when Studio configured a learn-more journal entry and we resolved a link. */
        this._hasLearnMoreLink = false;
        this._entered = false;
        this._masterOn = true;
        this._scheduleTimer = null;
        this._scheduling = false;
        this._atmoDucked = false;
        /** @type {null | (() => void)} */
        this._boundLabelSync = null;
        /** Artist ids left to play this shuffle round (random order, no repeat until round completes). */
        this._voiceRoundDeck = [];
        /** Last artist id whose voice clip played (avoids same pick at start of next round when possible). */
        this._lastPlayedVoiceArtistId = null;
        /** Sorted id signature of the voice pool; when it changes, the deck is reset. */
        this._voicePoolSig = '';
        /** Set once: `_bindUi` is only attached from `_renderShell` (not again after async `_boot`). */
        this._uiListenersBound = false;
        /** Fires when `#header[active]` is set after this component mounts (SPA remount; `fusion-site-entered` already ran). */
        this._headerActiveObserver = null;
    }

    connectedCallback() {
        this._renderShell();
        void this._boot();
    }

    disconnectedCallback() {
        this._stopSchedule();
        window.removeEventListener('fusion-site-entered', this._boundEnter);
        this._detachMediaLabelListeners();
        this._teardownHeaderActiveObserver();
    }

    _stopSchedule() {
        if (this._scheduleTimer) {
            clearTimeout(this._scheduleTimer);
            this._scheduleTimer = null;
        }
    }

    async _boot() {
        /* Do not call `_onSiteEnter` here before `_buildAudio` — `this._atmo` is still null. */
        this._boundEnter = () => this._enterIfHeaderReady();
        window.addEventListener('fusion-site-entered', this._boundEnter);
        const cfg = await getSoundEnvironmentPublic();
        this._config = /** @type {Record<string, unknown>} */ (cfg);
        if (!cfg || !cfg.enabled) {
            this.setAttribute('hidden', '');
            return;
        }
        this.removeAttribute('hidden');
        this._hasLearnMoreLink = false;
        this._learnHref = '';
        const id = cfg.learnMoreJournalEntryId ? String(cfg.learnMoreJournalEntryId) : '';
        if (id) {
            const entries = await getJournalEntries().catch(() => []);
            const j = (Array.isArray(entries) ? entries : []).find((e) => String(e?.id ?? '') === id);
            const link = j?.link ? String(j.link) : '';
            if (link) {
                this._hasLearnMoreLink = true;
                this._learnHref = link.startsWith('http') ? link : (link.startsWith('/') ? link : `/${link}`);
            }
        }
        this._buildAudio(cfg);
        this._attachMediaLabelListeners();
        this._setHeadTitle();
        this._fillSlidersFromConfig();
        this._applyLocalMix();
        this._updateLearnLink();
        this._syncSoundHeadLabel();
        this._ensureHeaderActiveObserver();
        this._enterIfHeaderReady();
    }

    _teardownHeaderActiveObserver() {
        if (this._headerActiveObserver) {
            this._headerActiveObserver.disconnect();
            this._headerActiveObserver = null;
        }
    }

    _ensureHeaderActiveObserver() {
        if (this.getAttribute('hidden') != null) return;
        this._teardownHeaderActiveObserver();
        const header = document.getElementById('header');
        if (!header) return;
        this._headerActiveObserver = new MutationObserver(() => this._enterIfHeaderReady());
        this._headerActiveObserver.observe(header, { attributes: true, attributeFilter: ['active'] });
    }

    /**
     * After async `_boot` or when `#header` flips to active — `fusion-site-entered` is not re-dispatched
     * when the header is re-created on route changes, so we must sync here.
     */
    _enterIfHeaderReady() {
        if (this.getAttribute('hidden') != null) return;
        if (this._entered) return;
        if (!this._headerAlreadyActive() || !this._config || this._config.enabled === false) return;
        this._onSiteEnter();
    }

    _headerAlreadyActive() {
        const h = document.getElementById('header');
        return h && h.getAttribute('active') === 'true';
    }

    _onSiteEnter() {
        if (this._entered) return;
        if (this.getAttribute('hidden') != null) return;
        this._entered = true;
        const loc = readLocalMix();
        if (loc.atmoEnabled === false) {
            /* still schedule voices */
        } else if (this._masterOn) {
            void this._playAtmo();
        }
        this._startVoiceSchedule();
        this._syncSoundHeadLabel();
    }

    _buildAudio(cfg) {
        this._detachMediaLabelListeners();
        this._atmo = new Audio(String(cfg.atmosphereAudioUrl || ''));
        this._atmo.loop = true;
        this._atmo.preload = 'auto';
        this._voice = new Audio('');
        this._voice.preload = 'auto';
        this._voice.addEventListener('ended', () => {
            this._unduckAtmo();
        });
    }

    _attachMediaLabelListeners() {
        this._detachMediaLabelListeners();
        this._boundLabelSync = () => {
            this._syncSoundHeadLabel();
            this._updateCurrentVoiceRowVisibility();
        };
        const sync = this._boundLabelSync;
        if (this._atmo) {
            this._atmo.addEventListener('play', sync);
            this._atmo.addEventListener('pause', sync);
            this._atmo.addEventListener('volumechange', sync);
        }
        if (this._voice) {
            this._voice.addEventListener('play', sync);
            this._voice.addEventListener('pause', sync);
            this._voice.addEventListener('volumechange', sync);
            this._voice.addEventListener('ended', sync);
        }
    }

    _detachMediaLabelListeners() {
        const sync = this._boundLabelSync;
        if (!sync) return;
        if (this._atmo) {
            this._atmo.removeEventListener('play', sync);
            this._atmo.removeEventListener('pause', sync);
            this._atmo.removeEventListener('volumechange', sync);
        }
        if (this._voice) {
            this._voice.removeEventListener('play', sync);
            this._voice.removeEventListener('pause', sync);
            this._voice.removeEventListener('volumechange', sync);
            this._voice.removeEventListener('ended', sync);
        }
    }

    /** Atmosphere track is actively audible (not only “armed”). */
    _isAtmoAudible() {
        if (!this._masterOn) return false;
        const loc = readLocalMix();
        if (loc.atmoEnabled === false) return false;
        const a = this._atmo;
        if (!a || !String(a.src || '').trim()) return false;
        if (a.paused || a.muted) return false;
        if (a.volume < 1e-3) return false;
        return true;
    }

    /** Voice clip is actively audible. */
    _isVoiceAudible() {
        if (!this._masterOn) return false;
        const loc = readLocalMix();
        if (loc.voiceEnabled === false) return false;
        const v = this._voice;
        if (!v || !String(v.src || '').trim()) return false;
        if (v.paused || v.muted) return false;
        if (v.volume < 1e-3) return false;
        return true;
    }

    /** Header text reflects real playback; `aria-pressed` reflects user master gate. */
    _syncSoundHeadLabel() {
        const ht = this._shadow.getElementById('seHeadToggle');
        if (!ht) return;
        const ico = this._shadow.querySelector('.se-ico');
        const playing = this._isAtmoAudible() || this._isVoiceAudible();
        ht.textContent = playing ? 'SOUND ON' : 'SOUND OFF';
        ht.setAttribute('aria-pressed', this._masterOn ? 'true' : 'false');
        if (ico instanceof HTMLElement) {
            ico.setAttribute('data-playing', playing ? 'true' : 'false');
        }
    }

    async _playAtmo() {
        if (!this._atmo?.src) return;
        const vol = this._pctToGain(Number(this._getUiAtmoVol()));
        this._atmo.volume = this._atmoDucked ? vol * DUCK : vol;
        try {
            await this._atmo.play();
        } catch {
            /* autoplay blocked */
        } finally {
            this._syncSoundHeadLabel();
        }
    }

    _pctToGain(n) {
        return Math.max(0, Math.min(1, n / 100));
    }

    _getUiAtmoVol() {
        const c = this._config;
        const loc = readLocalMix();
        return Math.min(
            100,
            Math.max(
                0,
                loc.atmoVol != null ? Number(loc.atmoVol) : Number(c?.atmosphereVolumePercent ?? 60)
            )
        );
    }

    _getUiVoiceVol() {
        const c = this._config;
        const loc = readLocalMix();
        return Math.min(
            100,
            Math.max(
                0,
                loc.voiceVol != null ? Number(loc.voiceVol) : Number(c?.voicesVolumePercent ?? 40)
            )
        );
    }

    _unduckAtmo() {
        this._atmoDucked = false;
        if (this._atmo) {
            this._atmo.volume = this._pctToGain(this._getUiAtmoVol());
        }
        this._syncSoundHeadLabel();
    }

    _duckAtmo() {
        this._atmoDucked = true;
        if (this._atmo) {
            this._atmo.volume = this._pctToGain(this._getUiAtmoVol()) * DUCK;
        }
        this._syncSoundHeadLabel();
    }

    _startVoiceSchedule() {
        this._stopSchedule();
        if (!this._config || this._config.enabled === false) return;
        this._queueNextVoice();
    }

    _queueNextVoice() {
        this._stopSchedule();
        if (!this._entered || this.getAttribute('hidden') != null) return;
        const c = this._config;
        if (!c) return;
        const minS = Math.max(0, Number(c.minIntervalSec ?? 0));
        const maxS = Math.max(minS, Number(c.maxIntervalSec ?? minS));
        const delayMs = (minS + Math.random() * (maxS - minS + (maxS > minS ? 1e-6 : 0))) * 1000;
        this._scheduleTimer = setTimeout(() => {
            void this._playOneVoice();
        }, delayMs);
    }

    async _playOneVoice() {
        if (!this._entered || this.getAttribute('hidden') != null) return;
        const c = this._config;
        if (!c) return;
        if (!this._masterOn) {
            this._queueNextVoice();
            return;
        }
        const loc = readLocalMix();
        if (loc.voiceEnabled === false) {
            this._queueNextVoice();
            return;
        }
        if (c.voiceSelectionMode === 'manual' && c.manualVoiceAudioUrl) {
            let manArtist = null;
            if (c.voiceArtistId) {
                const { getArtists } = await import('../../utils/database.js');
                const all = await getArtists().catch(() => []);
                manArtist =
                    (Array.isArray(all) ? all : []).find(
                        (a) => String(a?.id ?? '') === String(c.voiceArtistId)
                    ) || null;
            }
            const mName = formatVoiceArtistDisplayName(
                manArtist,
                String(manArtist?.locales?.en?.name || '').trim()
            );
            const mHref = manArtist?.slug ? `/profile/${manArtist.slug}` : '/artists';
            await this._playVoiceUrl(String(c.manualVoiceAudioUrl), c.voiceArtistId, mName, mHref, manArtist);
            this._queueNextVoice();
            return;
        }
        const poolRaw = (await this._artistsWithAudioForRandom()).filter((a) => String(a?.audioUrl || '').trim());
        const pool = this._dedupeVoicePoolByAudioUrl(poolRaw);
        const mode = String(c.voiceSelectionMode || 'random').toLowerCase();

        let pick = null;
        if (mode === 'manual' && c.voiceArtistId) {
            pick = pool.find((a) => String(a?.id ?? '') === String(c.voiceArtistId)) || null;
        } else {
            pick = this._pickFromShuffledVoiceRound(pool);
        }

        if (!pick) {
            this._queueNextVoice();
            return;
        }
        if (pick?.id != null) {
            this._lastPlayedVoiceArtistId = String(pick.id);
        }
        const name = formatVoiceArtistDisplayName(pick, String(pick?.locales?.en?.name || '').trim());
        const href = String(pick?.slug ? `/profile/${pick.slug}` : '/artists');
        await this._playVoiceUrl(String(pick?.audioUrl || ''), null, name, href, pick);
        this._queueNextVoice();
    }

    /**
     * One entry per distinct audio URL so the same clip is not scheduled twice in one shuffle round.
     * @param {object[]} artists
     * @returns {object[]}
     */
    _dedupeVoicePoolByAudioUrl(artists) {
        const seen = new Set();
        const out = [];
        for (const a of artists) {
            const url = String(a?.audioUrl || '')
                .trim()
                .toLowerCase();
            if (!url || seen.has(url)) continue;
            seen.add(url);
            out.push(a);
        }
        return out;
    }

    /**
     * Fisher–Yates shuffle in place.
     * @param {string[]} ids
     */
    _shuffleInPlace(ids) {
        for (let i = ids.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = ids[i];
            ids[i] = ids[j];
            ids[j] = t;
        }
    }

    /**
     * Random voice from the full pool: shuffle all artists once per “round”, pop until empty, then reshuffle.
     * Avoids playing the same artist (and thus same clip) again until every other available clip has played,
     * and avoids starting a new round with the same clip that just ended when possible.
     * @param {object[]} withAudio
     * @returns {object | null}
     */
    _pickFromShuffledVoiceRound(withAudio) {
        if (!withAudio.length) return null;
        if (withAudio.length === 1) return withAudio[0];

        const sig = withAudio
            .map((a) => String(a?.id ?? ''))
            .filter(Boolean)
            .sort()
            .join('|');
        if (sig !== this._voicePoolSig) {
            this._voicePoolSig = sig;
            this._voiceRoundDeck = [];
        }

        if (this._voiceRoundDeck.length === 0) {
            this._voiceRoundDeck = withAudio.map((a) => String(a.id));
            this._shuffleInPlace(this._voiceRoundDeck);
            const lastIdx = this._voiceRoundDeck.length - 1;
            if (
                this._lastPlayedVoiceArtistId &&
                this._voiceRoundDeck[lastIdx] === this._lastPlayedVoiceArtistId
            ) {
                const swapIdx = Math.floor(Math.random() * lastIdx);
                const t = this._voiceRoundDeck[lastIdx];
                this._voiceRoundDeck[lastIdx] = this._voiceRoundDeck[swapIdx];
                this._voiceRoundDeck[swapIdx] = t;
            }
        }

        const id = this._voiceRoundDeck.pop();
        if (!id) return null;
        return withAudio.find((a) => String(a.id) === id) || null;
    }

    async _artistsWithAudioForRandom() {
        const { getArtists } = await import('../../utils/database.js');
        const a = await getArtists().catch(() => []);
        return Array.isArray(a) ? a : [];
    }

    /**
     * @param {string} url
     * @param {string|null|undefined} artistId
     * @param {string|null|undefined} name
     * @param {string|null|undefined} href
     * @param {object|null|undefined} artist
     */
    async _playVoiceUrl(url, artistId, name, href, artist) {
        if (!this._voice || !url) return;
        this._stopVoice();
        this._voice.src = url;
        this._voice.volume = this._pctToGain(this._getUiVoiceVol());
        this._duckAtmo();
        this._setCurrentVoiceLine(name, href, artistId, artist);
        this._updateCurrentVoiceRowVisibility();
        try {
            await this._voice.play();
        } catch {
            this._unduckAtmo();
        } finally {
            this._syncSoundHeadLabel();
            this._updateCurrentVoiceRowVisibility();
        }
    }

    _stopVoice() {
        if (this._voice) {
            this._voice.pause();
            this._voice.currentTime = 0;
        }
        this._updateCurrentVoiceRowVisibility();
        this._syncSoundHeadLabel();
    }

    _setCurrentVoiceLine(name, href, artistId, artist) {
        const line = this._shadow.getElementById('seCurrentVoice');
        if (!line) return;
        const n =
            name && String(name).trim()
                ? String(name).trim()
                : formatVoiceArtistDisplayName(artist, '');
        const h = href || (artist?.slug ? `/profile/${artist.slug}` : '/artists');
        line.innerHTML = `<span class="se-foot-row"><span class="se-foot-row-main">Current voice: <a href="${escapeHtml(
            h
        )}" part="seProfileLink">${escapeHtml(n)}</a></span><span class="se-foot-arr" aria-hidden="true">→</span></span>`;
    }

    /** Show “Current voice” only while a voice clip is actively playing. */
    _updateCurrentVoiceRowVisibility() {
        const line = this._shadow.getElementById('seCurrentVoice');
        if (line) {
            line.toggleAttribute('hidden', !this._isVoiceAudible());
        }
    }

    _updateLearnLink() {
        const a = this._shadow.getElementById('seLearnMore');
        const wrap = this._shadow.getElementById('seLearnRow');
        if (a instanceof HTMLAnchorElement) {
            if (this._hasLearnMoreLink && this._learnHref) {
                a.href = this._learnHref;
                a.setAttribute('href', this._learnHref);
            } else {
                a.removeAttribute('href');
            }
        }
        if (wrap) {
            wrap.toggleAttribute('hidden', !this._hasLearnMoreLink);
        }
    }

    /**
     * Thin 1px track: WebKit uses a CSS var fill; Firefox uses `::-moz-range-progress` + track.
     * @param {HTMLInputElement | null} input
     */
    _styleSeRange(input) {
        if (!input || input.type !== 'range') return;
        const min = Number(input.min) || 0;
        const max = Number(input.max) || 100;
        const n = Math.min(100, Math.max(0, Number(input.value)));
        const pct = max > min ? ((n - min) / (max - min)) * 100 : 0;
        input.style.setProperty('--se-pct', `${pct}%`);
    }

    _syncAllSeRangeStyles() {
        const a = this._shadow.getElementById('seAtmoSlider');
        const v = this._shadow.getElementById('seVoiceSlider');
        this._styleSeRange(a instanceof HTMLInputElement ? a : null);
        this._styleSeRange(v instanceof HTMLInputElement ? v : null);
    }

    _fillSlidersFromConfig() {
        const c = this._config;
        const a = this._shadow.getElementById('seAtmoSlider');
        const v = this._shadow.getElementById('seVoiceSlider');
        if (a instanceof HTMLInputElement) {
            a.value = String(Math.min(100, Math.max(0, Number(c?.atmosphereVolumePercent ?? 60))));
        }
        if (v instanceof HTMLInputElement) {
            v.value = String(Math.min(100, Math.max(0, Number(c?.voicesVolumePercent ?? 40))));
        }
        this._syncAllSeRangeStyles();
    }

    _applyLocalMix() {
        const m = readLocalMix();
        if (typeof m.masterOn === 'boolean') {
            this._masterOn = m.masterOn;
        }
        if (m.atmoVol != null) {
            const s = this._shadow.getElementById('seAtmoSlider');
            if (s instanceof HTMLInputElement) s.value = String(m.atmoVol);
        }
        if (m.voiceVol != null) {
            const s = this._shadow.getElementById('seVoiceSlider');
            if (s instanceof HTMLInputElement) s.value = String(m.voiceVol);
        }
        if (m.atmoEnabled === false) {
            const t = this._shadow.getElementById('seAtmoTog');
            if (t instanceof HTMLInputElement) t.checked = false;
        }
        if (m.voiceEnabled === false) {
            const t = this._shadow.getElementById('seVoiceTog');
            if (t instanceof HTMLInputElement) t.checked = false;
        }
        this._syncSoundHeadLabel();
        this._syncAllSeRangeStyles();
    }

    _renderShell() {
        this._uiListenersBound = false;
        this._shadow.innerHTML = `
        <style>
        :host {
            display: block;
            width: max-content;
            max-width: 100%;
            position: relative;
            font-family: 'momochidori-variable', 'Helvetica Neue', sans-serif;
            font-variation-settings: 'wght' 500;
            /* Inherit semantic tokens from the document; --c2/--bg track light + dark (see index.css). */
            --se-border: 1px solid var(--c2, #000000);
            --se-surface: var(--bg, #faf3f4);
            --se-ink: var(--c2, #000000);
            --se-track-mix: color-mix(in srgb, var(--c2) 28%, var(--bg) 72%);
            color: var(--se-ink);
            pointer-events: none;
        }
        :host([hidden]) { display: none !important; }
        .se-wrap {
            display: inline-block;
            min-width: 113%;
            width: 20rem;
            vertical-align: top;
            margin-top: 15px;
            padding-left: 2%;
            padding-right: 5%;
            border: var(--se-border);
            border-radius: 0;
            background: var(--se-surface);
            color: var(--se-ink);
            box-sizing: border-box;
            position: relative;
            z-index: 15;
            pointer-events: none;
        }
        .se-wrap * { pointer-events: none; }
        .se-top,
        .se-top *,
        .se-pan,
        .se-pan *,
        .se-toggle,
        .se-chev-btn,
        .se-chev-btn *,
        .se-foot a,
        .se-foot a *,
        input[type='range'],
        input[type='checkbox'] {
            pointer-events: auto;
        }
        .se-wrap.se-pan-open {
            display: block;
            /* Same footprint as the collapsed control (no width: 100% grow). */
            width: 20rem;
            min-width: 113%;
            max-width: 100%;
        }
        .se-top {
            display: flex;
            flex-wrap: nowrap;
            align-items: center;
            justify-content: flex-start;
            gap: 0.4rem 0.55rem;
            padding: 0.65rem 0.85rem 0.65rem 0.75rem;
            min-height: 2.5rem;
            user-select: none;
        }
        .se-ico {
            display: flex;
            align-items: flex-end;
            height: 0.75rem;
            flex-shrink: 0;
            color: var(--se-ink);
        }
        .se-ico svg { display: block; }
        .se-ico svg rect {
            transform-box: fill-box;
            transform-origin: center bottom;
        }
        .se-ico[data-playing="true"] svg rect {
            animation: seEqPulse 1s ease-in-out infinite;
        }
        .se-ico[data-playing="true"] svg rect:nth-child(1) { animation-delay: -0.35s; }
        .se-ico[data-playing="true"] svg rect:nth-child(2) { animation-delay: -0.15s; }
        .se-ico[data-playing="true"] svg rect:nth-child(3) { animation-delay: -0.45s; }
        .se-ico[data-playing="true"] svg rect:nth-child(4) { animation-delay: -0.25s; }
        @keyframes seEqPulse {
            0%, 100% { transform: scaleY(0.45); opacity: 0.7; }
            50% { transform: scaleY(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
            .se-ico[data-playing="true"] svg rect { animation: none; }
        }
        .se-toggle {
            border: 0;
            margin: 0;
            padding: 0;
            background: transparent;
            color: var(--se-ink);
            font: inherit;
            font-weight: 800;
            font-size: 0.72rem;
            letter-spacing: 0.04em;
            line-height: 1;
            cursor: pointer;
        }
        .se-toggle:focus-visible {
            outline: 1px solid var(--se-ink);
            outline-offset: 2px;
        }
        .se-sep {
            color: color-mix(in srgb, var(--se-ink) 58%, var(--se-surface) 42%);
            font-size: 0.75rem;
            font-weight: 300;
            line-height: 1;
        }
        .se-label-group {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            margin-left: 0.1rem;
            min-width: 0;
        }
        .se-cat {
            font-size: 0.72rem;
            font-weight: 500;
            font-variation-settings: 'wght' 500;
            letter-spacing: 0.01em;
            white-space: nowrap;
        }
        .se-chev-icon {
            display: flex;
            flex-shrink: 0;
            color: var(--se-ink);
            cursor: pointer;
        }
        .se-chev-icon svg {
            transition: transform 0.2s ease;
        }
        .se-chev-icon.open svg {
            transform: rotate(180deg);
        }
        .se-chev-btn {
            border: 0;
            margin: 0;
            padding: 0;
            background: transparent;
            line-height: 0;
            cursor: pointer;
            color: var(--se-ink);
            pointer-events: auto;
        }
        .se-chev-btn:focus-visible {
            outline: 1px solid var(--se-ink);
            outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) { .se-chev-icon svg { transition: none; } }
        .se-pan {
            display: none;
            border-top: var(--se-border);
        }
        .se-pan.open { display: block; }
        .se-sec {
            border-bottom: var(--se-border);
        }
        .se-sec .se-row-h { border-bottom: 0; }
        .se-sec .se-row { border-bottom: 0; }
        .se-row-h {
            display: flex; align-items: center; justify-content: space-between;
            padding: 0.6rem 0.75rem 0.4rem;
            background: color-mix(in srgb, var(--c2) 4%, var(--se-surface));
        }
        .se-row {
            display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;
            padding: 0.4rem 0.75rem 0.6rem;
        }
        .se-sec-title { font-size: 0.6rem; letter-spacing: 0.08em; font-weight: 600; }
        .se-volrow { display: flex; align-items: center; flex: 1; min-width: 0; width: 100%; gap: 0.4rem; }
        .se-volrow input[type=range].se-range {
            -webkit-appearance: none;
            appearance: none;
            flex: 1;
            min-width: 4rem;
            height: 1.3rem;
            background: transparent;
            --se-pct: 0%;
            --se-track-empty: var(--se-track-mix);
            --se-track-fill: var(--se-ink);
            cursor: pointer;
        }
        .se-volrow input[type=range].se-range:focus { outline: none; }
        .se-volrow input[type=range].se-range:focus-visible {
            outline: 1px solid var(--se-ink);
            outline-offset: 2px;
        }
        .se-volrow input[type=range].se-range::-webkit-slider-runnable-track {
            height: 1px;
            background: linear-gradient(
                to right,
                var(--se-track-fill) 0%,
                var(--se-track-fill) var(--se-pct),
                var(--se-track-empty) var(--se-pct),
                var(--se-track-empty) 100%
            );
        }
        .se-volrow input[type=range].se-range::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: var(--se-ink);
            border: none;
            box-shadow: none;
            margin-top: -4px;
        }
        .se-volrow input[type=range].se-range::-moz-range-track {
            height: 1px;
            background: var(--se-track-empty);
            border: none;
        }
        .se-volrow input[type=range].se-range::-moz-range-progress {
            height: 1px;
            background: var(--se-track-fill);
            border: none;
        }
        .se-volrow input[type=range].se-range::-moz-range-thumb {
            width: 9px;
            height: 9px;
            border: none;
            border-radius: 50%;
            background: var(--se-ink);
            box-shadow: none;
            cursor: pointer;
        }
        @media (prefers-reduced-motion: reduce) {
            .se-volrow input[type=range].se-range::-webkit-slider-thumb { transition: none; }
        }
        .se-pct { font-size: 0.7rem; min-width: 2.2rem; text-align: right; color: var(--se-ink); }
        .se-foot {
            padding-top: 5%;
            padding-bottom: 5%;
            font-size: 0.7rem;
            line-height: 1.45;
        }
        .se-foot a { color: var(--se-ink); text-decoration: underline; }
        .se-foot-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
            padding: 0.6rem 0.75rem;
            border-bottom: var(--se-border);
        }
        .se-foot-row:last-child { border-bottom: none; }
        .se-foot-row-main { min-width: 0; }
        #seCurrentVoice .se-foot-row-main {
            font-size: 0.82rem;
            line-height: 1.35;
        }
        #seCurrentVoice .se-foot-row-main a {
            font-size: inherit;
            line-height: inherit;
        }
        .se-foot-learn {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
            padding: 0.6rem 0.75rem;
        }
        /* display:flex above wins over the hidden attribute unless we force it. */
        #seLearnRow[hidden],
        .se-foot-learn[hidden] {
            display: none !important;
        }
        .se-foot-learn a { flex: 1; min-width: 0; }
        .se-foot-arr {
            flex-shrink: 0;
            font-size: 0.85rem;
            line-height: 1;
            color: var(--se-ink);
        }
        input.se-toggle-input { appearance: none; width: 2.1rem; height: 1.1rem; border: 1px solid var(--se-ink); border-radius: 0.5rem; background: var(--c3, #ffffff); position: relative; cursor: pointer; }
        input.se-toggle-input::after { content:''; position:absolute; width:0.8rem; height:0.8rem; top:0.1rem; left:0.1rem; background: var(--se-ink); border-radius:50%; transition: transform 0.2s; }
        input.se-toggle-input:checked::after { transform: translateX(0.9rem); }
        @media (prefers-reduced-motion: reduce) { input.se-toggle-input::after { transition: none; } }
        </style>
        <div class="se-wrap" part="wrap">
          <div class="se-top" id="seHead" role="group" aria-label="Sound controls">
            <span class="se-ico" aria-hidden="true">
                <svg viewBox="0 0 20 10" width="20" height="10" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect x="0" y="2" width="2.5" height="6" rx="0" />
                  <rect x="5" y="0" width="2.5" height="10" rx="0" />
                  <rect x="10" y="3" width="2.5" height="4" rx="0" />
                  <rect x="15" y="1" width="2.5" height="8" rx="0" />
                </svg>
            </span>
            <button class="se-toggle" id="seHeadToggle" type="button" aria-label="Toggle sound on or off" aria-pressed="true">SOUND ON</button>
            <span class="se-sep" aria-hidden="true">|</span>
            <span class="se-label-group">
              <span class="se-cat" id="seTitleLine">Nature &amp; Artist Voices</span>
              <button class="se-chev-btn" id="seChevBtn" aria-label="Toggle sound controls" aria-expanded="false" type="button">
              <span class="se-chev-icon" id="seChev" aria-hidden="true">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              </button>
            </span>
          </div>
          <div class="se-pan" id="sePanel">
            <div class="se-sec">
            <div class="se-row-h">
                <div class="se-sec-title" style="display:flex;align-items:center;gap:0.3rem">⌇ ATMOSPHERE</div>
                <input type="checkbox" class="se-toggle-input" id="seAtmoTog" checked title="Atmosphere" />
            </div>
            <div class="se-row">
                <div class="se-volrow">
                    <input type="range" class="se-range" id="seAtmoSlider" min="0" max="100" value="60" />
                    <span class="se-pct" id="seAtmoPct">60%</span>
                </div>
            </div>
            </div>
            <div class="se-sec">
            <div class="se-row-h">
                <div class="se-sec-title" style="display:flex;align-items:center;gap:0.3rem">🎤 VOICES</div>
                <input type="checkbox" class="se-toggle-input" id="seVoiceTog" checked title="Voices" />
            </div>
            <div class="se-row">
                <div class="se-volrow">
                    <input type="range" class="se-range" id="seVoiceSlider" min="0" max="100" value="40" />
                    <span class="se-pct" id="seVoicePct">40%</span>
                </div>
            </div>
            </div>
            <div class="se-foot">
                <p id="seCurrentVoice" style="margin:0" hidden>
                  <span class="se-foot-row"><span class="se-foot-row-main">Current voice: <a href="/artists" part="seProfileLink">—</a></span><span class="se-foot-arr" aria-hidden="true">→</span></span>
                </p>
                <div class="se-foot-learn" id="seLearnRow" hidden>
                  <a href="/journal" id="seLearnMore" part="seLearnLink">Learn more about the soundscape</a>
                  <span class="se-foot-arr" aria-hidden="true">→</span>
                </div>
            </div>
          </div>
        </div>`;
        this._bindUi();
    }

    _bindUi() {
        if (this._uiListenersBound) return;
        this._uiListenersBound = true;
        /** In-app links (shadow retargeting prevents the document `setupNavigation` handler from seeing the real target). */
        this._shadow.addEventListener('click', (e) => {
            const start = e.target instanceof Element ? e.target : e.target?.parentElement;
            const a = start?.closest?.('a[href]');
            if (!(a instanceof HTMLAnchorElement)) return;
            const href = a.getAttribute('href') || '';
            if (!href || href === '#' || href.startsWith('mailto:') || href.startsWith('tel:')) return;
            if (a.target === '_blank' || a.getAttribute('download') != null) return;
            if (e.defaultPrevented) return;
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            if (href.startsWith('http://') || href.startsWith('https://')) return;
            if (!href.startsWith('/')) return;
            e.preventDefault();
            e.stopPropagation();
            navigate(href);
        });
        const chevBtn = this._shadow.getElementById('seChevBtn');
        const atmoS = this._shadow.getElementById('seAtmoSlider');
        const voS = this._shadow.getElementById('seVoiceSlider');
        const atmoP = this._shadow.getElementById('seAtmoPct');
        const voP = this._shadow.getElementById('seVoicePct');
        const atmoT = this._shadow.getElementById('seAtmoTog');
        const voT = this._shadow.getElementById('seVoiceTog');
        const ht = this._shadow.getElementById('seHeadToggle');
        const syncPcts = () => {
            if (atmoS instanceof HTMLInputElement && atmoP) {
                atmoP.textContent = `${atmoS.value}%`;
            }
            if (voS instanceof HTMLInputElement && voP) {
                voP.textContent = `${voS.value}%`;
            }
        };
        const onVol = () => {
            const av = atmoS instanceof HTMLInputElement ? Math.min(100, Math.max(0, Number(atmoS.value))) : 60;
            const vv = voS instanceof HTMLInputElement ? Math.min(100, Math.max(0, Number(voS.value))) : 40;
            writeLocalMix({ atmoVol: av, voiceVol: vv });
            if (this._atmo) {
                this._atmo.volume = this._atmoDucked ? this._pctToGain(av) * DUCK : this._pctToGain(av);
            }
            if (this._voice) {
                this._voice.volume = this._pctToGain(vv);
            }
            syncPcts();
            this._syncAllSeRangeStyles();
            this._syncSoundHeadLabel();
            this._updateCurrentVoiceRowVisibility();
        };
        atmoS?.addEventListener('input', onVol);
        voS?.addEventListener('input', onVol);
        atmoT?.addEventListener('change', (ev) => {
            const on = ev.target && 'checked' in ev.target && /** @type {any} */ (ev.target).checked;
            writeLocalMix({ atmoEnabled: on });
            if (on === false) {
                this._atmo?.pause();
            } else {
                this._atmoDucked = false;
                if (this._atmo) this._atmo.volume = this._pctToGain(this._getUiAtmoVol());
                if (this._masterOn) void this._playAtmo();
            }
            this._syncSoundHeadLabel();
        });
        voT?.addEventListener('change', (ev) => {
            const on = ev.target && 'checked' in ev.target && /** @type {any} */ (ev.target).checked;
            writeLocalMix({ voiceEnabled: on });
            if (on === false) {
                this._stopVoice();
            }
            this._syncSoundHeadLabel();
        });
        ht?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._masterToggle();
        });
        ht?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this._masterToggle();
            }
        });
        chevBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._toggle();
        });
        chevBtn?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this._toggle();
            }
        });
        this._syncSoundHeadLabel();
        this._setHeadTitle();
        this._updateLearnLink();
        this._updateCurrentVoiceRowVisibility();
        syncPcts();
        this._syncAllSeRangeStyles();
    }

    _toggle() {
        const p = this._shadow.getElementById('sePanel');
        const c = this._shadow.getElementById('seChev');
        const w = this._shadow.querySelector('.se-wrap');
        if (p) {
            p.classList.toggle('open');
            const open = p.classList.contains('open');
            if (c) c.classList.toggle('open', open);
            w?.classList.toggle('se-pan-open', open);
            const b = this._shadow.getElementById('seChevBtn');
            b?.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
    }

    _setHeadTitle() {
        const t = this._shadow.getElementById('seTitleLine');
        const c = this._config;
        const label = c?.categoryLabel ? String(c.categoryLabel) : 'Nature';
        if (t) t.textContent = `${label} & Artist Voices`;
    }

    _masterToggle() {
        this._masterOn = !this._masterOn;
        writeLocalMix({ masterOn: this._masterOn });
        if (this._atmo) {
            this._atmo.muted = !this._masterOn;
        }
        if (this._voice) {
            this._voice.muted = !this._masterOn;
        }
        if (this._masterOn) {
            if (this._entered) {
                void this._playAtmo();
                this._startVoiceSchedule();
            }
        } else {
            if (this._atmo) {
                this._atmo.pause();
                this._atmo.muted = true;
            }
            this._voice?.pause();
            this._stopSchedule();
        }
        this._syncSoundHeadLabel();
        this._updateCurrentVoiceRowVisibility();
    }

    /**
     * Route-level override for pages that should suppress sound.
     * @param {boolean} enabled
     */
    setMasterEnabled(enabled) {
        const next = Boolean(enabled);
        if (this._masterOn === next && this._atmo && this._voice) return;
        this._masterOn = next;
        writeLocalMix({ masterOn: this._masterOn });
        if (this._atmo) {
            this._atmo.muted = !this._masterOn;
        }
        if (this._voice) {
            this._voice.muted = !this._masterOn;
        }
        if (this._masterOn) {
            if (this._entered) {
                void this._playAtmo();
                this._startVoiceSchedule();
            }
        } else {
            if (this._atmo) {
                this._atmo.pause();
                this._atmo.muted = true;
            }
            this._voice?.pause();
            this._stopSchedule();
            this._unduckAtmo();
        }
        this._syncEqIcons();
        this._syncSoundHeadLabel();
        this._updateCurrentVoiceRowVisibility();
    }
}

customElements.define('app-sound-environment', SoundEnvironment);
export { SoundEnvironment };
