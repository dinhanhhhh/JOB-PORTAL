import mongoose, { Schema, Document } from "mongoose";

export type ApplicationStatus =
  | "submitted"
  | "viewed"
  | "accepted"
  | "rejected";

export interface IApplication extends Document {
  job: mongoose.Types.ObjectId;
  seeker: mongoose.Types.ObjectId;
  resumeUrl: string;
  coverLetter?: string; // ✅ đổi từ note → coverLetter
  status: ApplicationStatus;
  viewedAt?: Date; // ✅ Có trong interface
  respondedAt?: Date; // ✅ Có trong interface
  createdAt: Date; // ✅ Thêm (từ timestamps: true)
  updatedAt: Date; // ✅ Thêm (từ timestamps: true)
}

const applicationSchema = new Schema<IApplication>(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    seeker: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    resumeUrl: {
      type: String,
      required: true,
    },
    coverLetter: String,
    status: {
      type: String,
      enum: ["submitted", "viewed", "accepted", "rejected"],
      default: "submitted",
    },
    // ✅ THÊM 2 DÒNG NÀY VÀO SCHEMA
    viewedAt: { type: Date },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

// ✅ Index đúng
applicationSchema.index({ job: 1, seeker: 1 }, { unique: true });

export default mongoose.model<IApplication>("Application", applicationSchema);
