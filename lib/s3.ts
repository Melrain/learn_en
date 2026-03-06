import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";

const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
const accessKey = process.env.S3_ACCESS_KEY ?? "minioadmin";
const secretKey = process.env.S3_SECRET_KEY ?? "minioadmin";
const bucket = process.env.S3_BUCKET ?? "learn-en-images";
const region = process.env.S3_REGION ?? "us-east-1";

export const s3Client = new S3Client({
  endpoint,
  region,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
  forcePathStyle: true, // required for MinIO
});

export const S3_BUCKET = bucket;

let bucketEnsured = false;

async function ensureBucket() {
  if (bucketEnsured) return;
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
  } catch {
    await s3Client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
  }
  bucketEnsured = true;
}

/**
 * Upload buffer to S3/MinIO and return the object key (path).
 * Caller can construct full URL from this key.
 */
export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType = "image/png"
): Promise<string> {
  await ensureBucket();
  const params: PutObjectCommandInput = {
    Bucket: S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  };
  await s3Client.send(new PutObjectCommand(params));
  return key;
}

/**
 * Delete an object from S3 by key.
 */
export async function deleteFromS3(key: string): Promise<void> {
  await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}
