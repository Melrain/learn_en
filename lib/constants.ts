/**
 * 阿里云口语评测题型与 coreType 映射
 */
export const QUESTION_TYPES = {
  "en-word": {
    coreType: "en.word.score",
    maxDuration: 20,
    label: "英文单词",
  },
  "en-sentence": {
    coreType: "en.sent.score",
    maxDuration: 40,
    label: "英文句子",
  },
  "en-paragraph": {
    coreType: "en.pred.score",
    maxDuration: 300,
    label: "英文段落",
  },
} as const;

export type QuestionTypeKey = keyof typeof QUESTION_TYPES;
