// models/Company.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ICompany extends Document {
  name: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  location?: string;
  industry?: string;
  size?: string;
  owner: mongoose.Types.ObjectId; // employer user
}

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, unique: true },
    description: String,
    website: String,
    logoUrl: String,
    location: String,
    industry: String,
    size: String,
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICompany>("Company", companySchema);
