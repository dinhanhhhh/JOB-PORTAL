"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ExternalLink,
  FileText,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import {
  getMyProfile,
  updateMyProfile,
  uploadAvatar,
  uploadResume,
} from "@/lib/profile";
import { getDisplayErrorMessage, getProfileResumeViewUrl } from "@/lib/api";
import {
  calculateProfileCompleteness,
  isValidOptionalHttpUrl,
} from "@/lib/profileUtils";
import type { SeekerProfile, UpdateSeekerProfileRequest } from "@/types";
import CustomInput from "@/components/ui/CustomInput";
import CustomTextarea from "@/components/ui/CustomTextarea";
import CustomButton from "@/components/ui/CustomButton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SuggestionTagInput from "@/components/ui/SuggestionTagInput";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { POPULAR_SKILLS } from "@/lib/suggestions";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_BIO_LEN = 500;
const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const ALLOWED_RESUME_EXTENSIONS = [".pdf", ".doc", ".docx"];
const ALLOWED_RESUME_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

interface ProfileFetchState {
  key: string;
  profile: SeekerProfile | null;
  error: string | null;
}

interface ProfileFormState {
  phone: string;
  location: string;
  bio: string;
  skills: string[];
  experience: string;
  education: string;
  github: string;
  linkedin: string;
  portfolio: string;
}

const EMPTY_FORM: ProfileFormState = {
  phone: "",
  location: "",
  bio: "",
  skills: [],
  experience: "",
  education: "",
  github: "",
  linkedin: "",
  portfolio: "",
};

function profileToForm(profile: SeekerProfile): ProfileFormState {
  return {
    phone: profile.phone ?? "",
    location: profile.location ?? "",
    bio: profile.bio ?? "",
    skills: profile.skills ?? [],
    experience: profile.experience ?? "",
    education: profile.education ?? "",
    github: profile.github ?? "",
    linkedin: profile.linkedin ?? "",
    portfolio: profile.portfolio ?? "",
  };
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();

  const tp = translations[language].profile;
  const tc = translations[language].common;
  const ta = translations[language].auth;

  const [retryTick, setRetryTick] = useState(0);
  const fetchKey =
    !authLoading && user?.role === "seeker" ? `${user._id}:${retryTick}` : "";

  const [fetchState, setFetchState] = useState<ProfileFetchState>({
    key: "",
    profile: null,
    error: null,
  });

  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);

  const skillInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const loadingProfile = Boolean(fetchKey) && fetchState.key !== fetchKey;
  const profile = fetchState.key === fetchKey ? fetchState.profile : null;
  const fetchError = fetchState.key === fetchKey ? fetchState.error : null;

  useEffect(() => {
    if (!fetchKey) return;
    let cancelled = false;

    getMyProfile()
      .then((data) => {
        if (cancelled) return;
        setFetchState({ key: fetchKey, profile: data.profile, error: null });
        setForm(profileToForm(data.profile));
      })
      .catch((err) => {
        if (cancelled) return;
        setFetchState({
          key: fetchKey,
          profile: null,
          error: getDisplayErrorMessage(err, tc.error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [fetchKey, tc.error]);

  const addSkill = (overrideValue?: string) => {
    const raw = overrideValue ?? skillInput;
    const trimmed = raw.trim();
    if (!trimmed) {
      toast.info(
        language === "vi"
          ? "Vui lòng nhập hoặc chọn kỹ năng từ danh sách gợi ý."
          : "Please enter or pick a skill from the suggestions."
      );
      skillInputRef.current?.focus();
      return;
    }

    const existingLower = new Set(form.skills.map((s) => s.toLowerCase()));
    const toAdd: string[] = [];
    for (const part of trimmed.split(",")) {
      const cleaned = part.trim();
      if (!cleaned) continue;
      const lower = cleaned.toLowerCase();
      if (!existingLower.has(lower)) {
        existingLower.add(lower);
        toAdd.push(cleaned);
      }
    }

    if (toAdd.length === 0) {
      toast.info(
        language === "vi"
          ? "Kỹ năng này đã có trong danh sách."
          : "This skill is already in the list."
      );
      setSkillInput("");
      skillInputRef.current?.focus();
      return;
    }

    setForm((prev) => ({ ...prev, skills: [...prev.skills, ...toAdd] }));
    setSkillInput("");
    skillInputRef.current?.focus();
  };

  const removeSkill = (target: string) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== target),
    }));
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    const extOk = [".jpg", ".jpeg", ".png", ".gif", ".webp"].some((ext) =>
      lower.endsWith(ext)
    );
    const mimeOk = !file.type || ALLOWED_IMAGE_MIMES.has(file.type);

    if (!extOk || !mimeOk) {
      toast.error(tp.invalidImageFile);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(tp.fileTooLarge);
      event.target.value = "";
      return;
    }

    setUploadingAvatar(true);
    try {
      const res = await uploadAvatar(file);
      setFetchState({ key: fetchKey, profile: res.profile, error: null });
      toast.success(tp.avatarUpdated);
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleResumeChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    const extOk = ALLOWED_RESUME_EXTENSIONS.some((ext) => lower.endsWith(ext));
    const mimeOk = !file.type || ALLOWED_RESUME_MIMES.has(file.type);

    if (!extOk || !mimeOk) {
      toast.error(tp.invalidResumeFile);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(tp.fileTooLarge);
      event.target.value = "";
      return;
    }

    setUploadingResume(true);
    try {
      const res = await uploadResume(file);
      setFetchState({ key: fetchKey, profile: res.profile, error: null });
      toast.success(tp.resumeUpdated);
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setUploadingResume(false);
      if (resumeInputRef.current) resumeInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (form.bio.length > MAX_BIO_LEN) {
      toast.error(tp.bioTooLong);
      return;
    }

    if (
      !isValidOptionalHttpUrl(form.github) ||
      !isValidOptionalHttpUrl(form.linkedin) ||
      !isValidOptionalHttpUrl(form.portfolio)
    ) {
      toast.error(tp.invalidUrl);
      return;
    }

    const existingLower = new Set(form.skills.map((s) => s.toLowerCase()));
    const pendingSkills: string[] = [];
    for (const part of skillInput.split(",")) {
      const cleaned = part.trim();
      if (!cleaned) continue;
      const lower = cleaned.toLowerCase();
      if (!existingLower.has(lower)) {
        existingLower.add(lower);
        pendingSkills.push(cleaned);
      }
    }
    const mergedSkills =
      pendingSkills.length > 0 ? [...form.skills, ...pendingSkills] : form.skills;

    setSaving(true);
    try {
      const payload: UpdateSeekerProfileRequest = {
        phone: form.phone.trim(),
        location: form.location.trim(),
        bio: form.bio.trim(),
        skills: mergedSkills,
        experience: form.experience.trim(),
        education: form.education.trim(),
        github: form.github.trim(),
        linkedin: form.linkedin.trim(),
        portfolio: form.portfolio.trim(),
      };
      const res = await updateMyProfile(payload);
      setFetchState({ key: fetchKey, profile: res.profile, error: null });
      setForm(profileToForm(res.profile));
      setSkillInput("");
      toast.success(tp.saveSuccess);
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loadingProfile) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto interactive-panel p-8 text-center space-y-4">
        <p className="text-muted-foreground">{tp.loginRequired}</p>
        <Link
          href="/login?redirect=/profile"
          className="interactive-button inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium"
        >
          {ta.loginButton}
        </Link>
      </div>
    );
  }

  if (user.role !== "seeker") {
    return (
      <div className="max-w-lg mx-auto interactive-panel p-8 text-center space-y-4">
        <p className="text-muted-foreground">{tp.onlySeeker}</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
        >
          {tc.backHome}
        </Link>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center space-y-4">
        <AlertCircle className="h-7 w-7 text-destructive mx-auto" />
        <p className="text-destructive font-medium">{fetchError}</p>
        <CustomButton
          variant="outline"
          onClick={() => setRetryTick((prev) => prev + 1)}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {tc.retry}
        </CustomButton>
      </div>
    );
  }

  const completeness = calculateProfileCompleteness({
    ...form,
    resumeUrl: profile?.resumeUrl,
  });
  const avatarInitial = user.name.trim().charAt(0).toUpperCase() || "U";
  const isBioOverLimit = form.bio.length > MAX_BIO_LEN;

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {tp.title}
        </h1>
        <p className="text-sm text-muted-foreground">{tp.subtitle}</p>
      </header>

      {/* Profile Completeness Card */}
      <div className="interactive-panel p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">{tp.completenessTitle}</span>
          <span
            className={cn(
              "text-sm font-bold",
              completeness.percentage === 100
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-primary"
            )}
          >
            {completeness.percentage}% ({completeness.completedCount}/
            {completeness.totalCount})
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500 rounded-full",
              completeness.percentage === 100
                ? "bg-emerald-500"
                : "bg-primary"
            )}
            style={{ width: `${completeness.percentage}%` }}
          />
        </div>
        {completeness.missingFields.length === 0 ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {tp.completenessReady}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{tp.completenessHint}</span>
            {completeness.missingFields.map((field) => (
              <span
                key={field}
                className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground"
              >
                {tp.missingLabels[field]}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Avatar & Resume Uploads */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Avatar Card */}
        <div className="interactive-panel p-5 flex items-center gap-4">
          {profile?.avatar ? (
            <Image
              src={profile.avatar}
              alt={user.name}
              width={72}
              height={72}
              unoptimized
              className="h-18 w-18 rounded-full object-cover border border-border shrink-0"
            />
          ) : (
            <div className="h-18 w-18 rounded-full bg-primary/15 text-primary flex items-center justify-center text-2xl font-bold shrink-0">
              {avatarInitial}
            </div>
          )}
          <div className="space-y-2 min-w-0">
            <h2 className="text-sm font-semibold">{tp.avatarTitle}</h2>
            <p className="text-xs text-muted-foreground truncate">
              {user.name} · {user.email}
            </p>
            <label className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/70 px-3 py-1.5 text-xs font-medium hover:bg-secondary cursor-pointer transition-colors">
              <Camera className="h-3.5 w-3.5" />
              <span>
                {uploadingAvatar ? tp.uploadingAvatar : tp.changeAvatar}
              </span>
              <input
                ref={avatarInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp"
                disabled={uploadingAvatar}
                onChange={handleAvatarChange}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        {/* Resume Card */}
        <div className="interactive-panel p-5 flex flex-col justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-primary" />
              {tp.resumeTitle}
            </h2>
            {profile?.resumeUrl ? (
              <a
                href={getProfileResumeViewUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {tp.currentResume}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <p className="text-xs text-muted-foreground">{tp.noResumeYet}</p>
            )}
          </div>

          <label className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border bg-background/70 px-3 py-1.5 text-xs font-medium hover:bg-secondary cursor-pointer transition-colors">
            <Upload className="h-3.5 w-3.5" />
            <span>
              {uploadingResume ? tp.uploadingResume : tp.uploadResumeBtn}
            </span>
            <input
              ref={resumeInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              disabled={uploadingResume}
              onChange={handleResumeChange}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      {/* Main Profile Form */}
      <div className="interactive-panel overflow-visible p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <CustomInput
            id="phone"
            label={tp.phone}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+84 912 345 678"
          />
          <CustomInput
            id="location"
            label={tp.location}
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Ho Chi Minh City"
          />
        </div>

        <div className="space-y-1">
          <CustomTextarea
            id="bio"
            label={tp.bio}
            rows={4}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder={tp.bioPlaceholder}
            error={isBioOverLimit ? tp.bioTooLong : undefined}
          />
          <div
            className={cn(
              "text-right text-xs",
              isBioOverLimit
                ? "text-destructive font-semibold"
                : "text-muted-foreground"
            )}
          >
            {form.bio.length} / {MAX_BIO_LEN}
          </div>
        </div>

        {/* Skills Tag Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{tp.skillsLabel}</label>
          <SuggestionTagInput
            inputRef={skillInputRef}
            value={skillInput}
            onChange={setSkillInput}
            onAdd={addSkill}
            suggestions={POPULAR_SKILLS}
            selectedItems={form.skills}
            placeholder={tp.skillPlaceholder}
            addButtonLabel={tp.addSkill}
            suggestionsHeading={
              language === "vi" ? "Kỹ năng phổ biến" : "Popular skills"
            }
            emptySuggestionsText={
              language === "vi"
                ? "Không có gợi ý khớp — nhấn Enter hoặc + Thêm để thêm mới"
                : "No matching suggestions — press Enter or + Add to add custom"
            }
          />
          {form.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {form.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    aria-label={`Remove ${skill}`}
                    className="rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <CustomTextarea
          id="experience"
          label={tp.experience}
          rows={3}
          value={form.experience}
          onChange={(e) => setForm({ ...form, experience: e.target.value })}
          placeholder={tp.experiencePlaceholder}
        />

        <CustomTextarea
          id="education"
          label={tp.education}
          rows={2}
          value={form.education}
          onChange={(e) => setForm({ ...form, education: e.target.value })}
          placeholder={tp.educationPlaceholder}
        />

        <div className="space-y-3 pt-2 border-t border-border/50">
          <h3 className="text-sm font-semibold">{tp.socialLinksTitle}</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <CustomInput
              id="github"
              label="GitHub"
              value={form.github}
              onChange={(e) => setForm({ ...form, github: e.target.value })}
              placeholder="https://github.com/username"
              error={
                !isValidOptionalHttpUrl(form.github) ? tp.invalidUrl : undefined
              }
            />
            <CustomInput
              id="linkedin"
              label="LinkedIn"
              value={form.linkedin}
              onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
              placeholder="https://linkedin.com/in/username"
              error={
                !isValidOptionalHttpUrl(form.linkedin)
                  ? tp.invalidUrl
                  : undefined
              }
            />
            <CustomInput
              id="portfolio"
              label="Portfolio"
              value={form.portfolio}
              onChange={(e) => setForm({ ...form, portfolio: e.target.value })}
              placeholder="https://your-site.dev"
              error={
                !isValidOptionalHttpUrl(form.portfolio)
                  ? tp.invalidUrl
                  : undefined
              }
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <CustomButton
            onClick={handleSave}
            loading={saving}
            disabled={saving || isBioOverLimit}
          >
            {saving ? tp.saving : tp.saveButton}
          </CustomButton>
        </div>
      </div>
    </div>
  );
}
