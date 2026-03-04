import { z } from "zod";

export const questionSchema = z.object({
  refText: z.string().min(1, "参考文本不能为空"),
  type: z.enum(["en-word", "en-sentence", "en-paragraph"]),
  coreType: z.string().optional(),
  difficulty: z.number().min(1).max(5),
  sortOrder: z.number().int().min(0),
  imageUrl: z.string().optional().nullable(),
  source: z.enum(["manual", "ai"]),
});

export type QuestionFormValues = z.infer<typeof questionSchema>;

export const setSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
  description: z.string(),
  sortOrder: z.number().int().min(0),
  questionIds: z.array(z.string()),
});

export type SetFormValues = z.infer<typeof setSchema>;
