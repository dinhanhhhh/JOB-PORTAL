export type ProfileMissingField =
  | "bio"
  | "skills"
  | "phone"
  | "location"
  | "experience"
  | "education"
  | "resume"
  | "socialLinks";

export interface ProfileCompletenessInput {
  phone?: string;
  location?: string;
  bio?: string;
  skills?: string[];
  experience?: string;
  education?: string;
  github?: string;
  portfolio?: string;
  linkedin?: string;
  resumeUrl?: string;
}

export interface ProfileCompletenessResult {
  percentage: number;
  completedCount: number;
  totalCount: number;
  missingFields: ProfileMissingField[];
}

export function calculateProfileCompleteness(
  profile: ProfileCompletenessInput | null | undefined
): ProfileCompletenessResult {
  const checks: Array<{ key: ProfileMissingField; complete: boolean }> = [
    { key: "bio", complete: Boolean(profile?.bio?.trim()) },
    {
      key: "skills",
      complete: Boolean(profile?.skills && profile.skills.length > 0),
    },
    { key: "phone", complete: Boolean(profile?.phone?.trim()) },
    { key: "location", complete: Boolean(profile?.location?.trim()) },
    { key: "experience", complete: Boolean(profile?.experience?.trim()) },
    { key: "education", complete: Boolean(profile?.education?.trim()) },
    { key: "resume", complete: Boolean(profile?.resumeUrl?.trim()) },
    {
      key: "socialLinks",
      complete: Boolean(
        profile?.github?.trim() ||
          profile?.linkedin?.trim() ||
          profile?.portfolio?.trim()
      ),
    },
  ];

  const missingFields = checks
    .filter((item) => !item.complete)
    .map((item) => item.key);
  const completedCount = checks.length - missingFields.length;

  return {
    percentage: Math.round((completedCount / checks.length) * 100),
    completedCount,
    totalCount: checks.length,
    missingFields,
  };
}

export function calculateSkillMatch(
  jobSkills: string[],
  candidateSkills: string[]
): { percentage: number; matched: string[]; missing: string[] } {
  const normalizedJobSkills = jobSkills
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (normalizedJobSkills.length === 0) {
    return { percentage: 0, matched: [], missing: [] };
  }

  const candidateSet = new Set(
    candidateSkills
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0)
  );

  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of normalizedJobSkills) {
    if (candidateSet.has(skill.toLowerCase())) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  return {
    percentage: Math.round((matched.length / normalizedJobSkills.length) * 100),
    matched,
    missing,
  };
}

export function isValidOptionalHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateJobSalaryInputs(
  minRaw: string,
  maxRaw: string
): {
  salaryMin?: number;
  salaryMax?: number;
  error?: "invalid" | "negative" | "inverted";
} {
  const minTrim = minRaw.trim();
  const maxTrim = maxRaw.trim();

  let salaryMin: number | undefined;
  let salaryMax: number | undefined;

  if (minTrim.length > 0) {
    const parsedMin = Number(minTrim);
    if (!Number.isFinite(parsedMin)) return { error: "invalid" };
    if (parsedMin < 0) return { error: "negative" };
    salaryMin = parsedMin;
  }

  if (maxTrim.length > 0) {
    const parsedMax = Number(maxTrim);
    if (!Number.isFinite(parsedMax)) return { error: "invalid" };
    if (parsedMax < 0) return { error: "negative" };
    salaryMax = parsedMax;
  }

  if (
    salaryMin !== undefined &&
    salaryMax !== undefined &&
    salaryMin > salaryMax
  ) {
    return { error: "inverted" };
  }

  return { salaryMin, salaryMax };
}
