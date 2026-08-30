import { describe, expect, it, vi } from 'vitest';
import {
    clearMpdPendingAudioPreview,
    showMpdPendingAudioPreview,
} from './mpdAudioPreview.js';

function makePlayer() {
    return {
        src: '',
        hidden: true,
        paused: true,
        pause() {
            this.paused = true;
        },
        removeAttribute(name) {
            if (name === 'src') this.src = '';
        },
    };
}

function makeRoot() {
    const player = makePlayer();
    const panel = { hidden: true };
    const nameEl = { textContent: '' };
    const hintEl = { hidden: true, textContent: '' };
    const byId = {
        mpd_audio_pending: panel,
        mpd_audio_pending_player: player,
        mpd_audio_pending_name: nameEl,
        mpd_audio_pending_replace_hint: hintEl,
    };
    return {
        byId,
        getElementById(id) {
            return byId[id] || null;
        },
    };
}

describe('mpdAudioPreview', () => {
    it('shows a local blob preview before upload', () => {
        const root = makeRoot();
        const store = new Map();
        const urlApi = {
            createObjectURL: vi.fn(() => 'blob:audio-v1'),
            revokeObjectURL: vi.fn(),
        };
        const file = new File([new Uint8Array(8)], 'take.mp3', { type: 'audio/mpeg' });

        const url = showMpdPendingAudioPreview(root, store, file, urlApi);

        expect(url).toBe('blob:audio-v1');
        expect(store.get('pending')).toBe('blob:audio-v1');
        expect(root.byId.mpd_audio_pending_player.src).toBe('blob:audio-v1');
        expect(root.byId.mpd_audio_pending_player.hidden).toBe(false);
        expect(root.byId.mpd_audio_pending.hidden).toBe(false);
        expect(root.byId.mpd_audio_pending_name.textContent).toBe('take.mp3');
        expect(root.byId.mpd_audio_pending_replace_hint.hidden).toBe(true);
    });

    it('revokes the previous blob when the file is replaced', () => {
        const root = makeRoot();
        const store = new Map();
        let n = 0;
        const urlApi = {
            createObjectURL: vi.fn(() => `blob:audio-v${++n}`),
            revokeObjectURL: vi.fn(),
        };
        showMpdPendingAudioPreview(
            root,
            store,
            new File([new Uint8Array(4)], 'v1.mp3', { type: 'audio/mpeg' }),
            urlApi,
        );
        showMpdPendingAudioPreview(
            root,
            store,
            new File([new Uint8Array(4)], 'v2.wav', { type: 'audio/wav' }),
            { ...urlApi, replaceTitle: 'Old take' },
        );

        expect(urlApi.revokeObjectURL).toHaveBeenCalledWith('blob:audio-v1');
        expect(store.get('pending')).toBe('blob:audio-v2');
        expect(root.byId.mpd_audio_pending_player.src).toBe('blob:audio-v2');
        expect(root.byId.mpd_audio_pending_name.textContent).toBe('v2.wav');
        expect(root.byId.mpd_audio_pending_replace_hint.hidden).toBe(false);
        expect(root.byId.mpd_audio_pending_replace_hint.textContent).toContain('Old take');
    });

    it('clears preview and revokes the blob when the selection is deleted', () => {
        const root = makeRoot();
        const store = new Map();
        const urlApi = {
            createObjectURL: () => 'blob:audio-drop',
            revokeObjectURL: vi.fn(),
        };
        showMpdPendingAudioPreview(
            root,
            store,
            new File([new Uint8Array(4)], 'drop.mp3', { type: 'audio/mpeg' }),
            urlApi,
        );
        clearMpdPendingAudioPreview(root, store, urlApi);

        expect(urlApi.revokeObjectURL).toHaveBeenCalledWith('blob:audio-drop');
        expect(store.has('pending')).toBe(false);
        expect(root.byId.mpd_audio_pending_player.src).toBe('');
        expect(root.byId.mpd_audio_pending_player.hidden).toBe(true);
        expect(root.byId.mpd_audio_pending.hidden).toBe(true);
    });
});
