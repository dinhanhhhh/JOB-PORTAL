import { Router } from "express";
import passport from "../config/passport.js";
import {
  login,
  logout,
  me,
  refresh,
  register,
  googleCallback,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { authRateLimit } from "../middlewares/rateLimit.js";

const router = Router();

router.post("/register", authRateLimit, register);
router.post("/login", authRateLimit, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  googleCallback
);

export default router;
