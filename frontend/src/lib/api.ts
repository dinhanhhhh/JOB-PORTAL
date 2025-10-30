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

export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL?.trim() || FALLBACK_BASE_URL;
}

// Ensure exactly one "/api" suffix regardless of env value
export function getApiBaseApi(): string {
  const base = getApiBase().replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

type ZodFlatten = {
  fieldErrors?: Record<string, string[]>;
  formErrors?: string[];
};

function extractErrorMessage(err: unknown): string {
  const ax = err as AxiosError;
  const data = ax.response?.data as unknown;

  if (typeof data === "string") return data;

  if (data && typeof data === "object") {
    // @ts-expect-error safe drill common response shapes
    if (typeof data.message === "string" && !data.errors) return data.message;

    // @ts-expect-error safe drill: { message, errors } pattern
    const errors: ZodFlatten | undefined = data.errors;
    if (errors && typeof errors === "object") {
      const fe = errors.fieldErrors ?? {};
      for (const key of Object.keys(fe)) {
        const msgs = fe[key];
        if (Array.isArray(msgs) && msgs.length > 0) {
          return `${key}: ${msgs[0]}`;
        }
      }
      if (Array.isArray(errors.formErrors) && errors.formErrors.length > 0) {
        return errors.formErrors[0];
      }
    }

    // @ts-expect-error: normalize legacy error payloads
    if (typeof data.error === "string") return data.error;
    // @ts-expect-error: normalize legacy error payloads
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
      const original = error.config as RetryConfig | undefined;
      const status = error.response?.status ?? 0;

      if (process.env.NODE_ENV === "development") {
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
          throw refreshError;
        } finally {
          pendingQueue = [];
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
