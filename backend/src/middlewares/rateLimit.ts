import type { Request, Response, NextFunction } from "express";

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function aiRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const identifier = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const limit = parseInt(process.env.AI_RATE_LIMIT_PER_MIN || "5", 10);
  const windowMs = 60 * 1000; // 1 minute

  let record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + windowMs };
    rateLimitStore.set(identifier, record);
  }

  if (record.count >= limit) {
    res.status(429).json({
      message: "Too many AI requests. Please try again later.",
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    });
    return;
  }

  record.count++;
  next();
}

// ✅ Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
  