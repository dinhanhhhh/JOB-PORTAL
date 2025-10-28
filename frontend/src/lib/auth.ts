import { apiGet, apiPost } from "./api";
import type { LoginRequest, LoginResponse, MeResponse, User } from "@/types";

export async function me(): Promise<User | null> {
  try {
    const data = await apiGet<MeResponse>("/auth/me");
    return data.user;
  } catch {
    return null;
  }
}

export async function login(body: LoginRequest): Promise<User> {
  const data = await apiPost<LoginResponse, LoginRequest>("/auth/login", body);
  return data.user;
}

export async function register(body: {
  email: string;
  password: string;
  name: string;
  role?: "seeker" | "employer";
}): Promise<User> {
  const data = await apiPost<
    LoginResponse,
    {
      email: string;
      password: string;
      name: string;
      role?: "seeker" | "employer";
    }
  >("/auth/register", body);
  return data.user;
}

export async function logout(): Promise<void> {
  await apiPost<{ ok: boolean }, Record<string, never>>("/auth/logout", {});
}
