// frontend/src/lib/jobs.ts
import { apiGet, apiPost, apiPut } from "./api";
import type {
  Job,
  JobsListResponse,
  JobDetailResponse,
  JobLevel,
  JobType,
} from "@/types";

// Hàm lấy jobs công khai (đã có sẵn)
export async function getJobs(query?: {
  q?: string;
}): Promise<JobsListResponse> {
  const q = query?.q ? `?q=${encodeURIComponent(query.q)}` : "";
  return apiGet<JobsListResponse>(`/jobs${q}`);
}

// Hàm tạo job (đã có sẵn)
export interface CreateJobRequest {
  title: string;
  description: string;
  requirements?: string[];
  skills: string[];
  location?: string;
  isRemote?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  level: JobLevel;
  type: JobType;
}

export async function createJob(body: CreateJobRequest): Promise<{ job: Job }> {
  return apiPost<{ job: Job }, CreateJobRequest>("/jobs", body);
}

// Hàm lấy job detail (đã có sẵn)
export async function getJobById(id: string): Promise<JobDetailResponse> {
  return apiGet<JobDetailResponse>(`/jobs/${id}`);
}

// Hàm update job (đã có sẵn)
export async function updateJob(
  id: string,
  body: Partial<CreateJobRequest>
): Promise<{ job: Job }> {
  return apiPut<{ job: Job }, Partial<CreateJobRequest>>(`/jobs/${id}`, body);
}

// THÊM MỚI: Hàm lấy jobs của employer hiện tại (endpoint: /api/jobs/employer/my-jobs)
// Trả về JobsListResponse giống như getJobs, nhưng chỉ jobs của employer
export async function getMyJobs(): Promise<{ jobs: Job[] }> {
  return apiGet<{ jobs: Job[] }>("/jobs/employer/my-jobs");
}
