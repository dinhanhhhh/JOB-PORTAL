import type { Request, Response } from "express";
import { z } from "zod";
import Job from "../models/Job";
import Company from "../models/Company";
import { generateJobDescription } from "../services/gemini.service";

// ✅ Zod schemas
export const createJobSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z
      .string()
      .min(20, "Description must be at least 20 characters"),
    requirements: z.array(z.string()).optional().default([]),
    skills: z.array(z.string()).min(1, "At least one skill is required"),
    location: z.string().optional(),
    isRemote: z.boolean().optional().default(false),
    salaryMin: z.number().min(0).optional(),
    salaryMax: z.number().min(0).optional(),
    level: z.enum(["entry", "mid", "senior", "lead", "executive"]),
    type: z.enum([
      "full-time",
      "part-time",
      "contract",
      "internship",
      "freelance",
    ]),
  })
  .refine(
    (data) => {
      if (data.salaryMin && data.salaryMax && data.salaryMin > data.salaryMax) {
        return false;
      }
      return true;
    },
    {
      message: "Salary minimum must be less than or equal to salary maximum",
      path: ["salaryMin"],
    }
  );

const updateJobSchema = createJobSchema.partial();

// ✅ Query validation schema
const querySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("10"),
  q: z.string().optional(), // Đổi từ search → q (theo prompt)
  location: z.string().optional(),
  isRemote: z.enum(["true", "false"]).optional(), // Đổi từ remote → isRemote
  level: z.enum(["entry", "mid", "senior", "lead", "executive"]).optional(),
  skills: z.string().optional(),
  salaryMin: z.string().optional(),
  type: z
    .enum(["full-time", "part-time", "contract", "internship", "freelance"])
    .optional(),
});

/**
 * GET /api/jobs
 * Get all jobs with filters and pagination
 */
export async function getJobs(req: Request, res: Response): Promise<void> {
  try {
    // ✅ Validate query params
    const validated = querySchema.parse(req.query);

    const pageNum = Math.max(1, parseInt(validated.page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(validated.limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // ✅ Build filter - isActive thay vì isOpen
    const filter: Record<string, unknown> = { isActive: true };

    // ✅ Text search (q thay vì search)
    if (validated.q) {
      filter.$text = { $search: validated.q };
    }

    if (validated.location) {
      filter.location = new RegExp(validated.location, "i");
    }

    // ✅ isRemote thay vì remote
    if (validated.isRemote !== undefined) {
      filter.isRemote = validated.isRemote === "true";
    }

    if (validated.level) {
      filter.level = validated.level;
    }

    if (validated.type) {
      filter.type = validated.type;
    }

    // ✅ Skills dùng $all thay vì $in
    if (validated.skills) {
      const skillsArray = validated.skills.split(",").map((s) => s.trim());
      filter.skills = { $all: skillsArray };
    }

    if (validated.salaryMin) {
      const min = parseInt(validated.salaryMin, 10);
      filter.$or = [{ salaryMax: { $gte: min } }, { salaryMin: { $gte: min } }];
    }

    // Execute query
    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate("company")
        .populate("employer", "email name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Job.countDocuments(filter),
    ]);

    res.json({
      data: jobs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        message: "Invalid query parameters",
        errors: error.flatten(),
      });
      return;
    }
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
}

/**
 * GET /api/jobs/:id
 * Get job by ID
 */
export async function getJobById(req: Request, res: Response): Promise<void> {
  try {
    const job = await Job.findById(req.params.id)
      .populate("company")
      .populate("employer", "email name");

    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }

    res.json({ job });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch job" });
  }
}

/**
 * POST /api/jobs
 * Create new job (Employer only)
 */
export async function createJob(req: Request, res: Response): Promise<void> {
  try {
    const employerId = req.authenticatedUser?._id;
    if (!employerId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const validated = createJobSchema.parse(req.body);

    // Get employer's company
    const company = await Company.findOne({ owner: employerId });
    if (!company) {
      res
        .status(400)
        .json({ message: "Please create a company profile first" });
      return;
    }

    // ✅ isActive thay vì isOpen
    const job = await Job.create({
      ...validated,
      employer: employerId,
      company: company._id,
      isActive: true,
    });

    await job.populate("company");

    res.status(201).json({
      message: "Job created successfully",
      job,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({ message: "Validation error", errors: error.flatten() });
      return;
    }
    res.status(500).json({ message: "Failed to create job" });
  }
}

/**
 * PUT /api/jobs/:id
 * Update job (Employer only - own jobs)
 */
export async function updateJob(req: Request, res: Response): Promise<void> {
  try {
    const employerId = req.authenticatedUser?._id;
    const validated = updateJobSchema.parse(req.body);

    const job = await Job.findOne({
      _id: req.params.id,
      employer: employerId,
    });

    if (!job) {
      res.status(404).json({ message: "Job not found or unauthorized" });
      return;
    }

    Object.assign(job, validated);
    await job.save();
    await job.populate("company");

    res.json({
      message: "Job updated successfully",
      job,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({ message: "Validation error", errors: error.flatten() });
      return;
    }
    res.status(500).json({ message: "Failed to update job" });
  }
}

/**
 * DELETE /api/jobs/:id
 * Delete job (Employer only - own jobs)
 */
export async function deleteJob(req: Request, res: Response): Promise<void> {
  try {
    const employerId = req.authenticatedUser?._id;

    const job = await Job.findOneAndDelete({
      _id: req.params.id,
      employer: employerId,
    });

    if (!job) {
      res.status(404).json({ message: "Job not found or unauthorized" });
      return;
    }

    res.json({ message: "Job deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete job" });
  }
}

/**
 * PATCH /api/jobs/:id/toggle-status
 * Toggle job active/inactive status (Employer only)
 */
export async function toggleJobStatus(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const employerId = req.authenticatedUser?._id;

    const job = await Job.findOne({
      _id: req.params.id,
      employer: employerId,
    });

    if (!job) {
      res.status(404).json({ message: "Job not found or unauthorized" });
      return;
    }

    // ✅ Toggle isActive và set closedAt
    job.isActive = !job.isActive;

    if (!job.isActive) {
      job.closedAt = new Date();
    } else {
      job.closedAt = undefined;
    }

    await job.save();

    res.json({
      message: `Job ${job.isActive ? "opened" : "closed"} successfully`,
      job,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to toggle job status" });
  }
}

/**
 * GET /api/jobs/employer/my-jobs
 * Get employer's own jobs
 */
export async function getMyJobs(req: Request, res: Response): Promise<void> {
  try {
    const employerId = req.authenticatedUser?._id;

    const jobs = await Job.find({ employer: employerId })
      .populate("company")
      .sort({ createdAt: -1 });

    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
}

/**
 * POST /api/ai/generate-job-description
 * Generate job description using AI (Employer only)
 */
export async function generateDescription(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { title, skills, level } = z
      .object({
        title: z.string().min(3),
        skills: z.array(z.string()).min(1),
        level: z.enum(["entry", "mid", "senior", "lead", "executive"]),
      })
      .parse(req.body);

    const description = await generateJobDescription(title, skills, level);

    res.json({ description });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({ message: "Validation error", errors: error.flatten() });
      return;
    }
    res.status(500).json({ message: "Failed to generate description" });
  }
}
