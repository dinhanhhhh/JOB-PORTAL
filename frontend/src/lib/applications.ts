// ===============================================
// IMPORTS
// ===============================================
import { apiGet, apiPost } from "./api";
import type { MyApplicationsResponse } from "@/types";

// ===============================================
// TYPE DEFINITIONS
// ===============================================

/**
 * Interface cho kết quả apply từ backend
 * Backend trả về object chứa thông tin application
 */
export interface ApplyResult {
  application: {
    _id: string;
    job: string;
    seeker: string;
    status: "submitted" | "viewed" | "accepted" | "rejected";
    coverLetter: string;
    resumeUrl?: string;
    createdAt: string;
    updatedAt: string;
  };
  message?: string;
}

// ===============================================
// API FUNCTIONS
// ===============================================

/**
 * Apply job đơn giản - wrapper cho cả 2 trường hợp
 *
 * @param jobId - ID của job cần apply
 * @param formData - FormData chứa resume file và coverLetter
 * @returns Promise<ApplyResult>
 */
export async function applyToJob(
  jobId: string,
  formData: FormData
): Promise<ApplyResult> {
  if (!jobId) {
    throw new Error("jobId không hợp lệ");
  }

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "http://localhost:4000";

  const response = await fetch(
    `${API_BASE_URL}/api/applications/jobs/${encodeURIComponent(jobId)}/apply`,
    {
      method: "POST",
      credentials: "include",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Apply failed: ${errorText}`;

    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Nếu không parse được JSON, dùng errorText nguyên bản
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Apply job KHÔNG upload CV (dùng CV từ profile)
 *
 * @param jobId - ID của job cần apply
 * @param coverLetter - Cover letter (optional)
 * @returns Promise<ApplyResult>
 *
 * Use case: User đã có resumeUrl trong profile
 */
export async function applyJob(
  jobId: string,
  coverLetter?: string
): Promise<ApplyResult> {
  // Validate input
  if (!jobId) {
    throw new Error("jobId không hợp lệ");
  }

  // Tạo request body
  const body = coverLetter && coverLetter.length > 0 ? { coverLetter } : {};

  return apiPost<ApplyResult, typeof body>(
    `/applications/jobs/${encodeURIComponent(jobId)}/apply`,
    body
  );
}

/**
 * Apply job VỚI upload CV (PDF/DOC/DOCX)
 *
 * @param jobId - ID của job cần apply
 * @param file - File CV (PDF, DOC, DOCX)
 * @param coverLetter - Cover letter (optional)
 * @returns Promise<ApplyResult>
 *
 * Use case: User chưa có CV trong profile hoặc muốn upload CV mới
 */
export async function applyJobWithResume(
  jobId: string,
  file: File,
  coverLetter?: string
): Promise<ApplyResult> {
  // ===== VALIDATION =====
  if (!jobId) {
    throw new Error("jobId không hợp lệ");
  }

  if (!file) {
    throw new Error("Thiếu file CV (PDF/DOC/DOCX)");
  }

  // Validate file type
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("File phải là PDF, DOC hoặc DOCX");
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error("File không được vượt quá 5MB");
  }

  // ===== TẠO FORMDATA =====
  const formData = new FormData();
  formData.append("resume", file);

  if (coverLetter && coverLetter.length > 0) {
    formData.append("coverLetter", coverLetter);
  }

  // Sử dụng function applyToJob mới
  return applyToJob(jobId, formData);
}

/**
 * Lấy danh sách applications của user hiện tại (seeker)
 *
 * @returns Promise<MyApplicationsResponse>
 *
 * Endpoint: GET /api/applications/my-applications
 */
export async function getMyApplications(): Promise<MyApplicationsResponse> {
  return apiGet<MyApplicationsResponse>("/applications/my-applications");
}

/**
 * Lấy danh sách applications cho một job (employer)
 *
 * @param jobId - ID của job
 * @returns Promise<Application[]>
 *
 * Endpoint: GET /api/applications/jobs/:jobId/applications
 */
export async function getJobApplications(
  jobId: string
): Promise<ApplyResult["application"][]> {
  if (!jobId) {
    throw new Error("jobId không hợp lệ");
  }

  return apiGet<ApplyResult["application"][]>(
    `/applications/jobs/${encodeURIComponent(jobId)}/applications`
  );
}

/**
 * Update trạng thái application (employer)
 *
 * @param applicationId - ID của application
 * @param status - Trạng thái mới (viewed, accepted, rejected)
 * @returns Promise<{ message: string; application: Application }>
 *
 * Endpoint: PATCH /api/applications/:applicationId/status
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: "viewed" | "accepted" | "rejected"
): Promise<{ message: string; application: ApplyResult["application"] }> {
  if (!applicationId) {
    throw new Error("applicationId không hợp lệ");
  }

  if (!["viewed", "accepted", "rejected"].includes(status)) {
    throw new Error("status không hợp lệ");
  }

  return apiPost(`/applications/${encodeURIComponent(applicationId)}/status`, {
    status,
  });
}

/**
 * Generate cover letter bằng AI
 *
 * @param jobId - ID của job
 * @returns Promise<{ coverLetter: string }>
 *
 * Endpoint: POST /api/applications/generate-cover-letter
 */
export async function generateCoverLetter(
  jobId: string
): Promise<{ coverLetter: string }> {
  if (!jobId) {
    throw new Error("jobId không hợp lệ");
  }

  return apiPost<{ coverLetter: string }, { jobId: string }>(
    "/applications/generate-cover-letter",
    { jobId }
  );
}
