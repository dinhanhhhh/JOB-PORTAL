import { Router } from "express";
import {
  getMyCompany,
  uploadLogo,
  upsertMyCompany,
} from "../controllers/company.controller";
import { requireAuth, requireRole } from "../middlewares/auth";
import { uploadImage } from "../middlewares/upload"; // ✅ THÊM import

const router = Router();

router.use(requireAuth, requireRole(["employer"]));

router.get("/me", getMyCompany);
router.put("/me", upsertMyCompany);
router.post("/logo", uploadImage, uploadLogo); // ✅ THÊM dòng này

export default router;
