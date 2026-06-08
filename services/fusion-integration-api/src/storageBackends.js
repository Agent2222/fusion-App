/**
 * Dual object-storage backends: AWS S3 (primary when healthy) and Cloudflare R2 (failover).
 * Active backend selected via STORAGE_BACKEND=aws|r2 (default aws).
 */
import { S3Client } from '@aws-sdk/client-s3';

const DEFAULT_CDN_BASE = 'https://cdn.fusionart.world';

/**
 * @returns {'aws' | 'r2'}
 */
export function getStorageBackendName() {
    const raw = String(process.env.STORAGE_BACKEND || 'aws')
        .trim()
        .toLowerCase();
    if (raw === 'r2') return 'r2';
    if (raw === 'aws') return 'aws';
    if (raw) {
        console.warn(
            `[storage] Invalid STORAGE_BACKEND="${raw}" — expected aws or r2; using aws`,
        );
    }
    return 'aws';
}

/**
 * @param {string | undefined} value
 */
function trimEnv(value) {
    return String(value ?? '').trim();
}

/**
 * @param {{ region: string, bucket: string, accessKeyId: string, secretAccessKey: string, sessionToken?: string, endpoint?: string, forcePathStyle?: boolean }} opts
 * @returns {import('@aws-sdk/client-s3').S3Client | null}
 */
function createS3Client(opts) {
    const { region, bucket, accessKeyId, secretAccessKey, sessionToken, endpoint, forcePathStyle } =
        opts;
    if (!region || !bucket) return null;
    /** @type {import('@aws-sdk/client-s3').S3ClientConfig} */
    const config = {
        region,
        // Avoid auto CRC32 checksums on presigned PUTs — browsers cannot send x-amz-checksum-* headers.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
    };
    if (endpoint) {
        config.endpoint = endpoint;
    }
    if (forcePathStyle) {
        config.forcePathStyle = true;
    }
    if (accessKeyId && secretAccessKey) {
        config.credentials = {
            accessKeyId,
            secretAccessKey,
            ...(sessionToken ? { sessionToken } : {}),
        };
    }
    return new S3Client(config);
}

/**
 * @typedef {{ client: import('@aws-sdk/client-s3').S3Client, bucket: string, publicBaseUrl: string, name: 'aws' | 'r2', hasEnvKeys: boolean }} StorageBackend
 */

/** @type {StorageBackend | null} */
let awsBackend = null;
/** @type {StorageBackend | null} */
let r2Backend = null;

function initBackends() {
    if (awsBackend !== null || r2Backend !== null) return;

    const awsRegion = trimEnv(process.env.AWS_REGION || process.env.S3_REGION);
    const awsBucket = trimEnv(process.env.S3_BUCKET);
    const awsAccessKeyId = trimEnv(process.env.AWS_ACCESS_KEY_ID);
    const awsSecretAccessKey = trimEnv(process.env.AWS_SECRET_ACCESS_KEY);
    const awsSessionToken = trimEnv(process.env.AWS_SESSION_TOKEN);
    const s3PublicBase =
        trimEnv(process.env.S3_PUBLIC_BASE_URL) ||
        (awsBucket && awsRegion ? `https://${awsBucket}.s3.${awsRegion}.amazonaws.com` : '');

    const awsClient = createS3Client({
        region: awsRegion,
        bucket: awsBucket,
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
        sessionToken: awsSessionToken || undefined,
    });
    if (awsClient && awsBucket) {
        awsBackend = {
            client: awsClient,
            bucket: awsBucket,
            publicBaseUrl: s3PublicBase || DEFAULT_CDN_BASE,
            name: 'aws',
            hasEnvKeys: Boolean(awsAccessKeyId && awsSecretAccessKey),
        };
    }

    const r2Bucket = trimEnv(process.env.R2_BUCKET) || 'fusion-app';
    const r2AccessKeyId = trimEnv(process.env.R2_ACCESS_KEY_ID);
    const r2SecretAccessKey = trimEnv(process.env.R2_SECRET_ACCESS_KEY);
    const r2AccountId = trimEnv(process.env.R2_ACCOUNT_ID);
    const r2Endpoint =
        trimEnv(process.env.R2_ENDPOINT) ||
        (r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : '');
    const r2PublicBase =
        trimEnv(process.env.R2_PUBLIC_BASE_URL) ||
        trimEnv(process.env.S3_PUBLIC_BASE_URL) ||
        DEFAULT_CDN_BASE;

    const r2Client = createS3Client({
        region: 'auto',
        bucket: r2Bucket,
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
        endpoint: r2Endpoint || undefined,
        forcePathStyle: Boolean(r2Endpoint),
    });
    if (r2Client && r2Bucket && r2Endpoint) {
        r2Backend = {
            client: r2Client,
            bucket: r2Bucket,
            publicBaseUrl: r2PublicBase,
            name: 'r2',
            hasEnvKeys: Boolean(r2AccessKeyId && r2SecretAccessKey),
        };
    }
}

/**
 * @returns {StorageBackend | null}
 */
export function getActiveStorage() {
    initBackends();
    const name = getStorageBackendName();
    return name === 'r2' ? r2Backend : awsBackend;
}

/**
 * @returns {{ storageBackend: 'aws' | 'r2', active: 'configured' | 'missing', aws: 'configured' | 'missing', r2: 'configured' | 'missing' }}
 */
export function getStorageHealth() {
    initBackends();
    const storageBackend = getStorageBackendName();
    const activeBackend = storageBackend === 'r2' ? r2Backend : awsBackend;
    return {
        storageBackend,
        active: activeBackend ? 'configured' : 'missing',
        aws: awsBackend ? 'configured' : 'missing',
        r2: r2Backend ? 'configured' : 'missing',
    };
}

/**
 * Human-readable hint when presign fails due to missing credentials.
 * @returns {string}
 */
export function storageCredentialsErrorHint() {
    const name = getStorageBackendName();
    if (name === 'r2') {
        return 'R2 credentials not available. On Render (and similar), set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY (and R2_ENDPOINT or R2_ACCOUNT_ID) for an R2 API token with write access to the bucket.';
    }
    return 'AWS credentials not available. On Render (and similar), set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY for an IAM user with s3:PutObject on this bucket. Locally you can use ~/.aws/credentials instead.';
}
