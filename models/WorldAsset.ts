import mongoose from "mongoose";

const WorldAssetSchema = new mongoose.Schema(
  {
    themeId: { type: String, required: true },
    type: { type: String, enum: ["image", "video"], default: "image" },
    prompt: { type: String },
    s3Path: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

WorldAssetSchema.index({ themeId: 1, createdAt: -1 });

export default mongoose.models.WorldAsset ||
  mongoose.model("WorldAsset", WorldAssetSchema);
