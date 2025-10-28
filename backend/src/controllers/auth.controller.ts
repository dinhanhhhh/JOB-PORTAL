import type { Request, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import User, { type IUser } from "../models/User";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";

// ===============================================
// ZOD VALIDATION SCHEMAS
// ===============================================

/**
 * Schema validation cho Register
 * Password BẮT BUỘC (min 6 ký tự)
 */
const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password too long"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["seeker", "employer"]).optional().default("seeker"),
});
type RegisterDto = z.infer<typeof registerSchema>;

/**
 * Schema validation cho Login
 * Password BẮT BUỘC
 */
const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});
type LoginDto = z.infer<typeof loginSchema>;

// ===============================================
// HELPER FUNCTIONS
// ===============================================

/**
 * Helper: Set access và refresh tokens vào httpOnly cookies
 */
function setAuthCookies(res: Response, access: string, refresh: string): void {
  const secure = (process.env.COOKIE_SECURE ?? "false") === "true";

  res.cookie("access_token", access, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 15 * 60 * 1000, // 15 phút
  });

  res.cookie("refresh_token", refresh, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
  });
}

// ===============================================
// AUTHENTICATION CONTROLLERS
// ===============================================

/**
 * POST /api/auth/register
 * Đăng ký tài khoản mới với email/password
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    // Validate input với Zod
    const dto: RegisterDto = registerSchema.parse(req.body);

    // Kiểm tra email đã tồn tại
    const exists = await User.findOne({ email: dto.email });

    if (exists) {
      // Kiểm tra nếu là OAuth user (không có password)
      if (!exists.password) {
        res.status(409).json({
          message:
            "This email is already registered with Google. Please sign in with Google.",
        });
        return;
      }

      // Email đã được đăng ký bằng email/password
      res.status(409).json({ message: "Email already registered" });
      return;
    }

    // Tạo user mới
    const user = await User.create({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      role: dto.role ?? "seeker",
    });

    // Tạo JWT tokens
    const access = signAccessToken(user.id, user.role);
    const refresh = signRefreshToken(user.id, user.role);
    setAuthCookies(res, access, refresh);

    // Return user info
    res.status(201).json({
      user: {
        _id: (user._id as Types.ObjectId).toString(),
        email: user.email,
        role: user.role,
        name: user.name,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    // Xử lý Zod validation errors
    if (error instanceof z.ZodError) {
      res.status(400).json({
        message: "Validation error",
        errors: error,
      });
      return;
    }

    console.error("Register error:", error);
    res.status(500).json({ message: "Failed to register" });
  }
}

/**
 * POST /api/auth/login
 * Đăng nhập với email/password
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    // Validate input
    const dto: LoginDto = loginSchema.parse(req.body);

    // Tìm user theo email
    const user = await User.findOne({ email: dto.email });

    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Kiểm tra nếu là OAuth user (không có password)
    if (!user.password) {
      res.status(400).json({
        message: "This account uses Google login. Please sign in with Google.",
      });
      return;
    }

    // So sánh password
    const isPasswordValid = await user.comparePassword(dto.password);

    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Kiểm tra account có active không
    if (!user.isActive) {
      res.status(403).json({ message: "Account is disabled" });
      return;
    }

    // Tạo JWT tokens
    const access = signAccessToken(user.id, user.role);
    const refresh = signRefreshToken(user.id, user.role);
    setAuthCookies(res, access, refresh);

    // Return user info
    res.json({
      user: {
        _id: (user._id as Types.ObjectId).toString(),
        email: user.email,
        role: user.role,
        name: user.name,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        message: "Validation error",
        errors: error,
      });
      return;
    }

    console.error("Login error:", error);
    res.status(500).json({ message: "Failed to login" });
  }
}

/**
 * GET /api/auth/me
 * Lấy thông tin user hiện tại (yêu cầu authentication)
 */
export async function me(req: Request, res: Response): Promise<void> {
  try {
    const authenticatedUser = req.authenticatedUser;

    if (!authenticatedUser) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Tìm user và loại bỏ password khỏi response
    const user = await User.findById(authenticatedUser._id).select("-password");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
}

/**
 * POST /api/auth/refresh
 * Refresh access token sử dụng refresh token
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.refresh_token as string | undefined;

  if (!refreshToken) {
    res.status(401).json({ message: "No refresh token" });
    return;
  }

  try {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.sub);

    if (!user || !user.isActive) {
      res.status(401).json({ message: "Invalid user" });
      return;
    }

    // Tạo tokens mới
    const access = signAccessToken(user.id, user.role);
    const refresh = signRefreshToken(user.id, user.role);
    setAuthCookies(res, access, refresh);

    res.json({ ok: true });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({ message: "Invalid refresh token" });
  }
}

/**
 * POST /api/auth/logout
 * Đăng xuất (xóa cookies)
 */
export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/" });
  res.json({ ok: true });
}

/**
 * GET /api/auth/google/callback
 * Google OAuth callback handler
 * Redirect user về trang phù hợp dựa trên role
 */
export async function googleCallback(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Passport đã set req.user sau khi authenticate
    const user = req.user as IUser | undefined;

    if (!user) {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(`${frontendUrl}/login?error=auth_failed`);
      return;
    }

    // Tạo JWT tokens
    const userId = String(user._id);
    const access = signAccessToken(userId, user.role);
    const refresh = signRefreshToken(userId, user.role);

    // Set tokens vào httpOnly cookies
    const secure = (process.env.COOKIE_SECURE ?? "false") === "true";

    res.cookie("access_token", access, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 15 * 60 * 1000, // 15 phút
    });

    res.cookie("refresh_token", refresh, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    // ✅ REDIRECT DỰA TRÊN ROLE
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    let redirectPath: string;

    switch (user.role) {
      case "seeker":
        redirectPath = "/"; // Seeker → Trang chủ
        break;
      case "employer":
        redirectPath = "/dashboard"; // Employer → Dashboard
        break;
      case "admin":
        redirectPath = "/admin"; // Admin → Admin panel
        break;
      default:
        redirectPath = "/"; // Fallback
    }

    // Log để debug
    console.log(
      `[Google OAuth] User ${user.email} (${user.role}) redirecting to ${redirectPath}`
    );

    res.redirect(`${frontendUrl}${redirectPath}`);
  } catch (error) {
    console.error("Google callback error:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/login?error=server_error`);
  }
}
