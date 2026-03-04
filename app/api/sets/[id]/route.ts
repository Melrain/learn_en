import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectDB from "@/lib/db";
import QuestionSet from "@/models/QuestionSet";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid set id" }, { status: 400 });
    }

    await connectDB();
    const set = await QuestionSet.findById(id)
      .populate("questionIds")
      .lean();
    if (!set) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }
    return NextResponse.json(set);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch set" },
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
      return NextResponse.json({ error: "Invalid set id" }, { status: 400 });
    }

    await connectDB();
    const body = await request.json();
    const { name, description, sortOrder, questionIds } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 },
      );
    }

    const validQuestionIds = Array.isArray(questionIds)
      ? (questionIds as string[])
          .filter((qId: string) => Types.ObjectId.isValid(qId))
          .map((qId: string) => new Types.ObjectId(qId))
      : [];

    const set = await QuestionSet.findByIdAndUpdate(
      id,
      {
        name,
        description: description ?? "",
        sortOrder: sortOrder ?? 0,
        questionIds: validQuestionIds,
      },
      { new: true },
    )
      .populate("questionIds")
      .lean();

    if (!set) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }
    return NextResponse.json(set);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update set" },
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
      return NextResponse.json({ error: "Invalid set id" }, { status: 400 });
    }

    await connectDB();
    const set = await QuestionSet.findByIdAndDelete(id);
    if (!set) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete set" },
      { status: 500 },
    );
  }
}
