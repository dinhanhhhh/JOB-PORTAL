import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import {
  applyToJob,
  getMyApplications,
  getJobApplications,
  updateApplicationStatus,
  getApplicationById,
  streamApplicationResume,
  withdrawApplication,
  generateCoverLetterAI,
  summarizeCandidateAI,
} from "../controllers/application.controller.js";
import { uploadPDF } from "../middlewares/upload.js";
import { aiRateLimit } from "../middlewares/rateLimit.js";

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
  aiRateLimit,
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
  aiRateLimit,
  summarizeCandidateAI
);

// Shared
router.get("/:applicationId/resume", requireAuth, streamApplicationResume);
router.get("/:applicationId", requireAuth, getApplicationById);

router.delete(
  "/:applicationId",
  requireAuth,
  requireRole(["seeker"]),
  withdrawApplication
);

export default router;
