import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Question from "@/models/Question";

export async function GET() {
  try {
    await connectDB();
    const questions = await Question.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    return NextResponse.json(questions);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { refText, type, coreType, difficulty, sortOrder } = body;

    if (!refText || !type) {
      return NextResponse.json(
        { error: "refText and type are required" },
        { status: 400 },
      );
    }

    const question = await Question.create({
      refText,
      type,
      coreType: coreType ?? null,
      difficulty: difficulty ?? 1,
      sortOrder: sortOrder ?? 0,
    });

    return NextResponse.json(question);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 },
    );
  }
}
