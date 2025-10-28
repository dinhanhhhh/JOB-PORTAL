// backend/src/routes/admin.routes.ts
import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
  getStats,
  getUsers,
  updateUser,
  getAllJobs,
  deleteJobByAdmin,
  // ✅ mới thêm:
  getCompanies,
  deleteCompanyByAdmin,
  getApplicationsAdmin,
  updateApplicationStatusByAdmin,
  deleteApplicationByAdmin,
} from "../controllers/admin.controller";

const router = Router();

router.use(requireAuth, requireRole(["admin"]));

// Stats
router.get("/stats", getStats); // đã có  :contentReference[oaicite:2]{index=2}

// Users
router.get("/users", getUsers); // đã có  :contentReference[oaicite:3]{index=3}
router.patch("/users/:userId", updateUser); // đã có  :contentReference[oaicite:4]{index=4}

// Jobs
router.get("/jobs", getAllJobs); // đã có  :contentReference[oaicite:5]{index=5}
router.delete("/jobs/:jobId", deleteJobByAdmin); // đã có  :contentReference[oaicite:6]{index=6}

// ✅ Companies
router.get("/companies", getCompanies);
router.delete("/companies/:companyId", deleteCompanyByAdmin);

// ✅ Applications
router.get("/applications", getApplicationsAdmin);
router.patch(
  "/applications/:applicationId/status",
  updateApplicationStatusByAdmin
);
router.delete("/applications/:applicationId", deleteApplicationByAdmin);

export default router;
