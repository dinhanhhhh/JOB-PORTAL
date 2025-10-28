import mongoose, { Schema, Document } from "mongoose";

export interface ISeekerProfile extends Document {
  user: mongoose.Types.ObjectId;
  phone?: string;
  location?: string;
  bio?: string;
  skills: string[];
  experience?: string;
  education?: string;
  github?: string;
  portfolio?: string;
  linkedin?: string;
  avatar?: string;
  resumeUrl?: string;
}

const seekerProfileSchema = new Schema<ISeekerProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    phone: { type: String, trim: true },
    location: { type: String, trim: true },
    bio: {
      type: String,
      maxlength: [500, "Bio cannot exceed 500 characters"],
    },
    skills: { type: [String], default: [] },
    experience: String,
    education: String,
    github: { type: String, trim: true },
    portfolio: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    avatar: String,
    resumeUrl: String,
  },
  { timestamps: true }
);

// Index for text search
seekerProfileSchema.index({ skills: "text", bio: "text" });

export default mongoose.model<ISeekerProfile>(
  "SeekerProfile",
  seekerProfileSchema
);
