import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { env } from "../utils/env.js";

const cloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME &&
  env.CLOUDINARY_API_KEY &&
  env.CLOUDINARY_API_SECRET
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME as string,
    api_key: env.CLOUDINARY_API_KEY as string,
    api_secret: env.CLOUDINARY_API_SECRET as string,
  });
} else {
  console.warn("Cloudinary is disabled: missing CLOUDINARY_* environment variables");
}

function assertConfigured(): void {
  if (!cloudinaryConfigured) {
    throw new Error(
      "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }
}
interface UploadResult {
  secure_url: string;
  public_id: string;
}

/**
 * Upload file to Cloudinary
 * @param filePath - Local file path
 * @param folder - Cloudinary folder name
 * @param resourceType - 'image' or 'raw' (for PDFs)
 */
export async function uploadToCloudinary(
  filePath: string,
  folder: string,
  resourceType: "image" | "raw" = "image"
): Promise<UploadResult> {
  assertConfigured();
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `job-portal/${folder}`,
      resource_type: resourceType,
    });

    // Delete temporary file after successful upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    // Delete temporary file on error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
}

export interface CloudinaryRawAsset {
  publicId: string;
  filename: string;
}

export interface FetchedResumeAsset {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

export function sanitizeResumeFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[\r\n"\\/:*?<>|]/g, "_")
    .replace(/\s+/g, "_");
  return cleaned.length > 0 ? cleaned.slice(0, 120) : "resume.pdf";
}

export function inferResumeMimeType(filenameOrUrl: string): string {
  const clean = filenameOrUrl.split(/[?#]/)[0]?.toLowerCase() ?? "";
  if (clean.endsWith(".pdf")) return "application/pdf";
  if (clean.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (clean.endsWith(".doc")) return "application/msword";
  return "application/octet-stream";
}

/**
 * Parse a Cloudinary raw upload URL belonging to the configured cloud name
 * and extract its public_id + filename so we can fetch it via signed API delivery.
 */
export function parseCloudinaryRawUrl(
  rawUrl: string,
  cloudName?: string
): CloudinaryRawAsset | null {
  if (!rawUrl || !cloudName) return null;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.hostname.toLowerCase() !== "res.cloudinary.com") {
    return null;
  }

  const prefix = `/${cloudName}/raw/upload/`;
  if (!parsed.pathname.startsWith(prefix)) {
    return null;
  }

  let remainder = parsed.pathname.slice(prefix.length);
  remainder = remainder.replace(/^v\d+\//, "");
  if (!remainder) return null;

  let publicId: string;
  try {
    publicId = decodeURIComponent(remainder);
  } catch {
    publicId = remainder;
  }

  const lastSegment = publicId.split("/").pop() || "resume.pdf";
  return {
    publicId,
    filename: sanitizeResumeFilename(lastSegment),
  };
}

function isDisallowedExternalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  );
}

/**
 * Fetch resume bytes safely from Cloudinary (using authenticated private_download_url
 * so accounts with restricted public PDF delivery still work seamlessly) or a public HTTPS URL.
 */
export async function fetchResumeAsset(
  resumeUrl: string
): Promise<FetchedResumeAsset> {
  const cloudinaryAsset = parseCloudinaryRawUrl(
    resumeUrl,
    env.CLOUDINARY_CLOUD_NAME
  );

  let downloadUrl: string;
  let filename = "resume.pdf";

  if (cloudinaryAsset && cloudinaryConfigured) {
    filename = cloudinaryAsset.filename;
    downloadUrl = cloudinary.utils.private_download_url(
      cloudinaryAsset.publicId,
      "",
      {
        resource_type: "raw",
        type: "upload",
        expires_at: Math.floor(Date.now() / 1000) + 120,
      }
    );
  } else {
    let parsed: URL;
    try {
      parsed = new URL(resumeUrl);
    } catch {
      throw new Error("Invalid resume URL");
    }

    if (parsed.protocol !== "https:" || isDisallowedExternalHost(parsed.hostname)) {
      throw new Error("Unsupported resume URL");
    }

    downloadUrl = parsed.toString();
    const lastSegment = parsed.pathname.split("/").pop() || "resume.pdf";
    filename = sanitizeResumeFilename(lastSegment);
  }

  const upstream = await fetch(downloadUrl, {
    signal: AbortSignal.timeout(15000),
  });

  if (!upstream.ok) {
    throw new Error(`Resume file unavailable (status ${upstream.status})`);
  }

  const arrayBuffer = await upstream.arrayBuffer();
  const inferredMime = inferResumeMimeType(filename);
  const upstreamMime = upstream.headers.get("content-type")?.split(";")[0]?.trim();
  const contentType =
    inferredMime !== "application/octet-stream"
      ? inferredMime
      : upstreamMime || "application/octet-stream";

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
    filename,
  };
}

/**
 * Delete file from Cloudinary
 * @param publicId - Cloudinary public ID
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  if (!cloudinaryConfigured) {
    console.warn("Cloudinary deletion skipped: service not configured");
    return;
  }
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    // Don't throw - deletion failure shouldn't break the flow
  }
}
