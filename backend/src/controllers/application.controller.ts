import fs from "fs";
import type { Request, Response } from "express";
import { z } from "zod";
import Application from "../models/Application.js";
import Job, { type IJob } from "../models/Job.js";
import SeekerProfile from "../models/SeekerProfile.js";
import {
  fetchResumeAsset,
  uploadToCloudinary,
} from "../services/cloudinary.service.js";
import {
  generateCoverLetter,
  summarizeCandidate,
} from "../services/gemini.service.js";
import User from "../models/User.js";
import { isValidObjectId } from "../utils/validation.js";

// Validation schemas
const applyJobSchema = z.object({
  coverLetter: z
    .string()
    .max(1000, "Cover letter cannot exceed 1000 characters")
    .optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["submitted", "viewed", "accepted", "rejected"]),
});

function cleanupUploadedFile(filePath: string | undefined): void {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.warn("Failed to remove temporary upload:", err);
    }
  }
}

function extractRefId(ref: unknown): string {
  if (ref && typeof ref === "object" && "_id" in ref) {
    return String((ref as { _id: unknown })._id);
  }
  return String(ref);
}

/**
 * POST /api/applications/jobs/:jobId/apply
 * Apply to a job (Seeker only)
 */
export async function applyToJob(req: Request, res: Response): Promise<void> {
  try {
    const seekerId = req.authenticatedUser?._id;
    const { jobId } = req.params;

    if (!seekerId) {
      cleanupUploadedFile(req.file?.path);
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!isValidObjectId(jobId)) {
      cleanupUploadedFile(req.file?.path);
      res.status(400).json({ message: "Invalid job ID" });
      return;
    }

    const validated = applyJobSchema.parse(req.body);

    const job = await Job.findById(jobId);
    if (!job) {
      cleanupUploadedFile(req.file?.path);
      res.status(404).json({ message: "Job not found" });
      return;
    }

    if (!job.isActive) {
      cleanupUploadedFile(req.file?.path);
      res
        .status(400)
        .json({ message: "This job is no longer accepting applications" });
      return;
    }

    const profile = await SeekerProfile.findOne({ user: seekerId });
    if (!profile) {
      cleanupUploadedFile(req.file?.path);
      res.status(400).json({ message: "Please complete your profile first" });
      return;
    }

    const existingApp = await Application.findOne({
      job: jobId,
      seeker: seekerId,
    });

    if (existingApp) {
      cleanupUploadedFile(req.file?.path);
      res.status(400).json({ message: "You have already applied to this job" });
      return;
    }

    let resumeUrl = profile.resumeUrl;

    if (req.file) {
      const result = await uploadToCloudinary(
        req.file.path,
        "applications",
        "raw"
      );
      resumeUrl = result.secure_url;
    }

    if (!resumeUrl) {
      res.status(400).json({
        message:
          "Resume is required. Please upload a resume or add one to your profile.",
      });
      return;
    }

    const application = await Application.create({
      job: jobId,
      seeker: seekerId,
      resumeUrl,
      coverLetter: validated.coverLetter,
      status: "submitted",
    });

    await application.populate([
      { path: "job", populate: { path: "company" } },
      { path: "seeker", select: "name email" },
    ]);

    res.status(201).json({
      message: "Application submitted successfully",
      application,
    });
  } catch (error) {
    cleanupUploadedFile(req.file?.path);
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({ message: "Validation error", errors: error.flatten() });
      return;
    }
    res.status(500).json({ message: "Failed to submit application" });
  }
}

/**
 * GET /api/applications/my-applications
 * Get applications - logic khác nhau theo role
 */
export async function getMyApplications(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.authenticatedUser?._id;
    const userRole = req.authenticatedUser?.role;

    if (userRole === "seeker") {
      const applications = await Application.find({ seeker: userId })
        .populate({
          path: "job",
          populate: { path: "company" },
        })
        .sort({ createdAt: -1 });

      res.json({ applications: applications.filter((app) => Boolean(app.job)) });
      return;
    }

    if (userRole === "employer") {
      const employerJobs = await Job.find({ employer: userId }).select("_id");
      const jobIds = employerJobs.map((job) => job._id);

      const applications = await Application.find({ job: { $in: jobIds } })
        .populate({
          path: "job",
          populate: { path: "company" },
        })
        .populate({
          path: "seeker",
          select: "name email",
        })
        .sort({ createdAt: -1 });

      res.json({ applications: applications.filter((app) => Boolean(app.job)) });
      return;
    }

    if (userRole === "admin") {
      const applications = await Application.find()
        .populate({
          path: "job",
          populate: { path: "company" },
        })
        .populate({
          path: "seeker",
          select: "name email",
        })
        .sort({ createdAt: -1 });

      res.json({ applications: applications.filter((app) => Boolean(app.job)) });
      return;
    }

    res.json({ applications: [] });
  } catch (error) {
    console.error("Get applications error:", error);
    res.status(500).json({ message: "Failed to fetch applications" });
  }
}

/**
 * GET /api/applications/jobs/:jobId/applications
 * Get all applications for a job (Owner employer or admin)
 */
export async function getJobApplications(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const employerId = req.authenticatedUser?._id;
    const isAdmin = req.authenticatedUser?.role === "admin";
    const { jobId } = req.params;

    if (!isValidObjectId(jobId)) {
      res.status(400).json({ message: "Invalid job ID" });
      return;
    }

    const job = await Job.findOne(
      isAdmin ? { _id: jobId } : { _id: jobId, employer: employerId }
    );

    if (!job) {
      res.status(404).json({ message: "Job not found or unauthorized" });
      return;
    }

    const applications = await Application.find({ job: jobId })
      .populate({
        path: "seeker",
        select: "name email",
      })
      .sort({ createdAt: -1 });

    const seekerIds = Array.from(
      new Set(
        applications
          .map((app) => (app.seeker ? extractRefId(app.seeker) : ""))
          .filter((id) => id.length > 0)
      )
    );

    const profiles =
      seekerIds.length > 0
        ? await SeekerProfile.find({ user: { $in: seekerIds } })
        : [];
    const profileMap = new Map(profiles.map((p) => [String(p.user), p]));

    const applicationsWithProfiles = applications.map((app) => {
      const seekerUserId = app.seeker ? extractRefId(app.seeker) : "";
      return {
        ...app.toObject(),
        seekerProfile: profileMap.get(seekerUserId) ?? null,
      };
    });

    res.json({ applications: applicationsWithProfiles });
  } catch {
    res.status(500).json({ message: "Failed to fetch applications" });
  }
}

/**
 * PATCH /api/applications/:applicationId/status
 * Update application status (Owner employer or admin)
 */
export async function updateApplicationStatus(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const employerId = req.authenticatedUser?._id;
    const isAdmin = req.authenticatedUser?.role === "admin";
    const { applicationId } = req.params;

    if (!isValidObjectId(applicationId)) {
      res.status(400).json({ message: "Invalid application ID" });
      return;
    }

    const validated = updateStatusSchema.parse(req.body);

    const application = await Application.findById(applicationId).populate(
      "job"
    );

    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    const jobDoc = application.job as unknown as IJob | null;
    if (!jobDoc) {
      res.status(404).json({ message: "Related job not found" });
      return;
    }

    if (!isAdmin && String(jobDoc.employer) !== employerId) {
      res
        .status(403)
        .json({ message: "Unauthorized to update this application" });
      return;
    }

    application.status = validated.status;

    if (validated.status === "viewed" && !application.viewedAt) {
      application.viewedAt = new Date();
    }

    if (
      ["accepted", "rejected"].includes(validated.status) &&
      !application.respondedAt
    ) {
      application.respondedAt = new Date();
    }

    await application.save();

    res.json({
      message: "Application status updated successfully",
      application,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: "Validation error" });
      return;
    }
    res.status(500).json({ message: "Failed to update application status" });
  }
}

/**
 * GET /api/applications/:applicationId
 * Get application details
 */
export async function getApplicationById(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.authenticatedUser?._id;
    const userRole = req.authenticatedUser?.role;
    const { applicationId } = req.params;

    if (!isValidObjectId(applicationId)) {
      res.status(400).json({ message: "Invalid application ID" });
      return;
    }

    const application = await Application.findById(applicationId)
      .populate({
        path: "job",
        populate: { path: "company" },
      })
      .populate({
        path: "seeker",
        select: "name email",
      });

    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    if (userRole === "seeker") {
      if (!application.seeker || extractRefId(application.seeker) !== userId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }
    } else if (userRole === "employer") {
      const jobDoc = application.job as unknown as IJob | null;
      if (!jobDoc) {
        res.status(404).json({ message: "Related job not found" });
        return;
      }
      if (String(jobDoc.employer) !== userId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }
    }

    const seekerUserId = extractRefId(application.seeker);
    const profile = await SeekerProfile.findOne({ user: seekerUserId });

    res.json({
      application,
      seekerProfile: profile,
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch application" });
  }
}

/**
 * GET /api/applications/:applicationId/resume
 * Stream application resume PDF/DOC securely (Owner seeker, job employer, or admin)
 */
export async function streamApplicationResume(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.authenticatedUser?._id;
    const userRole = req.authenticatedUser?.role;
    const { applicationId } = req.params;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!isValidObjectId(applicationId)) {
      res.status(400).json({ message: "Invalid application ID" });
      return;
    }

    const application = await Application.findById(applicationId).populate(
      "job"
    );

    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    if (userRole === "seeker") {
      if (!application.seeker || extractRefId(application.seeker) !== userId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }
    } else if (userRole === "employer") {
      const jobDoc = application.job as unknown as IJob | null;
      if (!jobDoc) {
        res.status(404).json({ message: "Related job not found" });
        return;
      }
      if (String(jobDoc.employer) !== userId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }
    } else if (userRole !== "admin") {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    if (!application.resumeUrl) {
      res.status(404).json({ message: "Resume not found" });
      return;
    }

    const asset = await fetchResumeAsset(application.resumeUrl);
    res.setHeader("Content-Type", asset.contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${asset.filename}"`
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.send(asset.buffer);
  } catch (error) {
    console.error("Error in streamApplicationResume:", error);
    res.status(502).json({
      message:
        error instanceof Error ? error.message : "Failed to load resume file",
    });
  }
}

/**
 * DELETE /api/applications/:applicationId
 * Seeker withdraws a pending application (submitted or viewed)
 */
export async function withdrawApplication(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const seekerId = req.authenticatedUser?._id;
    const { applicationId } = req.params;

    if (!seekerId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!isValidObjectId(applicationId)) {
      res.status(400).json({ message: "Invalid application ID" });
      return;
    }

    const application = await Application.findById(applicationId);
    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    if (String(application.seeker) !== seekerId) {
      res
        .status(403)
        .json({ message: "Unauthorized to withdraw this application" });
      return;
    }

    if (!["submitted", "viewed"].includes(application.status)) {
      res.status(400).json({
        message: "Cannot withdraw an application that has already been decided",
      });
      return;
    }

    await application.deleteOne();

    res.json({ message: "Application withdrawn successfully" });
  } catch {
    res.status(500).json({ message: "Failed to withdraw application" });
  }
}

/**
 * POST /api/applications/generate-cover-letter
 * Generate cover letter using AI (Seeker only)
 */
export async function generateCoverLetterAI(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const seekerId = req.authenticatedUser?._id;

    const { jobId } = z.object({ jobId: z.string() }).parse(req.body);

    if (!isValidObjectId(jobId)) {
      res.status(400).json({ message: "Invalid job ID" });
      return;
    }

    const job = await Job.findById(jobId);
    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }

    const profile = await SeekerProfile.findOne({ user: seekerId });
    const user = await User.findById(seekerId);

    if (!profile || !user) {
      res.status(400).json({ message: "Please complete your profile first" });
      return;
    }

    const coverLetter = await generateCoverLetter(job.title, job.description, {
      name: user.name,
      skills: profile.skills,
      experience: profile.experience,
    });

    res.json({ coverLetter });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: "Validation error" });
      return;
    }
    res.status(500).json({ message: "Failed to generate cover letter" });
  }
}

/**
 * POST /api/applications/:applicationId/summarize
 * Summarize candidate using AI (Owner employer or admin)
 */
export async function summarizeCandidateAI(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const employerId = req.authenticatedUser?._id;
    const isAdmin = req.authenticatedUser?.role === "admin";
    const { applicationId } = req.params;

    if (!isValidObjectId(applicationId)) {
      res.status(400).json({ message: "Invalid application ID" });
      return;
    }

    const application = await Application.findById(applicationId).populate(
      "job"
    );

    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    const jobDoc = application.job as unknown as IJob | null;
    if (!jobDoc) {
      res.status(404).json({ message: "Related job not found" });
      return;
    }

    if (!isAdmin && String(jobDoc.employer) !== employerId) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    const profile = await SeekerProfile.findOne({ user: application.seeker });

    if (!profile) {
      res.status(404).json({ message: "Candidate profile not found" });
      return;
    }

    const resumeText = `
Skills: ${profile.skills.join(", ")}
Experience: ${profile.experience || "N/A"}
Education: ${profile.education || "N/A"}
Bio: ${profile.bio || "N/A"}
    `.trim();

    const jobRequirements = `
Title: ${jobDoc.title}
Required Skills: ${jobDoc.skills.join(", ")}
Description: ${jobDoc.description}
    `.trim();

    const summary = await summarizeCandidate(resumeText, jobRequirements);

    res.json({ summary });
  } catch {
    res.status(500).json({ message: "Failed to summarize candidate" });
  }
}
