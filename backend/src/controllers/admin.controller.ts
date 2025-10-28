import type { Request, Response } from "express";
import { z } from "zod";
import User from "../models/User";
import Job from "../models/Job";
import Application from "../models/Application";
import Company from "../models/Company";

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

      // ✅ Users by role
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]).then(
        (results) =>
          results.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {
            seeker: 0,
            employer: 0,
            admin: 0,
          })
      ),

      // ✅ Applications by status
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

      // ✅ Recent jobs (last 5)
      Job.find()
        .populate("company")
        .populate("employer", "name email")
        .sort({ createdAt: -1 })
        .limit(5),

      // ✅ Recent applications (last 5)
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

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = {};

    if (role && ["seeker", "employer", "admin"].includes(role as string)) {
      filter.role = role;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
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
  } catch (error) {
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

    const validated = z
      .object({
        isActive: z.boolean().optional(),
        role: z.enum(["seeker", "employer", "admin"]).optional(),
      })
      .parse(req.body);

    // ✅ Prevent self-modification
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
 * Tất cả jobs (admin view)
 */
export async function getAllJobs(req: Request, res: Response): Promise<void> {
  try {
    const { page = "1", limit = "10" } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [jobs, total] = await Promise.all([
      Job.find()
        .populate("company")
        .populate("employer", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Job.countDocuments(),
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

    const job = await Job.findByIdAndDelete(jobId);

    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }

    // ✅ Xóa applications liên quan
    await Application.deleteMany({ job: jobId });

    res.json({
      message: "Job and related applications deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete job" });
  }
}
export async function getCompanies(req: Request, res: Response): Promise<void> {
  try {
    const { page = "1", limit = "10", search } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search as string, $options: "i" } },
        { description: { $regex: search as string, $options: "i" } },
        { website: { $regex: search as string, $options: "i" } },
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

    const company = await Company.findByIdAndDelete(companyId);
    if (!company) {
      res.status(404).json({ message: "Company not found" });
      return;
    }

    // Xóa Jobs thuộc company + Applications liên quan
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

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = {};
    if (
      status &&
      ["submitted", "viewed", "accepted", "rejected"].includes(status as string)
    ) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { coverLetter: { $regex: search as string, $options: "i" } },
      ];
    }

    const [apps, total] = await Promise.all([
      Application.find(filter)
        .populate("job", "title")
        .populate("seeker", "name email")
        .populate({ path: "job", populate: { path: "company" } })
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
    const validated = z
      .object({
        status: z.enum(["submitted", "viewed", "accepted", "rejected"]),
      })
      .parse(req.body);

    const app = await Application.findByIdAndUpdate(
      applicationId,
      {
        status: validated.status,
        viewedAt: validated.status === "viewed" ? new Date() : undefined,
      },
      { new: true }
    )
      .populate("job", "title")
      .populate("seeker", "name email");

    if (!app) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

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
