import type { Response, CookieOptions } from "express";
import { env } from "./env";

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";

const isSecureEnv = env.COOKIE_SECURE_FLAG;

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: isSecureEnv ? "none" : "lax",
  secure: isSecureEnv,
  path: "/",
};

export function setAuthCookies(
  res: Response,
  tokens: { access: string; refresh: string }
): void {
  res.cookie(ACCESS_COOKIE, tokens.access, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie(REFRESH_COOKIE, tokens.refresh, {
    ...baseCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, baseCookieOptions);
  res.clearCookie(REFRESH_COOKIE, baseCookieOptions);
}

export const AuthCookie = {
  ACCESS: ACCESS_COOKIE,
  REFRESH: REFRESH_COOKIE,
} as const;
