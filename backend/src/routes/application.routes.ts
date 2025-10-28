import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
  applyToJob,
  getMyApplications,
  getJobApplications,
  updateApplicationStatus,
  getApplicationById,
  generateCoverLetterAI,
  summarizeCandidateAI,
} from "../controllers/application.controller";
import { uploadPDF } from "../middlewares/upload";

const router = Router();

// Seeker routes
router.post(
  "/jobs/:jobId/apply",
  requireAuth,
  requireRole(["seeker"]),
  uploadPDF,
  applyToJob
);

router.get(
  "/my-applications",
  requireAuth,
  requireRole(["seeker", "employer", "admin"]), // 👈 THÊM employer và admin
  getMyApplications
);

router.post(
  "/generate-cover-letter",
  requireAuth,
  requireRole(["seeker"]),
  generateCoverLetterAI
);

// Employer routes
router.get(
  "/jobs/:jobId/applications",
  requireAuth,
  requireRole(["employer", "admin"]),
  getJobApplications
);

router.patch(
  "/:applicationId/status",
  requireAuth,
  requireRole(["employer", "admin"]),
  updateApplicationStatus
);

router.post(
  "/:applicationId/summarize",
  requireAuth,
  requireRole(["employer", "admin"]),
  summarizeCandidateAI
);

// Shared
router.get("/:applicationId", requireAuth, getApplicationById);

export default router;
