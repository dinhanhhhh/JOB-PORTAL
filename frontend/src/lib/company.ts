// frontend/src/lib/company.ts
import { apiGet, apiPut } from "./api";
import type { Company } from "@/types";

// Trả về đúng cấu trúc BE: { company }
export function getMyCompany(): Promise<{ company: Company }> {
  return apiGet<{ company: Company }>("/company/me");
}

// Gửi chỉ những field BE chấp nhận: name, description, website
export function upsertMyCompany(
  body: Pick<Company, "name" | "description" | "website">
): Promise<{ company: Company }> {
  return apiPut<
    { company: Company },
    Pick<Company, "name" | "description" | "website">
  >("/company/me", body);
}
