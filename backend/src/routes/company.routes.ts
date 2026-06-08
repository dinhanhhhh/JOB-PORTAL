import { Router } from "express";
import {
  getMyCompany,
  uploadLogo,
  upsertMyCompany,
} from "../controllers/company.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { uploadImage } from "../middlewares/upload.js"; // ✅ THÊM import

const router = Router();

router.use(requireAuth, requireRole(["employer"]));

router.get("/me", getMyCompany);
router.put("/me", upsertMyCompany);
router.post("/logo", uploadImage, uploadLogo); // ✅ THÊM dòng này

export default router;
