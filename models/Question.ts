import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema(
  {
    refText: { type: String, required: true },
    type: { type: String, required: true },
    coreType: { type: String },
    difficulty: { type: Number, default: 1 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

QuestionSchema.index({ type: 1 });
QuestionSchema.index({ createdAt: -1 });

export default mongoose.models.Question ||
  mongoose.model("Question", QuestionSchema);
