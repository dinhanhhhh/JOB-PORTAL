import { apiDelete, apiGet, apiPatch, apiPost, apiPostForm } from "./api";
import type {
  Application,
  ApplicationStatus,
  MyApplicationsResponse,
} from "@/types";

export interface ApplyResult {
  application: Application;
  message?: string;
}

/**
 * Apply to a job using FormData (supports optional resume upload and coverLetter).
 */
export async function applyToJob(
  jobId: string,
  formData: FormData
): Promise<ApplyResult> {
  if (!jobId) {
    throw new Error("Invalid job ID");
  }

  return apiPostForm<ApplyResult>(
    `/applications/jobs/${encodeURIComponent(jobId)}/apply`,
    formData
  );
}

/**
 * Apply to a job without uploading a new CV (uses CV saved in SeekerProfile).
 */
export async function applyJob(
  jobId: string,
  coverLetter?: string
): Promise<ApplyResult> {
  if (!jobId) {
    throw new Error("Invalid job ID");
  }

  const body = coverLetter && coverLetter.length > 0 ? { coverLetter } : {};

  return apiPost<ApplyResult, typeof body>(
    `/applications/jobs/${encodeURIComponent(jobId)}/apply`,
    body
  );
}

/**
 * Apply to a job with a new CV file (PDF, DOC, DOCX).
 */
export async function applyJobWithResume(
  jobId: string,
  file: File,
  coverLetter?: string
): Promise<ApplyResult> {
  if (!jobId) {
    throw new Error("Invalid job ID");
  }

  if (!file) {
    throw new Error("Resume file is required (PDF/DOC/DOCX)");
  }

  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("File must be PDF, DOC, or DOCX");
  }

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("File size must not exceed 5MB");
  }

  const formData = new FormData();
  formData.append("resume", file);

  if (coverLetter && coverLetter.length > 0) {
    formData.append("coverLetter", coverLetter);
  }

  return applyToJob(jobId, formData);
}

/**
 * Get applications for current authenticated user (scoped by role on backend).
 */
export async function getMyApplications(): Promise<MyApplicationsResponse> {
  return apiGet<MyApplicationsResponse>("/applications/my-applications");
}

/**
 * Get all applications for a specific job (employer or admin).
 */
export async function getJobApplications(
  jobId: string
): Promise<{ applications: Application[] }> {
  if (!jobId) {
    throw new Error("Invalid job ID");
  }

  return apiGet<{ applications: Application[] }>(
    `/applications/jobs/${encodeURIComponent(jobId)}/applications`
  );
}

/**
 * Update application status (employer or admin).
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
): Promise<{ message: string; application: Application }> {
  if (!applicationId) {
    throw new Error("Invalid application ID");
  }

  if (!["submitted", "viewed", "accepted", "rejected"].includes(status)) {
    throw new Error("Invalid application status");
  }

  return apiPatch<
    { message: string; application: Application },
    { status: ApplicationStatus }
  >(`/applications/${encodeURIComponent(applicationId)}/status`, { status });
}

/**
 * Withdraw a pending application (seeker only).
 */
export async function withdrawApplication(
  applicationId: string
): Promise<{ message: string }> {
  if (!applicationId) {
    throw new Error("Invalid application ID");
  }

  return apiDelete<{ message: string }>(
    `/applications/${encodeURIComponent(applicationId)}`
  );
}

/**
 * Generate cover letter using Gemini AI (seeker only).
 */
export async function generateCoverLetter(
  jobId: string
): Promise<{ coverLetter: string }> {
  if (!jobId) {
    throw new Error("Invalid job ID");
  }

  return apiPost<{ coverLetter: string }, { jobId: string }>(
    "/ai/generate-cover-letter",
    { jobId }
  );
}

/**
 * Summarize a candidate application using Gemini AI (employer only).
 */
export async function summarizeCandidate(
  applicationId: string
): Promise<{ summary: string }> {
  if (!applicationId) {
    throw new Error("Invalid application ID");
  }

  return apiPost<{ summary: string }, Record<string, never>>(
    `/ai/summarize-candidate/${encodeURIComponent(applicationId)}`,
    {}
  );
}
