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
    if (loading || !user || user.role !== "seeker") return;

    let mounted = true;
    getMyProfile()
      .then((data) => {
        if (!mounted) return;
        setProfile(data.profile);
        setBio(data.profile.bio ?? "");
        setSkills(data.profile.skills.join(", "));
      })
      .catch((error) => {
        console.error("Error fetching profile:", error);
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
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0),
    };
    const data = await updateMyProfile(body);
    setProfile(data.profile);
    alert("Profile saved");
  };

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>Please sign in to view your profile.</p>;
  if (user.role !== "seeker") return <p>Only seekers can view this profile.</p>;
  if (!profile) return <p>Loading profile...</p>;

  return (
    <div className="max-w-xl interactive-panel space-y-4 p-6">
      <h1 className="text-xl font-semibold">Profile</h1>
      <CustomTextarea
        label="Bio"
        rows={4}
        value={bio}
        onChange={(event) => setBio(event.target.value)}
      />
      <CustomInput
        label="Skills (comma separated)"
        value={skills}
        onChange={(event) => setSkills(event.target.value)}
      />
      <CustomButton onClick={save}>Save</CustomButton>
    </div>
  );
}

