import { apiGet, apiPostForm, apiPut } from "./api";
import type { Company, UpsertCompanyRequest } from "@/types";

export function getMyCompany(): Promise<{ company: Company }> {
  return apiGet<{ company: Company }>("/company/me");
}

export function upsertMyCompany(
  body: UpsertCompanyRequest
): Promise<{ company: Company }> {
  return apiPut<{ company: Company }, UpsertCompanyRequest>("/company/me", body);
}

export function uploadCompanyLogo(file: File): Promise<{
  message: string;
  logoUrl: string;
  company: Company;
}> {
  const formData = new FormData();
  formData.append("image", file);
  return apiPostForm<{
    message: string;
    logoUrl: string;
    company: Company;
  }>("/company/logo", formData);
}
