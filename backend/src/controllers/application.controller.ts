import type { Request, Response } from "express";
import { z } from "zod";
import Application from "../models/Application";
import Job from "../models/Job";
import SeekerProfile from "../models/SeekerProfile";
import { uploadToCloudinary } from "../services/cloudinary.service";
import {
  generateCoverLetter,
  summarizeCandidate,
} from "../services/gemini.service";
import User from "../models/User";

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

/**
 * POST /api/applications/:jobId/apply
 * Apply to a job (Seeker only)
 */
export async function applyToJob(req: Request, res: Response): Promise<void> {
  try {
    const seekerId = req.authenticatedUser?._id;
    const { jobId } = req.params;

    if (!seekerId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const validated = applyJobSchema.parse(req.body);

    // Check if job exists and is open
    const job = await Job.findById(jobId);
    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }

    if (!job.isActive) {
      res
        .status(400)
        .json({ message: "This job is no longer accepting applications" });
      return;
    }

    // Get seeker's profile
    const profile = await SeekerProfile.findOne({ user: seekerId });
    if (!profile) {
      res.status(400).json({ message: "Please complete your profile first" });
      return;
    }

    // Check if already applied
    const existingApp = await Application.findOne({
      job: jobId,
      seeker: seekerId,
    });

    if (existingApp) {
      res.status(400).json({ message: "You have already applied to this job" });
      return;
    }

    // Use resume from profile or upload new one
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

    // Create application
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

    let applications;

    if (userRole === "seeker") {
      // Seeker chỉ xem applications của chính mình
      applications = await Application.find({ seeker: userId })
        .populate({
          path: "job",
          populate: { path: "company" },
        })
        .sort({ createdAt: -1 });
        
    } else if (userRole === "employer") {
      // Employer xem applications cho tất cả jobs của họ
      const employerJobs = await Job.find({ employer: userId }).select('_id');
      const jobIds = employerJobs.map(job => job._id);
      
      applications = await Application.find({ job: { $in: jobIds } })
        .populate({
          path: "job",
          populate: { path: "company" },
        })
        .populate({
          path: "seeker",
          select: "name email",
        })
        .sort({ createdAt: -1 });
        
    } else if (userRole === "admin") {
      // Admin xem TẤT CẢ applications
      applications = await Application.find()
        .populate({
          path: "job",
          populate: { path: "company" },
        })
        .populate({
          path: "seeker",
          select: "name email",
        })
        .sort({ createdAt: -1 });
    }

    res.json({ applications });
  } catch (error) {
    console.error("Get applications error:", error);
    res.status(500).json({ message: "Failed to fetch applications" });
  }
}

/**
 * GET /api/applications/job/:jobId
 * Get all applications for a job (Employer only)
 */
export async function getJobApplications(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const employerId = req.authenticatedUser?._id;
    const { jobId } = req.params;

    // Verify job belongs to employer
    const job = await Job.findOne({
      _id: jobId,
      employer: employerId,
    });

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

    // Fetch seeker profiles separately
    const applicationsWithProfiles = await Promise.all(
      applications.map(async (app) => {
        const profile = await SeekerProfile.findOne({ user: app.seeker });
        return {
          ...app.toObject(),
          seekerProfile: profile,
        };
      })
    );

    res.json({ applications: applicationsWithProfiles });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch applications" });
  }
}

/**
 * PATCH /api/applications/:applicationId/status
 * Update application status (Employer only)
 */
export async function updateApplicationStatus(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const employerId = req.authenticatedUser?._id;
    const { applicationId } = req.params;

    const validated = updateStatusSchema.parse(req.body);

    const application = await Application.findById(applicationId).populate(
      "job"
    );

    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    // Verify job belongs to employer
    const job = await Job.findOne({
      _id: application.job,
      employer: employerId,
    });

    if (!job) {
      res
        .status(403)
        .json({ message: "Unauthorized to update this application" });
      return;
    }

    // Update status
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

    // Authorization check
    if (userRole === "seeker") {
      if (application.seeker._id.toString() !== userId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }
    } else if (userRole === "employer") {
      const job = await Job.findOne({
        _id: application.job,
        employer: userId,
      });

      if (!job) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }
    }

    // Get seeker profile
    const profile = await SeekerProfile.findOne({ user: application.seeker });

    res.json({
      application,
      seekerProfile: profile,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch application" });
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

    // Get job details
    const job = await Job.findById(jobId);
    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }

    // Get seeker profile
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
 * Summarize candidate using AI (Employer only)
 */
export async function summarizeCandidateAI(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const employerId = req.authenticatedUser?._id;
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId).populate(
      "job"
    );

    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    // Verify authorization
    const job = await Job.findOne({
      _id: application.job,
      employer: employerId,
    });

    if (!job) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    // Get seeker profile
    const profile = await SeekerProfile.findOne({ user: application.seeker });

    if (!profile) {
      res.status(404).json({ message: "Candidate profile not found" });
      return;
    }

    // Build resume text from profile
    const resumeText = `
Skills: ${profile.skills.join(", ")}
Experience: ${profile.experience || "N/A"}
Education: ${profile.education || "N/A"}
Bio: ${profile.bio || "N/A"}
    `.trim();

    const jobRequirements = `
Title: ${job.title}
Required Skills: ${job.skills.join(", ")}
Description: ${job.description}
    `.trim();

    const summary = await summarizeCandidate(resumeText, jobRequirements);

    res.json({ summary });
  } catch (error) {
    res.status(500).json({ message: "Failed to summarize candidate" });
  }
}
