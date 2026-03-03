import type { Types } from "mongoose";

export interface IQuestion {
  _id: Types.ObjectId | string;
  refText: string;
  type: string;
  coreType?: string;
  difficulty?: number;
  sortOrder?: number;
  source?: "manual" | "ai";
  imageUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IQuestionSet {
  _id: Types.ObjectId | string;
  name: string;
  description?: string;
  sortOrder?: number;
  questionIds: (Types.ObjectId | IQuestion)[];
  createdAt?: Date;
  updatedAt?: Date;
}

/** 题集（populate 后），questionIds 为完整题目对象 */
export interface IQuestionSetPopulated
  extends Omit<IQuestionSet, "questionIds"> {
  questionIds: IQuestion[];
}
