import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Question from "@/models/Question";
import { generateImage } from "@/lib/dashscope-image";
import { persistImageFromUrl } from "@/lib/image-storage";
import { Types } from "mongoose";

export const maxDuration = 60;

function buildImagePrompt(refText: string): string {
  const trimmed = refText.trim();
  return `Illustration for English learning: "${trimmed}". Simple, clear, educational style. Suitable for language learning context.`;
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
    const { questionId } = body as { questionId?: string };
    if (!questionId) {
      return NextResponse.json(
        { error: "questionId is required" },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(questionId)) {
      return NextResponse.json(
        { error: "Invalid questionId" },
        { status: 400 }
      );
    }

    await connectDB();
    const question = await Question.findById(questionId);
    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    const refText = question.refText?.trim();
    if (!refText) {
      return NextResponse.json(
        { error: "Question has no refText" },
        { status: 400 }
      );
    }

    const prompt = buildImagePrompt(refText);
    const { imageUrl: tempUrl } = await generateImage({ prompt });
    const persistentPath = await persistImageFromUrl(tempUrl, questionId);
    await Question.findByIdAndUpdate(questionId, {
      imageUrl: persistentPath,
    });

    return NextResponse.json({
      imageUrl: persistentPath,
    });
  } catch (e) {
    console.error("[generate-image] error:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Image generation failed",
      },
      { status: 500 }
    );
  }
}
