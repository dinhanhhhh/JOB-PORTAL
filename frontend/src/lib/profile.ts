import { apiGet, apiPostForm, apiPut } from "./api";
import type {
  SeekerProfile,
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

export function uploadAvatar(file: File): Promise<{
  message: string;
  avatarUrl: string;
  profile: SeekerProfile;
}> {
  const formData = new FormData();
  formData.append("image", file);
  return apiPostForm<{
    message: string;
    avatarUrl: string;
    profile: SeekerProfile;
  }>("/profile/seeker/avatar", formData);
}

export function uploadResume(file: File): Promise<{
  message: string;
  resumeUrl: string;
  profile: SeekerProfile;
}> {
  const formData = new FormData();
  formData.append("resume", file);
  return apiPostForm<{
    message: string;
    resumeUrl: string;
    profile: SeekerProfile;
  }>("/profile/seeker/resume", formData);
}
