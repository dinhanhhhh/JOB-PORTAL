import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import {
  generateCoverLetterAI,
  summarizeCandidateAI,
} from "../controllers/application.controller.js";
import { generateDescription } from "../controllers/job.controller.js";
import { aiRateLimit } from "../middlewares/rateLimit.js";

const router = Router();

// ✅ Seeker - Generate cover letter
router.post(
  "/generate-cover-letter",
  requireAuth,
  requireRole(["seeker"]),
  aiRateLimit, // ✅ THÊM
  generateCoverLetterAI
);

// ✅ Employer - Generate job description
router.post(
  "/generate-job-description",
  requireAuth,
  requireRole(["employer"]),
  aiRateLimit, // ✅ THÊM
  generateDescription
);

// ✅ Employer - Summarize candidate
router.post(
  "/summarize-candidate/:applicationId",
  requireAuth,
  requireRole(["employer"]),
  aiRateLimit, // ✅ THÊM
  summarizeCandidateAI
);

export default router;
