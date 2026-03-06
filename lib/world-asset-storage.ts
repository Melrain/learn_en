/**
 * 世界资产图片持久化：从临时 URL 下载 → 上传到 S3/MinIO → 返回持久化路径
 */

import { uploadToS3 } from "./s3";

const ASSET_PREFIX = "world-assets";

/**
 * 从临时 URL 下载图片，上传到 S3，返回可在前端使用的持久化路径。
 * 路径格式：/api/s3-image/world-assets/{themeId}/{assetId}.png
 */
export async function persistWorldAssetImage(
  tempUrl: string,
  themeId: string,
  assetId: string
): Promise<string> {
  const res = await fetch(tempUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? "image/png";
  const ext = contentType.includes("png") ? "png" : "jpg";
  const key = `${ASSET_PREFIX}/${themeId}/${assetId}.${ext}`;
  await uploadToS3(key, buffer, contentType);
  return `/api/s3-image/${key}`;
}
