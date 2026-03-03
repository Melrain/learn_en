import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET } from "@/lib/s3";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const pathParts = (await params).path;
  if (!pathParts?.length) {
    return NextResponse.json({ error: "Path required" }, { status: 400 });
  }
  const key = pathParts.join("/");
  if (key.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  try {
    const cmd = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });
    const obj = await s3Client.send(cmd);
    const body = obj.Body;
    const contentType = obj.ContentType ?? "image/png";
    if (!body) {
      return NextResponse.json({ error: "Empty object" }, { status: 404 });
    }
    const arrayBuffer = await body.transformToByteArray();
    return new NextResponse(Buffer.from(arrayBuffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
