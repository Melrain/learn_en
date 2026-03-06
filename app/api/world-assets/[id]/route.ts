import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectDB from "@/lib/db";
import WorldAsset from "@/models/WorldAsset";
import { deleteFromS3 } from "@/lib/s3";

function s3PathToKey(s3Path: string): string {
  const prefix = "/api/s3-image/";
  if (s3Path.startsWith(prefix)) {
    return s3Path.slice(prefix.length);
  }
  return s3Path;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid asset id" },
        { status: 400 }
      );
    }

    await connectDB();
    const asset = await WorldAsset.findByIdAndDelete(id);
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    try {
      const key = s3PathToKey(asset.s3Path);
      await deleteFromS3(key);
    } catch (e) {
      console.warn("[world-assets DELETE] S3 delete failed:", e);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[world-assets DELETE] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 }
    );
  }
}
