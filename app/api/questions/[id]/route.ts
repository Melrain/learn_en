import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectDB from "@/lib/db";
import Question from "@/models/Question";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid question id" }, { status: 400 });
    }

    await connectDB();
    const question = await Question.findById(id).lean();
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }
    return NextResponse.json(question);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch question" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid question id" }, { status: 400 });
    }

    await connectDB();
    const body = await request.json();
    const { refText, type, coreType, difficulty, sortOrder, imageUrl, source } =
      body;

    if (!refText || !type) {
      return NextResponse.json(
        { error: "refText and type are required" },
        { status: 400 },
      );
    }

    const question = await Question.findByIdAndUpdate(
      id,
      {
        refText,
        type,
        coreType: coreType ?? null,
        difficulty: difficulty ?? 1,
        sortOrder: sortOrder ?? 0,
        imageUrl: imageUrl ?? null,
        source: source ?? "manual",
      },
      { new: true },
    ).lean();

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }
    return NextResponse.json(question);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid question id" }, { status: 400 });
    }

    await connectDB();
    const question = await Question.findByIdAndDelete(id);
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 },
    );
  }
}
