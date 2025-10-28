import type { Request, Response } from "express";
import { z } from "zod";
import Company from "../models/Company";
import { MongoServerError } from "mongodb";
import { uploadToCloudinary } from "../services/cloudinary.service"; // ✅ Thêm import ở đầu file

const companySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  description: z.string().optional(),
  website: z.string().url("Invalid URL format").optional(),
  logoUrl: z.string().url().optional(),
});

// --- Type guard: phát hiện lỗi duplicate key (11000) của Mongo ---
function isDupKeyError(err: unknown): err is MongoServerError {
  return (
    Boolean(err) &&
    typeof err === "object" &&
    "code" in (err as Record<string, unknown>) &&
    (err as MongoServerError).code === 11000
  );
}

/**
 * GET /api/users/me/company
 * Yêu cầu: requireAuth + requireRole(['employer'])
 */
export async function getMyCompany(req: Request, res: Response): Promise<void> {
  const employerId = req.authenticatedUser?._id;
  if (!employerId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const company = await Company.findOne({ owner: employerId });
  if (!company) {
    res.status(404).json({ message: "Company profile not found." });
    return;
  }

  res.status(200).json({ company });
}

/**
 * PUT /api/users/me/company
 * Upsert hồ sơ công ty của employer hiện tại
 * Yêu cầu: requireAuth + requireRole(['employer'])
 */
export async function upsertMyCompany(
  req: Request,
  res: Response
): Promise<void> {
  const employerId = req.authenticatedUser?._id;
  if (!employerId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const parsed = companySchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ message: "Invalid input data", errors: parsed.error.flatten() });
    return;
  }

  try {
    const company = await Company.findOneAndUpdate(
      { owner: employerId },
      { ...parsed.data, owner: employerId },
      { upsert: true, new: true, runValidators: true }
    );
    res.status(200).json({ company });
  } catch (error) {
    if (isDupKeyError(error)) {
      res
        .status(409)
        .json({ message: "A company with this name already exists." });
      return;
    }
    res.status(500).json({ message: "Something went wrong on the server." });
  }
}
/**
 * POST /api/company/logo
 * Upload company logo (Employer only)
 */
export async function uploadLogo(req: Request, res: Response): Promise<void> {
  try {
    const employerId = req.authenticatedUser?._id;

    if (!employerId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(
      req.file.path,
      "company-logos",
      "image"
    );

    // Update company with new logo URL
    const company = await Company.findOneAndUpdate(
      { owner: employerId },
      { logoUrl: result.secure_url },
      { new: true, upsert: false }
    );

    if (!company) {
      res.status(404).json({
        message: "Company not found. Please create company profile first.",
      });
      return;
    }

    res.json({
      message: "Logo uploaded successfully",
      logoUrl: result.secure_url,
      company,
    });
  } catch (error) {
    console.error("Upload logo error:", error);
    res.status(500).json({ message: "Failed to upload logo" });
  }
}
