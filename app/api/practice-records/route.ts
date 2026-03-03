import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import PracticeRecord from "@/models/PracticeRecord";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { questionId, questionSetId, refText, overall, rank, details } = body;

    if (!refText || typeof overall !== "number") {
      return NextResponse.json(
        { error: "refText and overall are required" },
        { status: 400 }
      );
    }

    const record = await PracticeRecord.create({
      questionId: questionId || null,
      questionSetId: questionSetId || null,
      refText,
      overall,
      rank: rank ?? null,
      details: Array.isArray(details) ? details : [],
    });

    return NextResponse.json(record);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to save practice record" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? "20", 10), 1),
      100
    );
    const questionId = searchParams.get("questionId") ?? undefined;
    const questionSetId = searchParams.get("questionSetId") ?? undefined;

    const filter: Record<string, unknown> = {};
    if (questionId) filter.questionId = questionId;
    if (questionSetId) filter.questionSetId = questionSetId;

    const records = await PracticeRecord.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(records);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch practice records" },
      { status: 500 }
    );
  }
}
