import type { Request, Response, NextFunction } from "express";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../utils/jwt";
import type { UserRole } from "../types/common";
import User, { type IUser } from "../models/User";

export type AuthenticatedUser = { _id: string; role: UserRole };

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: AuthenticatedUser;
    }
  }
}

// This helper function is similar to the one in the controller.
// For a larger app, it could be moved to a shared utility file.
function setAuthCookies(res: Response, access: string, refresh: string): void {
  const isProd = process.env.NODE_ENV === "production" || (process.env.COOKIE_SECURE ?? "false") === "true";
  res.cookie("access_token", access, {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
  });
  res.cookie("refresh_token", refresh, {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
  });
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const accessToken = req.cookies?.access_token as string | undefined;

  // If access token exists, try to verify it
  if (accessToken) {
    try {
      const payload = verifyAccessToken(accessToken);
      req.authenticatedUser = { _id: payload.sub, role: payload.role };
      return next(); // Token is valid, proceed
    } catch (err) {
      // Ignore error, token is invalid or expired, will try to refresh
    }
  }

  // Token is missing or invalid, try to refresh
  const refreshToken = req.cookies?.refresh_token as string | undefined;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized: No tokens provided" });
    return;
  }

  try {
    const refreshPayload = verifyRefreshToken(refreshToken);
    const user = (await User.findById(refreshPayload.sub)) as IUser | null;

    if (!user || !user.isActive) {
      res.status(401).json({ message: "Unauthorized: Invalid user" });
      return;
    }

    // Generate new tokens
    const userId = String(user._id);
    const newAccessToken = signAccessToken(userId, user.role);
    const newRefreshToken = signRefreshToken(userId, user.role); // Rotate refresh token

    // Set new tokens in cookies
    setAuthCookies(res, newAccessToken, newRefreshToken);

    // Attach user to request and proceed
    req.authenticatedUser = {
      _id: userId,
      role: user.role,
    };
    next();
  } catch (err) {
    // Clear potentially invalid cookies and fail
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/" });
    res.status(401).json({ message: "Unauthorized: Invalid refresh token" });
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authenticatedUser) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const role = req.authenticatedUser.role;
    if (!roles.includes(role)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    next();
  };
}
