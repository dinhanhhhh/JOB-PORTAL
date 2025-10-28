import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
  getSeekerProfile,
  updateSeekerProfile,
  uploadAvatar,
  uploadResume,
} from "../controllers/profile.controller";
import { uploadImage, uploadPDF } from "../middlewares/upload";

const router = Router();

router.use(requireAuth, requireRole(["seeker"]));

router.get("/seeker", getSeekerProfile);
router.put("/seeker", updateSeekerProfile);
router.post("/seeker/avatar", uploadImage, uploadAvatar);
router.post("/seeker/resume", uploadPDF, uploadResume);

export default router;
