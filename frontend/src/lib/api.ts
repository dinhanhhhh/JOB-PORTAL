import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };
type QueueEntry = {
  resolve: () => void;
  reject: (error: unknown) => void;
};

let apiInstance: AxiosInstance | null = null;
let isRefreshing = false;
let pendingQueue: QueueEntry[] = [];

const FALLBACK_BASE_URL = "http://localhost:4000";

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly fieldErrors?: Record<string, string[]>;
  public readonly raw?: unknown;

  constructor(
    message: string,
    status: number,
    fieldErrors?: Record<string, string[]>,
    raw?: unknown
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.raw = raw;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringArrayMap(
  input: unknown
): Record<string, string[]> | undefined {
  if (!isRecord(input)) return undefined;
  const result: Record<string, string[]> = {};
  for (const [key, val] of Object.entries(input)) {
    if (Array.isArray(val)) {
      const strs = val.filter((item): item is string => typeof item === "string");
      if (strs.length > 0) {
        result[key] = strs;
      }
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL?.trim() || FALLBACK_BASE_URL;
}

// Ensure exactly one "/api" suffix regardless of env value
export function getApiBaseApi(): string {
  const base = getApiBase().replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

export function getProfileResumeViewUrl(): string {
  return `${getApiBaseApi()}/profile/seeker/resume`;
}

export function getApplicationResumeViewUrl(applicationId: string): string {
  return `${getApiBaseApi()}/applications/${encodeURIComponent(applicationId)}/resume`;
}

export function getSavedJobsStorageKey(userId?: string | null): string {
  const normalized = userId?.trim();
  return normalized
    ? `job_portal_saved_jobs:${normalized}`
    : "job_portal_saved_jobs:guest";
}

export function isSafeRedirectPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }
  return trimmed;
}

function extractFieldErrors(err: unknown): Record<string, string[]> | undefined {
  if (!isRecord(err)) return undefined;
  const response = isRecord(err.response) ? err.response : undefined;
  const data = response ? response.data : err;
  if (!isRecord(data) || !isRecord(data.errors)) return undefined;
  return toStringArrayMap(data.errors.fieldErrors);
}

export function extractErrorMessage(err: unknown): string {
  if (typeof err === "string" && err.trim().length > 0) {
    return err.trim();
  }

  let data: unknown = err;
  if (isRecord(err) && "response" in err) {
    if (isRecord(err.response) && "data" in err.response) {
      data = err.response.data;
    } else if (err.response === undefined) {
      if (err.code === "ECONNABORTED") {
        return "Request timed out";
      }
      if (typeof err.message === "string" && err.message.trim().length > 0) {
        return err.message.trim();
      }
      return "Network error";
    }
  }

  if (typeof data === "string" && data.trim().length > 0) {
    return data.trim();
  }

  if (isRecord(data)) {
    if (isRecord(data.errors)) {
      const fieldErrors = toStringArrayMap(data.errors.fieldErrors);
      if (fieldErrors) {
        for (const [key, msgs] of Object.entries(fieldErrors)) {
          if (msgs.length > 0) {
            return `${key}: ${msgs[0]}`;
          }
        }
      }

      if (Array.isArray(data.errors.formErrors)) {
        const firstFormErr = data.errors.formErrors.find(
          (item): item is string => typeof item === "string" && item.trim().length > 0
        );
        if (firstFormErr) {
          return firstFormErr;
        }
      }
    }

    if (typeof data.message === "string" && data.message.trim().length > 0) {
      return data.message.trim();
    }

    if (typeof data.error === "string" && data.error.trim().length > 0) {
      return data.error.trim();
    }
  }

  if (err instanceof Error && err.message.trim().length > 0) {
    return err.message.trim();
  }

  return "Unexpected error";
}

export function getDisplayErrorMessage(
  err: unknown,
  fallback = "Unexpected error"
): string {
  if (err instanceof ApiClientError) {
    return err.message.replace(/^\[\d+\]\s*/, "").trim() || fallback;
  }
  if (err instanceof Error) {
    return err.message.replace(/^\[\d+\]\s*/, "").trim() || fallback;
  }
  return extractErrorMessage(err) || fallback;
}

function isPublicFrontendRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/jobs")
  );
}

function createApi(): AxiosInstance {
  const instance = axios.create({
    baseURL: getApiBaseApi(),
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
  });

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      config.headers.delete("Content-Type");
    }
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const original = error.config as RetryConfig | undefined;
      const status = error.response?.status ?? 0;

      const isAuthSilentError =
        status === 401 &&
        Boolean(
          error.config?.url?.includes("/auth/me") ||
            error.config?.url?.includes("/auth/refresh")
        );

      if (process.env.NODE_ENV === "development" && !isAuthSilentError) {
        console.error("[api] request error", {
          url: error.config?.url,
          method: (error.config?.method || "get").toUpperCase(),
          status,
          data: error.response?.data,
        });
      }

      if (status === 401 && original && !original._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            pendingQueue.push({
              resolve: () => resolve(getApi()(original)),
              reject,
            });
          });
        }

        original._retry = true;
        isRefreshing = true;

        try {
          await axios.post(
            `${getApiBaseApi()}/auth/refresh`,
            {},
            { withCredentials: true }
          );
          pendingQueue.forEach(({ resolve }) => resolve());
          return getApi()(original);
        } catch (refreshError) {
          pendingQueue.forEach(({ reject }) => reject(refreshError));

          if (typeof window !== "undefined") {
            localStorage.removeItem("auth_user");
            if (!isPublicFrontendRoute(window.location.pathname)) {
              window.location.href = "/login";
            }
          }

          const refreshStatus =
            (refreshError as AxiosError).response?.status ?? status;
          const msg = extractErrorMessage(refreshError);
          throw new ApiClientError(
            `[${refreshStatus}] ${msg}`,
            refreshStatus,
            extractFieldErrors(refreshError),
            refreshError
          );
        } finally {
          pendingQueue = [];
          isRefreshing = false;
        }
      }

      if (status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("auth_user");
        if (!isAuthSilentError && !isPublicFrontendRoute(window.location.pathname)) {
          window.location.href = "/login";
        }
      }

      const msg = extractErrorMessage(error);
      throw new ApiClientError(
        `[${status}] ${msg}`,
        status,
        extractFieldErrors(error),
        error
      );
    }
  );

  return instance;
}

export default function getApi(): AxiosInstance {
  if (!apiInstance) apiInstance = createApi();
  return apiInstance;
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await getApi().get<T>(url);
  return res.data;
}

export async function apiPost<T, B extends object>(
  url: string,
  body: B
): Promise<T> {
  const res = await getApi().post<T>(url, body);
  return res.data;
}

export async function apiPostForm<T>(
  url: string,
  formData: FormData
): Promise<T> {
  const res = await getApi().post<T>(url, formData, {
    headers: { "Content-Type": undefined },
  });
  return res.data;
}

export async function apiPut<T, B extends object>(
  url: string,
  body: B
): Promise<T> {
  const res = await getApi().put<T>(url, body);
  return res.data;
}

export async function apiPatch<T, B extends object>(
  url: string,
  body: B
): Promise<T> {
  const res = await getApi().patch<T>(url, body);
  return res.data;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await getApi().delete<T>(url);
  return res.data;
}
