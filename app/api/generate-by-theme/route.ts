import { NextRequest, NextResponse } from "next/server";
import { HumanMessage } from "@langchain/core/messages";
import connectDB from "@/lib/db";
import Question from "@/models/Question";
import QuestionSet from "@/models/QuestionSet";
import { llm } from "@/lib/langgraph/llm";
import { QUESTION_TYPES } from "@/lib/constants";
import {
  THEMES,
  THEME_IMAGE_PROMPTS,
  type ThemeId,
} from "@/lib/themes";
import { generateImage } from "@/lib/dashscope-image";
import { persistImageFromUrl } from "@/lib/image-storage";
import type { Types } from "mongoose";

export const maxDuration = 60;

function getCoreTypeFromType(type: string): string {
  const config = QUESTION_TYPES[type as keyof typeof QUESTION_TYPES];
  return config?.coreType ?? "en.word.score";
}

export type ContentType = "word" | "phrase" | "sentence";

function parseItemsFromLlmResponse(content: string): string[] {
  const raw = typeof content === "string" ? content : String(content);
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array in LLM response");
  const parsed = JSON.parse(jsonMatch[0]) as unknown;
  if (!Array.isArray(parsed))
    throw new Error("LLM response is not an array");
  return parsed
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const o = item as { word?: unknown; text?: unknown };
        const v = o.word ?? o.text;
        return v != null ? String(v).trim() : null;
      }
      return null;
    })
    .filter((w): w is string => !!w && w.length > 0);
}

function buildPrompt(
  count: number,
  themeLabel: string,
  contentType: ContentType
): string {
  switch (contentType) {
    case "word":
      return `Generate ${count} simple English words for kids (4-10 years old), theme: ${themeLabel}.
Each word: 3-8 letters, easy to pronounce, suitable for the theme.
Return ONLY a JSON array, no other text. Example: [{"word":"hero"},{"word":"light"}]
JSON array:`;
    case "phrase":
      return `Generate ${count} short English phrases for kids (4-10 years old), theme: ${themeLabel}.
Each phrase: 2-6 words, easy to pronounce, suitable for the theme.
Return ONLY a JSON array. Example: [{"text":"fight the monster"},{"text":"the hero flies"}]
JSON array:`;
    case "sentence":
      return `Generate ${count} simple complete English sentences for kids (4-10 years old), theme: ${themeLabel}.
Each sentence: 5-12 words, simple grammar, suitable for the theme.
Return ONLY a JSON array. Example: [{"text":"The hero saves the day."}]
JSON array:`;
  }
}

function getQuestionTypeAndLabel(
  contentType: ContentType
): { type: "en-word" | "en-sentence"; label: string } {
  switch (contentType) {
    case "word":
      return { type: "en-word", label: "单词" };
    case "phrase":
      return { type: "en-sentence", label: "短语" };
    case "sentence":
      return { type: "en-sentence", label: "句子" };
  }
}

function buildImagePrompt(refText: string, themeId?: ThemeId): string {
  const trimmed = refText.trim();
  const style =
    themeId && themeId in THEME_IMAGE_PROMPTS
      ? THEME_IMAGE_PROMPTS[themeId as ThemeId]
      : "cartoon, kid-friendly";
  return `Kids-friendly illustration, ${style}. Show "${trimmed}" in a cute, cartoon way. Bright colors, no text in image. Educational for children.`;
}

export async function POST(request: NextRequest) {
  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json(
      { error: "DEEPSEEK_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const {
      theme,
      count = 5,
      generateImages = false,
      contentType = "word",
    } = body as {
      theme?: ThemeId;
      count?: number;
      generateImages?: boolean;
      contentType?: ContentType;
    };

    const validThemeIds = THEMES.map((t) => t.id);
    if (!theme || !validThemeIds.includes(theme)) {
      return NextResponse.json(
        { error: "theme is required and must be a valid theme id" },
        { status: 400 }
      );
    }

    const validContentTypes: ContentType[] = ["word", "phrase", "sentence"];
    const ct: ContentType = validContentTypes.includes(contentType)
      ? contentType
      : "word";

    const countNum = Math.min(15, Math.max(3, Number(count) || 5));
    const themeLabel = THEMES.find((t) => t.id === theme)?.label ?? theme;
    const { type: questionType, label: typeLabel } =
      getQuestionTypeAndLabel(ct);

    const prompt = buildPrompt(countNum, themeLabel, ct);

    const response = await llm.invoke([new HumanMessage(prompt)]);
    const text =
      typeof response.content === "string"
        ? response.content
        : Array.isArray(response.content)
          ? (response.content as { text?: string }[])
              .map((b) => b.text ?? "")
              .join("")
          : "";
    const items = parseItemsFromLlmResponse(text);
    if (items.length === 0) {
      return NextResponse.json(
        { error: "LLM did not return valid items" },
        { status: 500 }
      );
    }

    await connectDB();

    const ids: Types.ObjectId[] = [];
    for (const refText of items) {
      const doc = await Question.create({
        refText,
        type: questionType,
        coreType: getCoreTypeFromType(questionType),
        difficulty: 1,
        sortOrder: ids.length,
        source: "ai",
        theme,
      });
      ids.push(doc._id);
    }

    const setName = `${themeLabel}${typeLabel}`;
    const setDoc = await QuestionSet.create({
      name: setName,
      description: `AI 生成的练习题（${ids.length} 道${typeLabel}），主题：${themeLabel}`,
      sortOrder: 0,
      questionIds: ids,
    });

    if (generateImages && process.env.DASHSCOPE_API_KEY) {
      for (let i = 0; i < ids.length; i++) {
        try {
          const questionId = ids[i];
          const q = await Question.findById(questionId).lean();
          const refText = q?.refText?.trim();
          if (refText) {
            const imgPrompt = buildImagePrompt(refText, theme);
            const { imageUrl: tempUrl } = await generateImage({
              prompt: imgPrompt,
            });
            const persistentPath = await persistImageFromUrl(
              tempUrl,
              String(questionId)
            );
            await Question.findByIdAndUpdate(questionId, {
              imageUrl: persistentPath,
            });
          }
        } catch (e) {
          console.error("[generate-by-theme] image gen error:", ids[i], e);
        }
      }
    }

    return NextResponse.json({
      setId: String(setDoc._id),
      count: ids.length,
    });
  } catch (e) {
    console.error("[generate-by-theme] error:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Generate by theme failed",
      },
      { status: 500 }
    );
  }
}
