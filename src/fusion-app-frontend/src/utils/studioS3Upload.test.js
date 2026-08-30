import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../config.js', () => ({
    DEV_MODE: false,
}));

const presignUpload = vi.fn();
const getIntegrationBaseUrl = vi.fn();

vi.mock('./integrationApi.js', () => ({
    getIntegrationBaseUrl: (...args) => getIntegrationBaseUrl(...args),
    mapIntegrationUserMessage: (raw) => String(raw),
    presignUpload: (...args) => presignUpload(...args),
}));

import { uploadBlobToS3 } from './studioS3Upload.js';

function makeFile(name, type = 'image/jpeg', sizeBytes = 32) {
    return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe('uploadBlobToS3', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        getIntegrationBaseUrl.mockReturnValue('https://api.example.test');
        presignUpload.mockReset();
        globalThis.fetch = vi.fn();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('throws when the Integration API URL is not configured', async () => {
        getIntegrationBaseUrl.mockReturnValue('');
        await expect(uploadBlobToS3(makeFile('hero.jpg'))).rejects.toThrow(/Integration API/);
        expect(presignUpload).not.toHaveBeenCalled();
    });

    it('presigns, PUTs the file, and returns the CloudFront URL', async () => {
        presignUpload.mockResolvedValue({
            putUrl: 'https://s3.example.test/put/hero',
            publicUrl: 'https://bucket.example.test/uploads/account/profile/artist/me/hero.jpg',
        });
        globalThis.fetch.mockResolvedValue({ ok: true, status: 200 });

        const file = makeFile('hero.jpg');
        const url = await uploadBlobToS3(file, null, {
            area: 'account/profile',
            entityType: 'artist',
            entityId: 'me',
            fieldKey: 'hero',
        });

        expect(presignUpload).toHaveBeenCalledWith(
            'account/profile/artist/me/hero.jpg',
            'image/jpeg',
            { rootPrefix: undefined },
        );
        expect(globalThis.fetch).toHaveBeenCalledWith('https://s3.example.test/put/hero', {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': 'image/jpeg' },
            signal: undefined,
        });
        expect(url).toBe(
            'https://cdn.fusionart.world/uploads/account/profile/artist/me/hero.jpg',
        );
    });

    it('overwrites the same deterministic key when the photo is changed', async () => {
        presignUpload.mockResolvedValue({
            putUrl: 'https://s3.example.test/put',
            publicUrl: 'https://bucket.example.test/uploads/account/profile/artist/a1/heroProfile.png',
        });
        globalThis.fetch.mockResolvedValue({ ok: true, status: 200 });

        const first = makeFile('v1.png', 'image/png');
        const second = makeFile('v2.png', 'image/png');
        const opts = {
            area: 'account/profile',
            entityType: 'artist',
            entityId: 'a1',
            fieldKey: 'heroProfile',
        };

        await uploadBlobToS3(first, null, opts);
        await uploadBlobToS3(second, null, opts);

        expect(presignUpload.mock.calls[0][0]).toBe(
            'account/profile/artist/a1/heroprofile.png',
        );
        expect(presignUpload.mock.calls[1][0]).toBe(
            'account/profile/artist/a1/heroprofile.png',
        );
    });

    it('writes the distributed URL into the hidden input used by Save', async () => {
        presignUpload.mockResolvedValue({
            putUrl: 'https://s3.example.test/put',
            publicUrl: 'https://bucket.example.test/uploads/account/profile/artist/me/hero.jpg',
        });
        globalThis.fetch.mockResolvedValue({ ok: true, status: 200 });
        const input = { value: '' };

        await uploadBlobToS3(makeFile('hero.jpg'), input, {
            area: 'account/profile',
            entityType: 'artist',
            entityId: 'me',
            fieldKey: 'hero',
        });

        expect(input.value).toBe(
            'https://cdn.fusionart.world/uploads/account/profile/artist/me/hero.jpg',
        );
    });

    it('fails when the file-host PUT is rejected', async () => {
        presignUpload.mockResolvedValue({
            putUrl: 'https://s3.example.test/put',
            publicUrl: 'https://bucket.example.test/uploads/x.jpg',
        });
        globalThis.fetch.mockResolvedValue({ ok: false, status: 403 });

        await expect(uploadBlobToS3(makeFile('hero.jpg'))).rejects.toThrow(/S3 upload failed: HTTP 403/);
    });

    it('fails when presign fails', async () => {
        presignUpload.mockRejectedValue(new Error('Presign HTTP 401'));
        await expect(uploadBlobToS3(makeFile('hero.jpg'))).rejects.toThrow(/Presign HTTP 401/);
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });
});
