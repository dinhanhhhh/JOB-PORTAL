import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import MongoStore from "connect-mongo";
import passport from "./config/passport";
import { env } from "./utils/env";
import { errorHandler } from "./middlewares/errorHandler"; // ✅ THÊM

// Import routes
import authRoutes from "./routes/auth.routes";
import companyRoutes from "./routes/company.routes";
import jobRoutes from "./routes/job.routes";
import applicationRoutes from "./routes/application.routes"; // ✅ THÊM
import profileRoutes from "./routes/profile.routes"; // ✅ THÊM
import adminRoutes from "./routes/admin.routes"; // ✅ THÊM
import aiRoutes from "./routes/ai.routes";

export const app = express();

// Core middlewares
// Tin cậy proxy (Render/Heroku/Cloudflare) để cookie `secure` hoạt động đúng
app.set("trust proxy", 1);

app.use(
  cors({
    origin: env.ALLOWED_ORIGINS_LIST,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["set-cookie"], // THÊM DÒNG NÀY
  })
);
app.use(express.json());
app.use(cookieParser());

// Session configuration for Passport
app.use(
  session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 14 * 24 * 60 * 60,
    }),
    cookie: {
      secure: env.COOKIE_SECURE_FLAG, // ✅ Tự động
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: env.COOKIE_SECURE_FLAG ? "none" : "lax",
    },
  })
);
// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes); // ✅ THÊM
app.use("/api/profile", profileRoutes); // ✅ THÊM
app.use("/api/admin", adminRoutes); // ✅ THÊM
app.use("/api/ai", aiRoutes); // ✅ THÊM

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ✅ Global error handler (PHẢI Ở CUỐI)
app.use(errorHandler);


