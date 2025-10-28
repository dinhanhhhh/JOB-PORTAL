import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodIssue } from "zod";
import { MongoServerError } from "mongodb";

interface ErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
  stack?: string;
}

/**
 * Advanced Global Error Handler
 * - Có logger hook (tùy chọn)
 * - Type mạnh, chạy được cả sync & async
 */
export class ErrorHandler {
  private enableDetailedLog: boolean;

  constructor(enableDetailedLog = process.env.NODE_ENV === "development") {
    this.enableDetailedLog = enableDetailedLog;
  }

  // Log errors có cấu trúc rõ ràng, dễ tích hợp logger sau này
  private logError(err: unknown, req: Request) {
    const baseInfo = { method: req.method, url: req.originalUrl };

    if (err instanceof Error) {
      console.error("❌ Error:", { ...baseInfo, message: err.message });
      if (this.enableDetailedLog) console.error(err.stack);
    } else {
      console.error("❌ Unknown error:", baseInfo, err);
    }
  }

  // Middleware Express chính
  public handle = (
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction
  ): void => {
    this.logError(err, req); // ✅ Giờ `req` được dùng thật (hợp lệ → không còn warning)

    // ====== Zod Validation ======
    if (err instanceof ZodError) {
      const errors: Record<string, string[]> = {};
      err.issues.forEach((issue: ZodIssue) => {
        const path = issue.path.join(".");
        if (!errors[path]) errors[path] = [];
        errors[path].push(issue.message);
      });
      res.status(400).json({ message: "Validation error", errors });
      return;
    }

    // ====== Mongo Duplicate Error ======
    if (err instanceof MongoServerError && err.code === 11000) {
      res.status(400).json({ message: "Duplicate entry detected." });
      return;
    }

    // ====== Mongoose Validation ======
    if (
      err instanceof Error &&
      "name" in err &&
      err.name === "ValidationError"
    ) {
      res.status(400).json({ message: err.message });
      return;
    }

    // ====== Multer Upload Error ======
    if (err instanceof Error && err.message.includes("File too large")) {
      res.status(400).json({ message: "File size exceeds 5MB" });
      return;
    }

    if (err instanceof Error && err.message.includes("files are allowed")) {
      res.status(400).json({ message: err.message });
      return;
    }

    // ====== Default Server Error ======
    const response: ErrorResponse = {
      message: (err instanceof Error && err.message) || "Internal server error",
    };

    if (this.enableDetailedLog && err instanceof Error) {
      response.stack = err.stack;
    }

    res.status(500).json(response);
  };
}

// Cấu hình export sẵn instance mặc định
export const errorHandler = new ErrorHandler().handle;
