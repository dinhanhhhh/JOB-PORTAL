import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./api";
import type {
  Job,
  JobsListResponse,
  JobDetailResponse,
  JobLevel,
  JobType,
} from "@/types";

export type JobSortOption = "newest" | "oldest" | "salary_desc" | "salary_asc";

export async function getJobs(query?: {
  q?: string;
  page?: number | string;
  limit?: number | string;
  location?: string;
  skills?: string;
  isRemote?: string;
  level?: string;
  type?: string;
  salaryMin?: string;
  sort?: JobSortOption;
  companyId?: string;
}): Promise<JobsListResponse> {
  const params = new URLSearchParams();
  if (query?.q) params.append("q", query.q);
  if (query?.page) params.append("page", String(query.page));
  if (query?.limit) params.append("limit", String(query.limit));
  if (query?.location) params.append("location", query.location);
  if (query?.skills) params.append("skills", query.skills);
  if (query?.isRemote) params.append("isRemote", query.isRemote);
  if (query?.level) params.append("level", query.level);
  if (query?.type) params.append("type", query.type);
  if (query?.salaryMin) params.append("salaryMin", query.salaryMin);
  if (query?.sort) params.append("sort", query.sort);
  if (query?.companyId) params.append("companyId", query.companyId);

  const qs = params.toString();
  return apiGet<JobsListResponse>(`/jobs${qs ? `?${qs}` : ""}`);
}

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

export async function getJobById(id: string): Promise<JobDetailResponse> {
  return apiGet<JobDetailResponse>(`/jobs/${encodeURIComponent(id)}`);
}

export async function updateJob(
  id: string,
  body: Partial<CreateJobRequest>
): Promise<{ job: Job }> {
  return apiPut<{ job: Job }, Partial<CreateJobRequest>>(
    `/jobs/${encodeURIComponent(id)}`,
    body
  );
}

export async function deleteJob(id: string): Promise<{ message: string }> {
  return apiDelete<{ message: string }>(`/jobs/${encodeURIComponent(id)}`);
}

export async function toggleJobStatus(
  id: string
): Promise<{ message: string; job: Job }> {
  return apiPatch<{ message: string; job: Job }, Record<string, never>>(
    `/jobs/${encodeURIComponent(id)}/toggle-status`,
    {}
  );
}

export async function getMyJobs(): Promise<{ jobs: Job[] }> {
  return apiGet<{ jobs: Job[] }>("/jobs/employer/my-jobs");
}

export async function generateJobDescription(body: {
  title: string;
  skills: string[];
  level: JobLevel;
}): Promise<{ description: string }> {
  return apiPost<
    { description: string },
    { title: string; skills: string[]; level: JobLevel }
  >("/ai/generate-job-description", body);
}
