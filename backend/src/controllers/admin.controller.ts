import type { Request, Response } from "express";
import { z } from "zod";
import User from "../models/User.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import Company from "../models/Company.js";
import {
  escapeRegex,
  isValidObjectId,
  parseBoundedInt,
} from "../utils/validation.js";

/**
 * GET /api/admin/stats
 * Thống kê chi tiết hệ thống
 */
export async function getStats(_req: Request, res: Response): Promise<void> {
  try {
    const [
      totalUsers,
      totalJobs,
      totalApplications,
      activeJobs,
      usersByRole,
      applicationsByStatus,
      recentJobs,
      recentApplications,
    ] = await Promise.all([
      User.countDocuments(),
      Job.countDocuments(),
      Application.countDocuments(),
      Job.countDocuments({ isActive: true }),

      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]).then(
        (results) =>
          results.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {
            seeker: 0,
            employer: 0,
            admin: 0,
          })
      ),

      Application.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]).then((results) =>
        results.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {
          submitted: 0,
          viewed: 0,
          accepted: 0,
          rejected: 0,
        })
      ),

      Job.find()
        .populate("company")
        .populate("employer", "name email")
        .sort({ createdAt: -1 })
        .limit(5),

      Application.find()
        .populate("job", "title")
        .populate("seeker", "name email")
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    res.json({
      stats: {
        totalUsers,
        totalJobs,
        totalApplications,
        activeJobs,
        usersByRole,
        applicationsByStatus,
      },
      recentActivities: {
        recentJobs,
        recentApplications,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ message: "Failed to fetch statistics" });
  }
}

/**
 * GET /api/admin/users
 * Danh sách users với filter
 */
export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const { page = "1", limit = "10", role, search } = req.query;

    const pageNum = parseBoundedInt(page, 1, 1, 10000);
    const limitNum = parseBoundedInt(limit, 10, 1, 100);
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = {};

    if (role && ["seeker", "employer", "admin"].includes(role as string)) {
      filter.role = role;
    }

    if (typeof search === "string" && search.trim().length > 0) {
      const escapedSearch = escapeRegex(search.trim());
      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(filter),
    ]);

    res.json({
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch users" });
  }
}

/**
 * PATCH /api/admin/users/:userId
 * Cập nhật user (role, isActive)
 */
export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.authenticatedUser?._id;
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    const validated = z
      .object({
        isActive: z.boolean().optional(),
        role: z.enum(["seeker", "employer", "admin"]).optional(),
      })
      .parse(req.body);

    if (adminId === userId) {
      res.status(400).json({ message: "Cannot modify your own account" });
      return;
    }

    const user = await User.findByIdAndUpdate(userId, validated, {
      new: true,
    }).select("-password");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({ message: "User updated successfully", user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({ message: "Validation error", errors: error.flatten() });
      return;
    }
    res.status(500).json({ message: "Failed to update user" });
  }
}

/**
 * GET /api/admin/jobs
 * Tất cả jobs (admin view) hỗ trợ search và status filter
 */
export async function getAllJobs(req: Request, res: Response): Promise<void> {
  try {
    const { page = "1", limit = "10", search, status } = req.query;

    const pageNum = parseBoundedInt(page, 1, 1, 10000);
    const limitNum = parseBoundedInt(limit, 10, 1, 100);
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = {};

    if (status === "active") {
      filter.isActive = true;
    } else if (status === "inactive") {
      filter.isActive = false;
    }

    if (typeof search === "string" && search.trim().length > 0) {
      const escapedSearch = escapeRegex(search.trim());
      filter.$or = [
        { title: { $regex: escapedSearch, $options: "i" } },
        { location: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate("company")
        .populate("employer", "name email")
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
  } catch {
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
}

/**
 * DELETE /api/admin/jobs/:jobId
 * Xóa job (admin only)
 */
export async function deleteJobByAdmin(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { jobId } = req.params;

    if (!isValidObjectId(jobId)) {
      res.status(400).json({ message: "Invalid job ID" });
      return;
    }

    const job = await Job.findByIdAndDelete(jobId);

    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }

    await Application.deleteMany({ job: jobId });

    res.json({
      message: "Job and related applications deleted successfully",
    });
  } catch {
    res.status(500).json({ message: "Failed to delete job" });
  }
}

export async function getCompanies(req: Request, res: Response): Promise<void> {
  try {
    const { page = "1", limit = "10", search } = req.query;

    const pageNum = parseBoundedInt(page, 1, 1, 10000);
    const limitNum = parseBoundedInt(limit, 10, 1, 100);
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = {};
    if (typeof search === "string" && search.trim().length > 0) {
      const escapedSearch = escapeRegex(search.trim());
      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { description: { $regex: escapedSearch, $options: "i" } },
        { website: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const [companies, total] = await Promise.all([
      Company.find(filter)
        .populate("owner", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Company.countDocuments(filter),
    ]);

    res.json({
      data: companies,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch companies" });
  }
}

export async function deleteCompanyByAdmin(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { companyId } = req.params;

    if (!isValidObjectId(companyId)) {
      res.status(400).json({ message: "Invalid company ID" });
      return;
    }

    const company = await Company.findByIdAndDelete(companyId);
    if (!company) {
      res.status(404).json({ message: "Company not found" });
      return;
    }

    const jobs = await Job.find({ company: companyId }).select("_id");
    const jobIds = jobs.map((j) => j._id);
    await Promise.all([
      Job.deleteMany({ company: companyId }),
      Application.deleteMany({ job: { $in: jobIds } }),
    ]);

    res.json({ message: "Company and related jobs/applications deleted" });
  } catch {
    res.status(500).json({ message: "Failed to delete company" });
  }
}

export async function getApplicationsAdmin(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { page = "1", limit = "10", status, search } = req.query;

    const pageNum = parseBoundedInt(page, 1, 1, 10000);
    const limitNum = parseBoundedInt(limit, 10, 1, 100);
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = {};
    if (
      status &&
      ["submitted", "viewed", "accepted", "rejected"].includes(status as string)
    ) {
      filter.status = status;
    }

    if (typeof search === "string" && search.trim().length > 0) {
      const escapedSearch = escapeRegex(search.trim());
      const [matchingJobs, matchingSeekers] = await Promise.all([
        Job.find({ title: { $regex: escapedSearch, $options: "i" } }).select(
          "_id"
        ),
        User.find({
          $or: [
            { name: { $regex: escapedSearch, $options: "i" } },
            { email: { $regex: escapedSearch, $options: "i" } },
          ],
        }).select("_id"),
      ]);

      filter.$or = [
        { coverLetter: { $regex: escapedSearch, $options: "i" } },
        { job: { $in: matchingJobs.map((j) => j._id) } },
        { seeker: { $in: matchingSeekers.map((u) => u._id) } },
      ];
    }

    const [apps, total] = await Promise.all([
      Application.find(filter)
        .populate({ path: "job", populate: { path: "company" } })
        .populate("seeker", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Application.countDocuments(filter),
    ]);

    res.json({
      data: apps,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch applications" });
  }
}

export async function updateApplicationStatusByAdmin(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { applicationId } = req.params;

    if (!isValidObjectId(applicationId)) {
      res.status(400).json({ message: "Invalid application ID" });
      return;
    }

    const validated = z
      .object({
        status: z.enum(["submitted", "viewed", "accepted", "rejected"]),
      })
      .parse(req.body);

    const app = await Application.findById(applicationId);
    if (!app) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    app.status = validated.status;

    if (validated.status === "viewed" && !app.viewedAt) {
      app.viewedAt = new Date();
    }

    if (
      ["accepted", "rejected"].includes(validated.status) &&
      !app.respondedAt
    ) {
      app.respondedAt = new Date();
    }

    await app.save();
    await app.populate([
      { path: "job", select: "title" },
      { path: "seeker", select: "name email" },
    ]);

    res.json({ message: "Application updated", application: app });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({ message: "Validation error", errors: error.flatten() });
      return;
    }
    res.status(500).json({ message: "Failed to update application" });
  }
}

export async function deleteApplicationByAdmin(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { applicationId } = req.params;

    if (!isValidObjectId(applicationId)) {
      res.status(400).json({ message: "Invalid application ID" });
      return;
    }

    const app = await Application.findByIdAndDelete(applicationId);
    if (!app) {
      res.status(404).json({ message: "Application not found" });
      return;
    }
    res.json({ message: "Application deleted" });
  } catch {
    res.status(500).json({ message: "Failed to delete application" });
  }
}
