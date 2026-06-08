/**
 * S3/R2 multipart upload presign helpers (browser uploads large videos in parts).
 */
import { randomUUID } from 'node:crypto';
import {
    AbortMultipartUploadCommand,
    CompleteMultipartUploadCommand,
    CreateMultipartUploadCommand,
    UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const DEFAULT_PART_SIZE = 10 * 1024 * 1024;
const MIN_PART_SIZE = 5 * 1024 * 1024;
const MAX_PARTS = 10_000;

/**
 * @param {unknown} raw
 * @returns {number}
 */
function parsePositiveInt(raw, fallback) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.floor(n);
}

export const MULTIPART_PART_SIZE_BYTES = Math.max(
    MIN_PART_SIZE,
    parsePositiveInt(process.env.MULTIPART_PART_SIZE_BYTES, DEFAULT_PART_SIZE),
);

export const MULTIPART_THRESHOLD_BYTES = parsePositiveInt(
    process.env.MULTIPART_THRESHOLD_BYTES,
    100 * 1024 * 1024,
);

/**
 * @param {number} fileSize
 * @param {number} [partSize]
 */
export function computeMultipartPlan(fileSize, partSize = MULTIPART_PART_SIZE_BYTES) {
    const size = Math.max(0, Math.floor(Number(fileSize) || 0));
    const ps = Math.max(MIN_PART_SIZE, Math.floor(partSize));
    const partCount = Math.max(1, Math.ceil(size / ps));
    if (partCount > MAX_PARTS) {
        throw new Error(`File too large for multipart (max ${MAX_PARTS} parts)`);
    }
    return { partSize: ps, partCount };
}

/**
 * @param {import('@aws-sdk/client-s3').S3Client} client
 * @param {string} bucket
 * @param {string} key
 * @param {string} contentType
 */
export async function createMultipartUpload(client, bucket, key, contentType) {
    const out = await client.send(
        new CreateMultipartUploadCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType,
        }),
    );
    if (!out.UploadId) throw new Error('Multipart init failed: no uploadId');
    return out.UploadId;
}

/**
 * @param {import('@aws-sdk/client-s3').S3Client} client
 * @param {string} bucket
 * @param {string} key
 * @param {string} uploadId
 * @param {number} partNumber
 */
export async function presignUploadPart(client, bucket, key, uploadId, partNumber) {
    const command = new UploadPartCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
    });
    return getSignedUrl(client, command, { expiresIn: 3600 });
}

/**
 * @param {import('@aws-sdk/client-s3').S3Client} client
 * @param {string} bucket
 * @param {string} key
 * @param {string} uploadId
 * @param {{ partNumber: number, etag: string }[]} parts
 */
export async function completeMultipartUpload(client, bucket, key, uploadId, parts) {
    const sorted = [...parts].sort((a, b) => a.partNumber - b.partNumber);
    await client.send(
        new CompleteMultipartUploadCommand({
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
            MultipartUpload: {
                Parts: sorted.map((p) => ({
                    ETag: p.etag,
                    PartNumber: p.partNumber,
                })),
            },
        }),
    );
}

/**
 * @param {import('@aws-sdk/client-s3').S3Client} client
 * @param {string} bucket
 * @param {string} key
 * @param {string} uploadId
 */
export async function abortMultipartUpload(client, bucket, key, uploadId) {
    try {
        await client.send(
            new AbortMultipartUploadCommand({
                Bucket: bucket,
                Key: key,
                UploadId: uploadId,
            }),
        );
    } catch {
        /* best effort */
    }
}

/**
 * @param {string} publicBaseUrl
 * @param {string} key
 */
export function publicUrlForKey(publicBaseUrl, key) {
    const base = publicBaseUrl.replace(/\/$/, '');
    return `${base}/${key.split('/').map((seg) => encodeURIComponent(seg)).join('/')}`;
}

/**
 * @param {string} contentId
 * @param {string} fileName
 * @param {string} privateVideoPrefix
 */
export function privateVideoObjectKey(contentId, fileName, privateVideoPrefix) {
    const safeId = String(contentId || 'community-video')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .slice(0, 80) || 'community-video';
    const safeName = String(fileName || 'video.mp4')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .slice(0, 120) || 'video.mp4';
    return `${privateVideoPrefix}${safeId}/${randomUUID()}-${safeName}`;
}
