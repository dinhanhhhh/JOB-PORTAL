// frontend/src/lib/api.ts
import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

let apiInstance: AxiosInstance | null = null;
let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

export function getApiBase(): string {
  const base =
    process.env.NEXT_PUBLIC_API_URL || "https://backend-ygiu.onrender.com";
  console.log("API Base URL:", base);
  return base;
}

export function getApiBaseApi(): string {
  const base = getApiBase().replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

// ---- SỬA: bóc lỗi chi tiết từ Zod flatten() ----
type ZodFlatten = {
  fieldErrors?: Record<string, string[]>;
  formErrors?: string[];
};

function extractErrorMessage(err: unknown): string {
  const ax = err as AxiosError;
  const data = ax.response?.data as unknown;

  // BE có thể trả string hoặc object
  if (typeof data === "string") return data;

  if (data && typeof data === "object") {
    // @ts-expect-error safe drill các dạng phổ biến
    if (typeof data.message === "string" && !data.errors) return data.message;

    // @ts-expect-error safe drill: dạng { message: "Validation error", errors: { fieldErrors, formErrors } }
    const errors: ZodFlatten | undefined = data.errors;
    if (errors && typeof errors === "object") {
      // Ưu tiên fieldErrors
      const fe = errors.fieldErrors ?? {};
      for (const key of Object.keys(fe)) {
        const msgs = fe[key];
        if (Array.isArray(msgs) && msgs.length > 0) {
          return `${key}: ${msgs[0]}`;
        }
      }
      // Rồi tới formErrors
      if (Array.isArray(errors.formErrors) && errors.formErrors.length > 0) {
        return errors.formErrors[0];
      }
    }

    // @ts-expect-error: một số BE trả { error: string }
    if (typeof data.error === "string") return data.error;
    // @ts-expect-error: fallback message
    if (typeof data.message === "string") return data.message;
  }

  return "Unexpected error";
}

function createApiInstance(): AxiosInstance {
  const instance = axios.create({
    baseURL: getApiBaseApi(),
    withCredentials: true,
    timeout: 30000,
  });

  // Request interceptor
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      // Token expired - try refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve) => {
            pendingQueue.push(() => {
              resolve(instance(originalRequest));
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          await instance.post("/auth/refresh");
          isRefreshing = false;
          pendingQueue.forEach((cb) => cb());
          pendingQueue = [];
          return instance(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;
          pendingQueue = [];
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      }

      const message = extractErrorMessage(error);
      console.error("API Error:", message);
      return Promise.reject(new Error(message));
    }
  );

  return instance;
}

export function apiGet<T>(url: string) {
  if (!apiInstance) apiInstance = createApiInstance();
  return apiInstance.get<T>(url).then((res) => res.data);
}

export function apiPost<T, D = unknown>(url: string, data?: D) {
  if (!apiInstance) apiInstance = createApiInstance();
  return apiInstance.post<T>(url, data).then((res) => res.data);
}

export function apiPut<T, D = unknown>(url: string, data?: D) {
  if (!apiInstance) apiInstance = createApiInstance();
  return apiInstance.put<T>(url, data).then((res) => res.data);
}

export function apiPatch<T, D = unknown>(url: string, data?: D) {
  if (!apiInstance) apiInstance = createApiInstance();
  return apiInstance.patch<T>(url, data).then((res) => res.data);
}

export function apiDelete<T>(url: string) {
  if (!apiInstance) apiInstance = createApiInstance();
  return apiInstance.delete<T>(url).then((res) => res.data);
}
