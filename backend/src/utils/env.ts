import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.string().default("4000"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required"),
  JWT_ACCESS_EXPIRES: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  JWT_REFRESH_EXPIRES: z.string().default("7d"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  COOKIE_SECURE: z.string().default("false"),
  SESSION_SECRET: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  BACKEND_URL: z.string().default("http://localhost:4000"),
  MAX_FILE_SIZE: z.string().default("5242880"),
  AI_RATE_LIMIT_PER_MIN: z.string().default("5"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment variables:", parsedEnv.error.format());
  process.exit(1);
}

const data = parsedEnv.data;

const allowedOrigins = (data.ALLOWED_ORIGINS ?? data.FRONTEND_URL)
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const cookieSecureFlag =
  data.NODE_ENV === "production" || data.COOKIE_SECURE.toLowerCase() === "true";

const sessionSecret =
  data.SESSION_SECRET && data.SESSION_SECRET.trim().length > 0
    ? data.SESSION_SECRET
    : data.JWT_ACCESS_SECRET;

export const env = {
  ...data,
  ALLOWED_ORIGINS_LIST: allowedOrigins,
  COOKIE_SECURE_FLAG: cookieSecureFlag,
  SESSION_SECRET: sessionSecret,
};
