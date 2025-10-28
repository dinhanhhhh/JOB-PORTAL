import type { Request, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import SeekerProfile from "../models/SeekerProfile";
import { uploadToCloudinary } from "../services/cloudinary.service";

const updateProfileSchema = z.object({
  phone: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().max(500).optional(),
  skills: z.array(z.string()).optional(),
  experience: z.string().optional(),
  education: z.string().optional(),
  github: z.string().url().optional().or(z.literal("")),
  portfolio: z.string().url().optional().or(z.literal("")),
  linkedin: z.string().url().optional().or(z.literal("")),
});

export async function getSeekerProfile(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const seekerId = req.authenticatedUser?._id;
    if (!seekerId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    console.log("Getting profile for seekerId:", seekerId);

    // Convert string ID to ObjectId
    const userObjectId = new Types.ObjectId(seekerId);
    let profile = await SeekerProfile.findOne({ user: userObjectId });

    if (!profile) {
      console.log("Creating new profile for seekerId:", seekerId);
      // Tạo profile rỗng nếu chưa có
      profile = await SeekerProfile.create({
        user: userObjectId,
        skills: [],
      });
    }

    res.json({ profile });
  } catch (error) {
    console.error("Error in getSeekerProfile:", error);
    res.status(500).json({
      message: "Failed to fetch profile",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function updateSeekerProfile(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const seekerId = req.authenticatedUser?._id;
    if (!seekerId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const validated = updateProfileSchema.parse(req.body);

    const userObjectId = new Types.ObjectId(seekerId);
    const profile = await SeekerProfile.findOneAndUpdate(
      { user: userObjectId },
      validated,
      { new: true, upsert: true }
    );

    res.json({ message: "Profile updated", profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({ message: "Validation error", errors: error.flatten() });
      return;
    }
    console.error("Error in updateSeekerProfile:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
}

export async function uploadAvatar(req: Request, res: Response): Promise<void> {
  try {
    const seekerId = req.authenticatedUser?._id;
    if (!seekerId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const result = await uploadToCloudinary(req.file.path, "avatars", "image");

    const userObjectId = new Types.ObjectId(seekerId);
    const profile = await SeekerProfile.findOneAndUpdate(
      { user: userObjectId },
      { avatar: result.secure_url },
      { new: true, upsert: true }
    );

    res.json({
      message: "Avatar uploaded successfully",
      avatarUrl: result.secure_url,
      profile,
    });
  } catch (error) {
    console.error("Error in uploadAvatar:", error);
    res.status(500).json({ message: "Failed to upload avatar" });
  }
}

export async function uploadResume(req: Request, res: Response): Promise<void> {
  try {
    const seekerId = req.authenticatedUser?._id;
    if (!seekerId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const result = await uploadToCloudinary(req.file.path, "resumes", "raw");

    const userObjectId = new Types.ObjectId(seekerId);
    const profile = await SeekerProfile.findOneAndUpdate(
      { user: userObjectId },
      { resumeUrl: result.secure_url },
      { new: true, upsert: true }
    );

    res.json({
      message: "Resume uploaded successfully",
      resumeUrl: result.secure_url,
      profile,
    });
  } catch (error) {
    console.error("Error in uploadResume:", error);
    res.status(500).json({ message: "Failed to upload resume" });
  }
}
