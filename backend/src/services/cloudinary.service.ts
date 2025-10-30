import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { env } from "../utils/env";

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
