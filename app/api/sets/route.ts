import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import QuestionSet from "@/models/QuestionSet";

export async function GET() {
  try {
    await connectDB();
    const sets = await QuestionSet.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate("questionIds")
      .lean();
    return NextResponse.json(sets);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch sets" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { name, description, sortOrder, questionIds } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const set = await QuestionSet.create({
      name,
      description: description ?? "",
      sortOrder: sortOrder ?? 0,
      questionIds: questionIds ?? [],
    });

    return NextResponse.json(set);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create set" },
      { status: 500 },
    );
  }
}
