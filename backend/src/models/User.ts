import { Schema, model, Document } from "mongoose";
import bcrypt from "bcryptjs";
import type { UserRole } from "../types/common";

/**
 * Interface User Document
 * password là optional vì OAuth users không cần password
 */
export interface IUser extends Document {
  email: string;
  password?: string; // ✅ THÊM ? để optional
  name: string;
  role: UserRole;
  isActive: boolean;
  comparePassword(candidate: string): Promise<boolean>;
}

/**
 * User Schema
 */
const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false, // ✅ SỬA: Không bắt buộc
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["seeker", "employer", "admin"],
      default: "seeker",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/**
 * Pre-save Hook: Hash password trước khi lưu
 * CHỈ hash nếu password tồn tại (regular users)
 */
UserSchema.pre("save", async function (next) {
  // ✅ THÊM: Kiểm tra password có tồn tại không
  if (!this.password || !this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Method: So sánh password
 * Return false nếu user không có password (OAuth user)
 */
UserSchema.methods.comparePassword = function (
  candidate: string
): Promise<boolean> {
  // ✅ THÊM: Kiểm tra password tồn tại
  if (!this.password) {
    return Promise.resolve(false);
  }

  return bcrypt.compare(candidate, this.password);
};

export default model<IUser>("User", UserSchema);
