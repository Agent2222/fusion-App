import { describe, it, expect } from 'vitest';
import {
    DEFAULT_IMAGE_UPLOAD_MAX_BYTES,
    isHeicMime,
    normalizeImageMime,
    prepareImageFileForUpload,
} from './imageUploadPrep.js';

function makeFile(name, type, sizeBytes) {
    const bytes = new Uint8Array(sizeBytes);
    return new File([bytes], name, { type });
}

describe('imageUploadPrep', () => {
    it('normalizeImageMime prefers the File type when it is an image', () => {
        expect(normalizeImageMime(makeFile('shot.bin', 'image/jpeg', 8))).toBe('image/jpeg');
    });

    it('normalizeImageMime falls back to the filename extension', () => {
        expect(normalizeImageMime(makeFile('art.PNG', '', 8))).toBe('image/png');
        expect(normalizeImageMime(makeFile('art.webp', '', 8))).toBe('image/webp');
        expect(normalizeImageMime(makeFile('notes.txt', '', 8))).toBe('application/octet-stream');
    });

    it('detects HEIC/HEIF', () => {
        expect(isHeicMime('image/heic')).toBe(true);
        expect(isHeicMime('image/heif')).toBe(true);
        expect(isHeicMime('photo.heic')).toBe(true);
        expect(isHeicMime('image/jpeg')).toBe(false);
    });

    it('passes through files already under the size limit', async () => {
        const file = makeFile('hero.jpg', 'image/jpeg', 1024);
        const out = await prepareImageFileForUpload(file);
        expect(out.compressed).toBe(false);
        expect(out.file).toBe(file);
    });

    it('warns on small HEIC files instead of converting them', async () => {
        const file = makeFile('iphone.heic', 'image/heic', 2048);
        const out = await prepareImageFileForUpload(file);
        expect(out.heicWarning).toBe(true);
        expect(out.compressed).toBe(false);
        expect(out.file).toBe(file);
    });

    it('rejects oversized HEIC files', async () => {
        const file = makeFile('iphone.heic', 'image/heic', DEFAULT_IMAGE_UPLOAD_MAX_BYTES + 1);
        await expect(prepareImageFileForUpload(file)).rejects.toThrow(/HEIC\/HEIF/);
    });

    it('rejects oversized images when canvas compression is unavailable', async () => {
        const file = makeFile('huge.jpg', 'image/jpeg', DEFAULT_IMAGE_UPLOAD_MAX_BYTES + 10);
        await expect(prepareImageFileForUpload(file)).rejects.toThrow(/too large/);
    });
});
