import mongoose from "mongoose";

const DetailSchema = new mongoose.Schema(
  {
    char: { type: String, required: true },
    score: { type: Number, required: true },
  },
  { _id: false }
);

const PracticeRecordSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
    questionSetId: { type: mongoose.Schema.Types.ObjectId, ref: "QuestionSet" },
    refText: { type: String, required: true },
    overall: { type: Number, required: true },
    rank: { type: String },
    details: [DetailSchema],
  },
  { timestamps: true }
);

PracticeRecordSchema.index({ questionId: 1 });
PracticeRecordSchema.index({ questionSetId: 1 });
PracticeRecordSchema.index({ createdAt: -1 });

export default mongoose.models.PracticeRecord ||
  mongoose.model("PracticeRecord", PracticeRecordSchema);
