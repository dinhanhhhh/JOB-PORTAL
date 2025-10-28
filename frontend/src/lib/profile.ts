import { apiGet, apiPut } from "./api";
import type {
  SeekerProfileResponse,
  UpdateSeekerProfileRequest,
  UpdateSeekerProfileResponse,
} from "@/types";

export function getMyProfile() {
  return apiGet<SeekerProfileResponse>("/profile/seeker");
}

export function updateMyProfile(body: UpdateSeekerProfileRequest) {
  return apiPut<UpdateSeekerProfileResponse, UpdateSeekerProfileRequest>(
    "/profile/seeker",
    body
  );
}
