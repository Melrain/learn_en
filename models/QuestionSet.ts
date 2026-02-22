import mongoose from "mongoose";

const QuestionSetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    sortOrder: { type: Number, default: 0 },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
  },
  { timestamps: true },
);

QuestionSetSchema.index({ name: "text" });

export default mongoose.models.QuestionSet ||
  mongoose.model("QuestionSet", QuestionSetSchema);
