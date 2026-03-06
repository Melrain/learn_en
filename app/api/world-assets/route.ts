import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import WorldAsset from "@/models/WorldAsset";
import { generateImage } from "@/lib/dashscope-image";
import { persistWorldAssetImage } from "@/lib/world-asset-storage";
import { THEME_IMAGE_PROMPTS, THEMES, type ThemeId } from "@/lib/themes";
import { Types } from "mongoose";

export const maxDuration = 60;

function buildFullPrompt(prompt: string, themeId: ThemeId): string {
  const style = THEME_IMAGE_PROMPTS[themeId] ?? "cartoon, kid-friendly";
  return `Kids-friendly illustration, ${style}. ${prompt}. Bright colors, no text in image. Educational for children.`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const themeId = searchParams.get("themeId");

  if (!themeId) {
    return NextResponse.json(
      { error: "themeId is required" },
      { status: 400 }
    );
  }

  const validThemeIds = THEMES.map((t) => t.id);
  if (!validThemeIds.includes(themeId as ThemeId)) {
    return NextResponse.json(
      { error: "Invalid themeId" },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const assets = await WorldAsset.find({ themeId })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(assets);
  } catch (e) {
    console.error("[world-assets GET] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "List failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DASHSCOPE_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { themeId, prompt } = body as { themeId?: string; prompt?: string };

    if (!themeId || !prompt?.trim()) {
      return NextResponse.json(
        { error: "themeId and prompt are required" },
        { status: 400 }
      );
    }

    const validThemeIds = THEMES.map((t) => t.id);
    if (!validThemeIds.includes(themeId as ThemeId)) {
      return NextResponse.json(
        { error: "Invalid themeId" },
        { status: 400 }
      );
    }

    const fullPrompt = buildFullPrompt(prompt.trim(), themeId as ThemeId);
    const { imageUrl: tempUrl } = await generateImage({ prompt: fullPrompt });
    const assetId = new Types.ObjectId().toString();
    const s3Path = await persistWorldAssetImage(tempUrl, themeId, assetId);

    await connectDB();
    const asset = await WorldAsset.create({
      themeId,
      type: "image",
      prompt: prompt.trim(),
      s3Path,
    });

    return NextResponse.json({ asset });
  } catch (e) {
    console.error("[world-assets POST] error:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Image generation failed",
      },
      { status: 500 }
    );
  }
}
