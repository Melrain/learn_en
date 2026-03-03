/**
 * 图片持久化流水线：从临时 URL 下载 → 上传到 S3/MinIO → 返回持久化路径
 */

import { uploadToS3 } from "./s3";

const IMAGE_PREFIX = "questions";

/**
 * 从临时 URL 下载图片，上传到 S3，返回可在前端使用的持久化路径。
 * 路径格式：/api/s3-image/questions/{id}.png
 */
export async function persistImageFromUrl(
  tempUrl: string,
  objectId: string
): Promise<string> {
  const res = await fetch(tempUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? "image/png";
  const ext = contentType.includes("png") ? "png" : "jpg";
  const key = `${IMAGE_PREFIX}/${objectId}.${ext}`;
  await uploadToS3(key, buffer, contentType);
  return `/api/s3-image/${key}`;
}
