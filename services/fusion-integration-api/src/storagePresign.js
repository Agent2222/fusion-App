/**
 * Presigned URL helpers tuned for browser PUT uploads (no extra checksum headers).
 */
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** @type {import('@aws-sdk/s3-request-presigner').RequestPresigningArguments} */
const PUT_OBJECT_PRESIGN_OPTS = {
    expiresIn: 3600,
    signableHeaders: new Set(['content-type']),
};

/** @type {import('@aws-sdk/s3-request-presigner').RequestPresigningArguments} */
const UPLOAD_PART_PRESIGN_OPTS = {
    expiresIn: 3600,
};

/**
 * @param {import('@aws-sdk/client-s3').S3Client} client
 * @param {import('@aws-sdk/client-s3').PutObjectCommand} command
 * @param {number} [expiresIn]
 */
export async function presignPutObjectUrl(client, command, expiresIn = 3600) {
    return getSignedUrl(client, command, { ...PUT_OBJECT_PRESIGN_OPTS, expiresIn });
}

/**
 * @param {import('@aws-sdk/client-s3').S3Client} client
 * @param {import('@aws-sdk/client-s3').UploadPartCommand} command
 * @param {number} [expiresIn]
 */
export async function presignUploadPartUrl(client, command, expiresIn = 3600) {
    return getSignedUrl(client, command, { ...UPLOAD_PART_PRESIGN_OPTS, expiresIn });
}
