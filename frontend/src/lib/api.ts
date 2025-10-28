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
  console.log("getApiBase() returning:", base);
  return base;
}

// Ensure exactly one "/api" suffix regardless of env value
export function getApiBaseApi(): string {
  const base = (
    process.env.NEXT_PUBLIC_API_URL || "https://backend-ygiu.onrender.com"
  ).replace(/\/+$/, "");
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

function createApi(): AxiosInstance {
  const instance = axios.create({
    baseURL: getApiBaseApi(),
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
  });

  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => config
  );

  instance.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const original = error.config as
        | (InternalAxiosRequestConfig & { _retry?: boolean })
        | undefined;
      const status = error.response?.status ?? 0;

      // Log lỗi rõ ràng (chỉ trong development)
      if (process.env.NODE_ENV === "development") {
        console.error("🚨 API Error:", {
          url: error.config?.url,
          method: (error.config?.method || "get").toUpperCase(),
          status,
          data: error.response?.data,
        });
      }

      if (status === 401 && original && !original._retry) {
        if (isRefreshing) {
          await new Promise<void>((resolve) => pendingQueue.push(resolve));
          return getApi()(original);
        }
        original._retry = true;
        isRefreshing = true;
        try {
          await axios.post(
            `${getApiBaseApi()}/auth/refresh`,
            {},
            { withCredentials: true }
          );
          pendingQueue.forEach((fn) => fn());
          pendingQueue = [];
          return getApi()(original);
        } finally {
          isRefreshing = false;
        }
      }

      const msg = extractErrorMessage(error);
      const wrapped = new Error(`[${status}] ${msg}`);
      // @ts-expect-error attach extra for debug
      wrapped.__raw = error;
      throw wrapped;
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
export async function apiPut<T, B extends object>(
  url: string,
  body: B
): Promise<T> {
  const res = await getApi().put<T>(url, body);
  return res.data;
}
// frontend/src/lib/api.ts (bổ sung 2 hàm)
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
