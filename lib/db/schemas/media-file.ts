import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMediaFile extends Document {
  orgId: mongoose.Types.ObjectId; // ref: Employer, required, indexed
  r2Key: string; // full R2 object key e.g. "org_abc123/files/photo.jpg"
  originalName: string; // original filename
  mimeType: string;
  sizeBytes: number;
  uploadedBy: mongoose.Types.ObjectId; // ref: User
  createdAt: Date;
  updatedAt: Date;
}

const MediaFileSchema = new Schema<IMediaFile>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    r2Key: { type: String, required: true, unique: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Compound index for efficient queries
MediaFileSchema.index({ orgId: 1, createdAt: 1 });

const MediaFile: Model<IMediaFile> =
  mongoose.models.MediaFile || mongoose.model<IMediaFile>("MediaFile", MediaFileSchema);

export default MediaFile;
