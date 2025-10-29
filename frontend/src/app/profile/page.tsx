"use client";

import { useEffect, useState } from "react";
import { getMyProfile, updateMyProfile } from "@/lib/profile";
import type { SeekerProfile, UpdateSeekerProfileRequest } from "@/types";
import CustomInput from "@/components/ui/CustomInput";
import CustomTextarea from "@/components/ui/CustomTextarea";
import CustomButton from "@/components/ui/CustomButton";
import { useAuth } from "@/components/providers/AuthProvider";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<SeekerProfile | null>(null);
  const [bio, setBio] = useState<string>("");
  const [skills, setSkills] = useState<string>("");

  useEffect(() => {
    if (loading) return; // Wait for auth to load

    if (!user) {
      console.log("No user found");
      return;
    }

    if (user.role !== "seeker") {
      console.log("User is not a seeker, role:", user.role);
      return;
    }

    let mounted = true;
    console.log("Fetching profile for user:", user);
    getMyProfile()
      .then((data) => {
        console.log("Profile data received:", data);
        if (!mounted) return;
        setProfile(data.profile);
        setBio(data.profile.bio ?? "");
        setSkills(data.profile.skills.join(", "));
      })
      .catch((error) => {
        console.error("Error fetching profile:", error);
        /* not seeker / not logged in */
      });
    return () => {
      mounted = false;
    };
  }, [user, loading]);

  const save = async () => {
    const body: UpdateSeekerProfileRequest = {
      bio,
      skills: skills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    };
    const data = await updateMyProfile(body);
    setProfile(data.profile);
    alert("Đã lưu profile");
  };

  if (loading) return <p>Đang tải...</p>;
  if (!user) return <p>Vui lòng đăng nhập để xem profile</p>;
  if (user.role !== "seeker")
    return <p>Chỉ có seeker mới có thể xem profile này</p>;
  if (!profile) return <p>Đang tải profile...</p>;

  return (
    <div className="max-w-xl bg-card text-card-foreground border rounded-xl p-6 space-y-4">
      <h1 className="text-xl font-semibold">Hồ sơ</h1>
      <CustomTextarea
        label="Bio"
        rows={4}
        value={bio}
        onChange={(e) => setBio(e.target.value)}
      />
      <CustomInput
        label="Skills (phân tách bằng dấu phẩy)"
        value={skills}
        onChange={(e) => setSkills(e.target.value)}
      />
      <CustomButton onClick={save}>Lưu</CustomButton>
    </div>
  );
}

