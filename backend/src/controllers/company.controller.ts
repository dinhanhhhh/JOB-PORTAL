import fs from "fs";
import type { Request, Response } from "express";
import { z } from "zod";
import Company from "../models/Company.js";
import { MongoServerError } from "mongodb";
import { uploadToCloudinary } from "../services/cloudinary.service.js";

const companySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters long"),
  description: z.string().trim().optional(),
  website: z
    .string()
    .trim()
    .url("Invalid URL format")
    .optional()
    .or(z.literal("")),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
  location: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  size: z.string().trim().optional(),
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

function cleanupTempFile(filePath: string | undefined): void {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.warn("Failed to delete temporary file:", err);
    }
  }
}

/**
 * GET /api/company/me
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
 * PUT /api/company/me
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
    const updatePayload: Record<string, unknown> = {
      name: parsed.data.name,
      owner: employerId,
    };

    if (parsed.data.description !== undefined) {
      updatePayload.description = parsed.data.description;
    }
    if (parsed.data.website !== undefined) {
      updatePayload.website = parsed.data.website;
    }
    if (parsed.data.logoUrl !== undefined && parsed.data.logoUrl !== "") {
      updatePayload.logoUrl = parsed.data.logoUrl;
    }
    if (parsed.data.location !== undefined) {
      updatePayload.location = parsed.data.location;
    }
    if (parsed.data.industry !== undefined) {
      updatePayload.industry = parsed.data.industry;
    }
    if (parsed.data.size !== undefined) {
      updatePayload.size = parsed.data.size;
    }

    const company = await Company.findOneAndUpdate(
      { owner: employerId },
      updatePayload,
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
      cleanupTempFile(req.file?.path);
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    // Verify company exists BEFORE uploading to Cloudinary to avoid orphan remote assets
    const company = await Company.findOne({ owner: employerId });
    if (!company) {
      cleanupTempFile(req.file.path);
      res.status(404).json({
        message: "Company not found. Please create company profile first.",
      });
      return;
    }

    const result = await uploadToCloudinary(
      req.file.path,
      "company-logos",
      "image"
    );

    company.logoUrl = result.secure_url;
    await company.save();

    res.json({
      message: "Logo uploaded successfully",
      logoUrl: result.secure_url,
      company,
    });
  } catch (error) {
    cleanupTempFile(req.file?.path);
    console.error("Upload logo error:", error);
    res.status(500).json({ message: "Failed to upload logo" });
  }
}
