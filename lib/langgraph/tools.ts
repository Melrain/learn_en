import type { Types } from "mongoose";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import connectDB from "@/lib/db";
import PracticeRecord from "@/models/PracticeRecord";
import Question from "@/models/Question";
import QuestionSet from "@/models/QuestionSet";
import { QUESTION_TYPES } from "@/lib/constants";

function getCoreTypeFromType(type: string): string {
  const config = QUESTION_TYPES[type as keyof typeof QUESTION_TYPES];
  return config?.coreType ?? "en.sent.score";
}

export const getPracticeHistory = tool(
  async ({ limit }) => {
    await connectDB();
    const records = await PracticeRecord.find()
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 50))
      .lean();
    return JSON.stringify(
      records.map((r) => ({
        refText: r.refText,
        overall: r.overall,
        rank: r.rank,
        createdAt: r.createdAt,
      })),
      null,
      2
    );
  },
  {
    name: "get_practice_history",
    description:
      "查询用户最近的练习历史记录，包含题目文本、得分、等级和时间。",
    schema: z.object({
      limit: z
        .number()
        .min(1)
        .max(50)
        .default(20)
        .describe("返回的记录数量，默认20"),
    }),
  }
);

export const getQuestionStats = tool(
  async () => {
    await connectDB();
    const stats = await PracticeRecord.aggregate([
      {
        $group: {
          _id: null,
          avgScore: { $avg: "$overall" },
          maxScore: { $max: "$overall" },
          minScore: { $min: "$overall" },
          totalCount: { $sum: 1 },
        },
      },
    ]);
    if (stats.length === 0) {
      return "暂无练习记录。";
    }
    const { avgScore, maxScore, minScore, totalCount } = stats[0];
    const lowScoreRecords = await PracticeRecord.find({ overall: { $lt: 60 } })
      .sort({ overall: 1 })
      .limit(5)
      .lean();
    return JSON.stringify(
      {
        平均分: Math.round(avgScore),
        最高分: maxScore,
        最低分: minScore,
        练习总次数: totalCount,
        低分题目示例: lowScoreRecords.map((r) => ({
          refText: r.refText,
          overall: r.overall,
        })),
      },
      null,
      2
    );
  },
  {
    name: "get_question_stats",
    description:
      "获取练习统计信息：平均分、最高分、最低分、练习次数，以及得分较低的题目。",
    schema: z.object({}),
  }
);

export const listQuestions = tool(
  async ({ type, difficulty, limit }) => {
    await connectDB();
    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (difficulty != null) filter.difficulty = difficulty;
    const questions = await Question.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(Math.min(limit, 50))
      .lean();
    const sets = await QuestionSet.find()
      .populate("questionIds")
      .sort({ sortOrder: 1 })
      .lean();
    return JSON.stringify(
      {
        questions: questions.map((q) => ({
          _id: q._id,
          refText: q.refText,
          type: q.type,
          difficulty: q.difficulty,
          source: q.source,
        })),
        questionTypes: Object.keys(QUESTION_TYPES),
      },
      null,
      2
    );
  },
  {
    name: "list_questions",
    description:
      "列出题库中的题目，可按类型（en-word/en-sentence/en-paragraph）和难度筛选。",
    schema: z.object({
      type: z
        .string()
        .optional()
        .describe("题型: en-word, en-sentence, en-paragraph"),
      difficulty: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe("难度 1-5"),
      limit: z
        .number()
        .min(1)
        .max(50)
        .default(20)
        .describe("返回数量"),
    }),
  }
);

const QuestionInputSchema = z.object({
  refText: z.string().min(1).describe("题目文本，英文"),
  type: z
    .enum(["en-word", "en-sentence", "en-paragraph"])
    .describe("题型"),
  difficulty: z.number().min(1).max(5).default(1).describe("难度 1-5"),
  theme: z
    .string()
    .optional()
    .describe("可选，主题 id，如 ultraman/peppa/dinosaur/ocean 等"),
});

export const generateQuestions = tool(
  async ({ questions, setName }) => {
    await connectDB();
    const parsed = z.array(QuestionInputSchema).parse(questions);
    const created: Array<{
      _id: string;
      refText: string;
      type: string;
      coreType: string;
      difficulty: number;
    }> = [];
    const ids: Types.ObjectId[] = [];
    for (const q of parsed) {
      const coreType = getCoreTypeFromType(q.type);
      const doc = await Question.create({
        refText: q.refText.trim(),
        type: q.type,
        coreType,
        difficulty: q.difficulty ?? 1,
        sortOrder: 0,
        source: "ai",
        ...(q.theme && { theme: q.theme }),
      });
      ids.push(doc._id);
      created.push({
        _id: String(doc._id),
        refText: doc.refText,
        type: doc.type,
        coreType: doc.coreType ?? coreType,
        difficulty: doc.difficulty,
      });
    }
    let setDoc: { _id: Types.ObjectId } | null = null;
    if (ids.length > 0) {
      const setDisplayName =
        setName ?? `AI 生成练习题 (${new Date().toLocaleDateString("zh-CN")})`;
      setDoc = await QuestionSet.create({
        name: setDisplayName,
        description: `AI 生成的练习题（${ids.length} 道）`,
        sortOrder: 0,
        questionIds: ids,
      });
    }
    return JSON.stringify(
      {
        created: created.length,
        questions: created,
        setCreated: true,
        setId: setDoc ? String(setDoc._id) : undefined,
      },
      null,
      2
    );
  },
  {
    name: "generate_questions",
    description:
      "将 AI 生成的练习题写入数据库。输入题目数组，每道题目需包含 refText（英文文本）、type（en-word/en-sentence/en-paragraph）、difficulty（1-5）。可选 setName 创建新题集；可选 theme 传递主题 id（ultraman/peppa/dinosaur/ocean/space/farm/vehicles/food/ice-princess/superhero/egg-party/paw-patrol）用于儿童主题配图。",
    schema: z.object({
      questions: z.array(QuestionInputSchema).describe("题目列表"),
      setName: z
        .string()
        .optional()
        .describe("可选，创建新题集并包含这些题目"),
    }),
  }
);

export const tools = [
  getPracticeHistory,
  getQuestionStats,
  listQuestions,
  generateQuestions,
];
