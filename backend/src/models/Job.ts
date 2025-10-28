import mongoose, { Schema, Document } from "mongoose";

// ✅ Enum types theo prompt
export type JobLevel = "entry" | "mid" | "senior" | "lead" | "executive";
export type JobType =
  | "full-time"
  | "part-time"
  | "contract"
  | "internship"
  | "freelance";

export interface IJob extends Document {
  title: string;
  description: string;
  requirements: string[]; // ✅ THÊM (optional field)
  skills: string[];
  location?: string; // ✅ Optional (không required)
  isRemote: boolean; // ✅ Đổi từ "remote" → "isRemote"
  salaryMin?: number; // ✅ Optional
  salaryMax?: number; // ✅ Optional
  level: JobLevel; // ✅ Enum chuẩn
  type: JobType; // ✅ THÊM field type (QUAN TRỌNG)
  employer: mongoose.Types.ObjectId;
  company: mongoose.Types.ObjectId;
  isActive: boolean; // ✅ Đổi từ "isOpen" → "isActive"
  closedAt?: Date; // ✅ THÊM field closedAt
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    requirements: {
      // ✅ THÊM
      type: [String],
      default: [],
    },
    skills: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: "At least one skill is required",
      },
    },
    location: String, // ✅ Optional (không required)
    isRemote: {
      // ✅ Đổi tên
      type: Boolean,
      default: false,
    },
    salaryMin: {
      // ✅ Optional + validation
      type: Number,
      min: 0,
    },
    salaryMax: {
      // ✅ Optional + validation
      type: Number,
      min: 0,
    },
    level: {
      type: String,
      enum: ["entry", "mid", "senior", "lead", "executive"], // ✅ Lowercase theo prompt
      required: true,
    },
    type: {
      // ✅ THÊM field type (BẮT BUỘC)
      type: String,
      enum: ["full-time", "part-time", "contract", "internship", "freelance"],
      required: true,
    },
    employer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    isActive: {
      // ✅ Đổi tên từ isOpen
      type: Boolean,
      default: true,
    },
    closedAt: Date, // ✅ THÊM field closedAt
  },
  { timestamps: true }
);

// ✅ Indexes cho performance
jobSchema.index({ createdAt: -1 });
jobSchema.index({ isActive: 1 });
// ✅ Text index cho search
jobSchema.index({ title: "text", description: "text", skills: "text" }); // THÊM skills
export default mongoose.model<IJob>("Job", jobSchema);
