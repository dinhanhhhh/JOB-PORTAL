import multer, { type FileFilterCallback } from "multer";
import type { Request } from "express";
import path from "path";
import fs from "fs";

// Tạo folder uploads nếu chưa tồn tại
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// =======================
// 1. Factory tạo bộ lọc file
// =======================
export function createFileFilter({
  allowedTypes,
  allowedMimes,
  precheck,
}: {
  allowedTypes: RegExp;
  allowedMimes: RegExp;
  precheck?: (req: Request) => boolean;
}) {
  return (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    try {
      if (precheck && !precheck(req)) {
        return cb(new Error("Upload not allowed for this request"));
      }

      const extValid = allowedTypes.test(
        path.extname(file.originalname).toLowerCase()
      );
      const mimeValid = allowedMimes.test(file.mimetype);

      if (extValid && mimeValid) cb(null, true);
      else cb(new Error(`File type not allowed: ${file.originalname}`));
    } catch (error) {
      cb(error as Error);
    }
  };
}

// =======================
// 2. Config Multer storage
// =======================
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// =======================
// 3. Giới hạn dung lượng file
// =======================
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// =======================
// 4. Trường hợp upload ảnh
// =======================
export const uploadImage = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: createFileFilter({
    allowedTypes: /\.(jpg|jpeg|png|gif|webp)$/i,
    allowedMimes: /^image\//,
    // precheck: (req) => true,  // ← bỏ điều kiện role ở đây
  }),
}).single("image");


// =======================
// 5. Trường hợp upload PDF
// =======================
export const uploadPDF = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: createFileFilter({
    allowedTypes: /\.pdf$/i,
    allowedMimes: /^application\/pdf$/,
    precheck: (_req) => true, // Luôn được phép — ai cũng được upload CV
  }),
}).single("resume");
