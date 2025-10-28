// ===== User & Auth =====
export type UserRole = "seeker" | "employer" | "admin";

export interface User {
  _id: string; // ⬅️ dùng _id để khớp BE/Mongoose
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}

export interface MeResponse {
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
}

// ===== Company =====
export interface Company {
  _id: string;
  name: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  // ⬇️ bổ sung theo Prompt/BE
  location?: string;
  industry?: string;
  size?: string;
  owner?: string; // thường không populate ở FE
}

// ===== Job =====
export type JobLevel = "entry" | "mid" | "senior" | "lead" | "executive";
export type JobType =
  | "full-time"
  | "part-time"
  | "contract"
  | "internship"
  | "freelance";

export interface Job {
  _id: string;
  title: string;
  description: string;
  requirements?: string[]; // ⬅️ optional để an toàn với seed
  skills: string[];
  location?: string;
  isRemote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  level: JobLevel;
  type: JobType;
  employer: string; // ⬅️ BE thường trả id, không populate
  company: Company; // ⬅️ detail có populate company
  isActive: boolean;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobsListResponse {
  data: Job[];
  pagination: Pagination;
}

export interface JobDetailResponse {
  job: Job;
}

// ===== Seeker Profile =====
export interface SeekerProfile {
  _id: string;
  user: string; // id dạng string là đủ cho FE
  phone?: string;
  location?: string;
  bio?: string;
  skills: string[];
  experience?: string;
  education?: string;
  github?: string;
  portfolio?: string;
  linkedin?: string;
  avatar?: string;
  resumeUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SeekerProfileResponse {
  profile: SeekerProfile;
}

export interface UpdateSeekerProfileRequest {
  bio?: string;
  skills?: string[];
}

export interface UpdateSeekerProfileResponse {
  profile: SeekerProfile;
}

// ===== Application =====
export type ApplicationStatus =
  | "submitted"
  | "viewed"
  | "accepted"
  | "rejected";

export interface Application {
  _id: string;
  job: Job | string; // Có thể là object hoặc string ID
  seeker: User | string; // đôi khi BE trả id, đôi khi populate
  resumeUrl: string;
  coverLetter?: string;
  status: ApplicationStatus;
  viewedAt?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
  seekerProfile?: SeekerProfile; // khi gọi detail (theo BE)
}
// Helper type để check xem seeker đã được populate chưa
export interface PopulatedApplication extends Omit<Application, 'seeker' | 'job'> {
  job: Job;
  seeker: User;
}

// Type guard để kiểm tra
export function isPopulatedApplication(app: Application): app is PopulatedApplication {
  return typeof app.seeker !== 'string' && typeof app.job !== 'string';
}
export interface MyApplicationsResponse {
  applications: Application[];
}

// ===== Pagination & Error =====
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// ===== Filters =====
export interface JobFilters {
  q?: string;
  location?: string;
  isRemote?: boolean;
  skills?: string[]; // FE có thể join(',') khi gọi API
  level?: JobLevel;
  salaryMin?: number;
  type?: JobType;
  page?: number;
  limit?: number;
}
