// frontend/src/lib/admin.ts
import { apiGet, apiPatch, apiDelete } from "./api";

export type Role = "seeker" | "employer" | "admin";
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface AdminUsersRes {
  data: AdminUser[];
  pagination: Pagination;
}

export function adminGetUsers(params?: {
  page?: number;
  limit?: number;
  role?: Role;
  search?: string;
}) {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.role) q.set("role", params.role);
  if (params?.search) q.set("search", params.search);
  return apiGet<AdminUsersRes>(`/admin/users?${q.toString()}`);
}

export function adminUpdateUser(
  userId: string,
  body: Partial<Pick<AdminUser, "isActive" | "role">>
) {
  return apiPatch<{ message: string; user: AdminUser }, typeof body>(
    `/admin/users/${userId}`,
    body
  );
}

export interface AdminJob {
  _id: string;
  title: string;
  isActive: boolean;
  createdAt: string;
  employer?: { _id: string; name: string; email: string };
  company?: { _id: string; name: string };
}
export interface AdminJobsRes {
  data: AdminJob[];
  pagination: Pagination;
}
export function adminGetJobs(params?: { page?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  return apiGet<AdminJobsRes>(`/admin/jobs?${q.toString()}`);
}
export function adminDeleteJob(jobId: string) {
  return apiDelete<{ message: string }>(`/admin/jobs/${jobId}`);
}

export interface AdminCompany {
  _id: string;
  name: string;
  website?: string;
  createdAt: string;
  owner?: { _id: string; name: string; email: string };
}
export interface AdminCompaniesRes {
  data: AdminCompany[];
  pagination: Pagination;
}
export function adminGetCompanies(params?: { page?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  return apiGet<AdminCompaniesRes>(`/admin/companies?${q.toString()}`);
}
export function adminDeleteCompany(companyId: string) {
  return apiDelete<{ message: string }>(`/admin/companies/${companyId}`);
}

export type AppStatus = "submitted" | "viewed" | "accepted" | "rejected";
export interface AdminApplication {
  _id: string;
  status: AppStatus;
  createdAt: string;
  job?: { _id: string; title: string; company?: { _id: string; name: string } };
  seeker?: { _id: string; name: string; email: string };
}
export interface AdminApplicationsRes {
  data: AdminApplication[];
  pagination: Pagination;
}
export function adminGetApplications(params?: {
  page?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  return apiGet<AdminApplicationsRes>(`/admin/applications?${q.toString()}`);
}
export function adminUpdateApplicationStatus(
  applicationId: string,
  status: AppStatus
) {
  return apiPatch<{ message: string }, { status: AppStatus }>(
    `/admin/applications/${applicationId}/status`,
    { status }
  );
}
export function adminDeleteApplication(applicationId: string) {
  return apiDelete<{ message: string }>(`/admin/applications/${applicationId}`);
}
