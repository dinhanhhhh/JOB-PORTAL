import type { Request, Response } from "express";
import type { SortOrder } from "mongoose";
import { z } from "zod";
import Job from "../models/Job.js";
import Company from "../models/Company.js";
import Application from "../models/Application.js";
import { generateJobDescription } from "../services/gemini.service.js";
import {
  buildDiacriticPattern,
  buildWordBoundaryRegexPattern,
  escapeRegex,
  isValidObjectId,
  parseBoundedInt,
  parseNonNegativeNumber,
} from "../utils/validation.js";

export type JobSortOption = "newest" | "oldest" | "salary_desc" | "salary_asc";

export function validateSalaryRange(
  salaryMin: number | undefined,
  salaryMax: number | undefined
): boolean {
  if (
    salaryMin !== undefined &&
    salaryMax !== undefined &&
    salaryMin > salaryMax
  ) {
    return false;
  }
  return true;
}

export function resolveJobSort(sort?: string): Record<string, SortOrder> {
  switch (sort) {
    case "oldest":
      return { createdAt: 1 };
    case "salary_desc":
      return { salaryMax: -1, salaryMin: -1, createdAt: -1 };
    case "salary_asc":
      return { salaryMin: 1, salaryMax: 1, createdAt: -1 };
    case "newest":
    default:
      return { createdAt: -1 };
  }
}

// ✅ Zod schemas
const jobBaseSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters"),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters"),
  requirements: z.array(z.string()).optional().default([]),
  skills: z.array(z.string()).min(1, "At least one skill is required"),
  location: z.string().trim().optional(),
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
});

export const createJobSchema = jobBaseSchema.refine(
  (data) => validateSalaryRange(data.salaryMin, data.salaryMax),
  {
    message: "Salary minimum must be less than or equal to salary maximum",
    path: ["salaryMin"],
  }
);

export const updateJobSchema = jobBaseSchema.partial().refine(
  (data) => validateSalaryRange(data.salaryMin, data.salaryMax),
  {
    message: "Salary minimum must be less than or equal to salary maximum",
    path: ["salaryMin"],
  }
);

// ✅ Query validation schema
const querySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("10"),
  q: z.string().optional(),
  location: z.string().optional(),
  isRemote: z.enum(["true", "false"]).optional(),
  level: z.enum(["entry", "mid", "senior", "lead", "executive"]).optional(),
  skills: z.string().optional(),
  salaryMin: z.string().optional(),
  type: z
    .enum(["full-time", "part-time", "contract", "internship", "freelance"])
    .optional(),
  sort: z
    .enum(["newest", "oldest", "salary_desc", "salary_asc"])
    .optional(),
  companyId: z.string().optional(),
});

/**
 * GET /api/jobs
 * Get all jobs with filters, sorting and pagination
 */
export async function getJobs(req: Request, res: Response): Promise<void> {
  try {
    const validated = querySchema.parse(req.query);

    const pageNum = parseBoundedInt(validated.page, 1, 1, 10000);
    const limitNum = parseBoundedInt(validated.limit, 10, 1, 100);
    const skip = (pageNum - 1) * limitNum;

    const conditions: Record<string, unknown>[] = [{ isActive: true }];

    if (validated.q && validated.q.trim().length > 0) {
      const trimmedQuery = validated.q.trim();
      const fuzzyQuery = buildDiacriticPattern(trimmedQuery);
      const wordBoundaryQuery = buildWordBoundaryRegexPattern(trimmedQuery);
      conditions.push({
        $or: [
          { title: { $regex: fuzzyQuery, $options: "i" } },
          { description: { $regex: wordBoundaryQuery, $options: "i" } },
          { skills: { $regex: fuzzyQuery, $options: "i" } },
        ],
      });
    }

    if (validated.location && validated.location.trim().length > 0) {
      const locationPattern = buildDiacriticPattern(validated.location.trim());
      conditions.push({ location: new RegExp(locationPattern, "i") });
    }

    if (validated.companyId && validated.companyId.trim().length > 0) {
      const companyId = validated.companyId.trim();
      if (!isValidObjectId(companyId)) {
        res.status(400).json({ message: "Invalid company ID" });
        return;
      }
      conditions.push({ company: companyId });
    }

    if (validated.isRemote !== undefined) {
      conditions.push({ isRemote: validated.isRemote === "true" });
    }

    if (validated.level) {
      conditions.push({ level: validated.level });
    }

    if (validated.type) {
      conditions.push({ type: validated.type });
    }

    if (validated.skills) {
      const skillsArray = validated.skills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (skillsArray.length > 0) {
        conditions.push({
          skills: {
            $all: skillsArray.map(
              (skill) => new RegExp(`^${escapeRegex(skill)}$`, "i")
            ),
          },
        });
      }
    }

    if (validated.salaryMin !== undefined) {
      const minSalary = parseNonNegativeNumber(validated.salaryMin);
      if (minSalary !== undefined) {
        conditions.push({
          $or: [
            { salaryMax: { $gte: minSalary } },
            { salaryMin: { $gte: minSalary } },
          ],
        });
      }
    }

    const filter = { $and: conditions };
    const sortSpec = resolveJobSort(validated.sort);

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate("company")
        .populate("employer", "email name")
        .sort(sortSpec)
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
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: "Invalid job ID" });
      return;
    }

    const job = await Job.findById(req.params.id)
      .populate("company")
      .populate("employer", "email name");

    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }

    res.json({ job });
  } catch {
    res.status(500).json({ message: "Failed to fetch job" });
  }
}

/**
 * POST /api/jobs
 * Create new job (Employer/Admin)
 */
export async function createJob(req: Request, res: Response): Promise<void> {
  try {
    const employerId = req.authenticatedUser?._id;
    if (!employerId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const validated = createJobSchema.parse(req.body);

    const company = await Company.findOne({ owner: employerId });
    if (!company) {
      res
        .status(400)
        .json({ message: "Please create a company profile first" });
      return;
    }

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
 * Update job (Owner employer or admin)
 */
export async function updateJob(req: Request, res: Response): Promise<void> {
  try {
    const employerId = req.authenticatedUser?._id;
    const isAdmin = req.authenticatedUser?.role === "admin";
    const jobId = req.params.id;

    if (!isValidObjectId(jobId)) {
      res.status(400).json({ message: "Invalid job ID" });
      return;
    }

    const validated = updateJobSchema.parse(req.body);

    const job = await Job.findOne(
      isAdmin ? { _id: jobId } : { _id: jobId, employer: employerId }
    );

    if (!job) {
      res.status(404).json({ message: "Job not found or unauthorized" });
      return;
    }

    const nextSalaryMin =
      validated.salaryMin !== undefined ? validated.salaryMin : job.salaryMin;
    const nextSalaryMax =
      validated.salaryMax !== undefined ? validated.salaryMax : job.salaryMax;

    if (!validateSalaryRange(nextSalaryMin, nextSalaryMax)) {
      res.status(400).json({
        message: "Salary minimum must be less than or equal to salary maximum",
      });
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
 * Delete job and cascade delete related applications (Owner employer or admin)
 */
export async function deleteJob(req: Request, res: Response): Promise<void> {
  try {
    const employerId = req.authenticatedUser?._id;
    const isAdmin = req.authenticatedUser?.role === "admin";
    const jobId = req.params.id;

    if (!isValidObjectId(jobId)) {
      res.status(400).json({ message: "Invalid job ID" });
      return;
    }

    const job = await Job.findOneAndDelete(
      isAdmin ? { _id: jobId } : { _id: jobId, employer: employerId }
    );

    if (!job) {
      res.status(404).json({ message: "Job not found or unauthorized" });
      return;
    }

    await Application.deleteMany({ job: job._id });

    res.json({ message: "Job deleted successfully" });
  } catch {
    res.status(500).json({ message: "Failed to delete job" });
  }
}

/**
 * PATCH /api/jobs/:id/toggle-status
 * Toggle job active/inactive status (Owner employer or admin)
 */
export async function toggleJobStatus(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const employerId = req.authenticatedUser?._id;
    const isAdmin = req.authenticatedUser?.role === "admin";
    const jobId = req.params.id;

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
  } catch {
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
  } catch {
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
        title: z.string().trim().min(3),
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
