import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  toggleJobStatus,
  getMyJobs,
} from "../controllers/job.controller";

const router = Router();

// ============================================
// PUBLIC ROUTES
// ============================================
router.get("/", getJobs);

// ============================================
// EMPLOYER / ADMIN ROUTES (SPECIFIC FIRST!)
// ============================================

// ✅ PHẢI Ở TRƯỚC /:id
router.get(
  "/employer/my-jobs",
  requireAuth,
  requireRole(["employer"]),
  getMyJobs
);

// ✅ Giờ mới đến dynamic routes
router.get("/:id", getJobById);

router.post("/", requireAuth, requireRole(["employer", "admin"]), createJob);

router.put("/:id", requireAuth, requireRole(["employer", "admin"]), updateJob);

router.patch(
  "/:id/toggle-status",
  requireAuth,
  requireRole(["employer", "admin"]),
  toggleJobStatus
);

router.delete(
  "/:id",
  requireAuth,
  requireRole(["employer", "admin"]),
  deleteJob
);

export default router;
