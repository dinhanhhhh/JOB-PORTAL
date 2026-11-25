import type { Request, Response, NextFunction } from "express";
import { env } from "../utils/env.js";
import { parseBoundedInt } from "../utils/validation.js";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix: string;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Creates a reusable in-memory sliding/fixed-window rate limiter middleware keyed by prefix and client IP.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, max, message, keyPrefix } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + windowMs };
      rateLimitStore.set(key, record);
    }

    if (record.count >= max) {
      res.status(429).json({
        message,
        retryAfter: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
      });
      return;
    }

    record.count += 1;
    next();
  };
}

/**
 * Clears all stored rate limit counters (primarily for automated tests).
 */
export function resetRateLimits(): void {
  rateLimitStore.clear();
}

export const aiRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: parseBoundedInt(env.AI_RATE_LIMIT_PER_MIN, 5, 1, 1000),
  message: "Too many AI requests. Please try again later.",
  keyPrefix: "ai",
});

export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many authentication attempts. Please try again later.",
  keyPrefix: "auth",
});

// Cleanup expired entries every 5 minutes without blocking process shutdown.
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
cleanupTimer.unref();
