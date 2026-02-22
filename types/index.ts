import type { Types } from "mongoose";

export interface IQuestion {
  _id: Types.ObjectId;
  refText: string;
  type: string;
  coreType?: string;
  difficulty: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuestionSet {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  sortOrder: number;
  questionIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
