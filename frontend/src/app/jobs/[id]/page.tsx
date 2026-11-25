"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  Bookmark,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  FileText,
  Layers,
  MapPin,
  RefreshCw,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { getJobById, getJobs } from "@/lib/jobs";
import {
  applyToJob,
  generateCoverLetter,
  getMyApplications,
} from "@/lib/applications";
import { getMyProfile } from "@/lib/profile";
import { getDisplayErrorMessage, getProfileResumeViewUrl } from "@/lib/api";
import { formatRelativeDate, formatSalaryRange } from "@/lib/searchHighlight";
import type { Application, Job } from "@/types";
import CustomButton from "@/components/ui/CustomButton";
import CustomTextarea from "@/components/ui/CustomTextarea";
import Skeleton from "@/components/ui/Skeleton";
import JobCard from "@/components/jobs/JobCard";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

const MAX_COVER_LETTER_LEN = 1000;
const MAX_RESUME_SIZE = 5 * 1024 * 1024;
const ALLOWED_RESUME_EXTENSIONS = [".pdf", ".doc", ".docx"];
const ALLOWED_RESUME_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function trimToMaxWords(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const sliced = text.slice(0, maxLen);
  const lastSpace = sliced.lastIndexOf(" ");
  if (lastSpace > maxLen * 0.75) {
    return sliced.slice(0, lastSpace).trimEnd();
  }
  return sliced.trimEnd();
}

function isValidResumeFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  const extOk = ALLOWED_RESUME_EXTENSIONS.some((ext) =>
    lowerName.endsWith(ext)
  );
  const mimeOk = !file.type || ALLOWED_RESUME_MIMES.has(file.type);
  return extOk && mimeOk;
}

interface JobFetchState {
  key: string;
  job: Job | null;
  error: string | null;
}

export default function JobDetailPage() {
  const params = useParams();
  const jobId = typeof params.id === "string" ? params.id : "";
  const { user } = useAuth();
  const router = useRouter();
  const { language } = useLanguage();
  const { toast } = useToast();
  const { isSaved, toggleSave } = useSavedJobs();

  const tc = translations[language].common;
  const th = translations[language].home;
  const tj = translations[language].jobDetail;

  const [retryTick, setRetryTick] = useState(0);
  const fetchKey = `${jobId}:${retryTick}`;
  const [jobState, setJobState] = useState<JobFetchState>({
    key: "",
    job: null,
    error: null,
  });

  const loading = Boolean(jobId) && jobState.key !== fetchKey;
  const job = jobState.key === fetchKey ? jobState.job : null;
  const error = jobState.key === fetchKey ? jobState.error : null;

  const [applying, setApplying] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);

  const [existingApplication, setExistingApplication] =
    useState<Application | null>(null);
  const [profileResumeUrl, setProfileResumeUrl] = useState<string | null>(null);
  const [relatedJobs, setRelatedJobs] = useState<Job[]>([]);

  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = null;
      }
    };
  }, []);

  // Fetch main job details cleanly without synchronous setState inside useEffect
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    getJobById(jobId)
      .then((data) => {
        if (cancelled) return;
        setJobState({ key: fetchKey, job: data.job, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Get job error:", err);
        setJobState({
          key: fetchKey,
          job: null,
          error: getDisplayErrorMessage(err, tc.error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [jobId, fetchKey, tc.error]);

  // Fetch seeker status (already applied + profile resume URL)
  useEffect(() => {
    if (!jobId || user?.role !== "seeker") {
      return;
    }

    let cancelled = false;
    Promise.allSettled([getMyApplications(), getMyProfile()]).then(
      ([appsResult, profileResult]) => {
        if (cancelled) return;

        if (appsResult.status === "fulfilled") {
          const match = appsResult.value.applications.find((app) => {
            const appJobId =
              typeof app.job === "string" ? app.job : app.job?._id;
            return appJobId === jobId;
          });
          setExistingApplication(match ?? null);
        }

        if (profileResult.status === "fulfilled") {
          setProfileResumeUrl(profileResult.value.profile.resumeUrl ?? null);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [jobId, user]);

  // Fetch related jobs of the same level
  const jobLevel = job?.level;
  const loadedJobId = job?._id;
  useEffect(() => {
    if (!loadedJobId || !jobLevel) return;
    let cancelled = false;

    getJobs({ level: jobLevel, limit: 4 })
      .then((data) => {
        if (cancelled) return;
        setRelatedJobs(
          data.data.filter((item) => item._id !== loadedJobId).slice(0, 3)
        );
      })
      .catch(() => {
        if (!cancelled) setRelatedJobs([]);
      });

    return () => {
      cancelled = true;
    };
  }, [loadedJobId, jobLevel]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setResumeFile(null);
      return;
    }

    if (!isValidResumeFile(file)) {
      toast.error(tj.invalidFileType);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_RESUME_SIZE) {
      toast.error(tj.fileTooLarge);
      event.target.value = "";
      return;
    }

    setResumeFile(file);
  };

  const handleClearFile = () => {
    setResumeFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success(tj.linkCopied);
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
      copiedTimerRef.current = setTimeout(() => {
        setCopied(false);
        copiedTimerRef.current = null;
      }, 2000);
    } catch {
      toast.error(tc.error);
    }
  };

  const handleToggleSave = () => {
    if (!job) return;
    const nowSaved = toggleSave(job);
    toast.info(nowSaved ? th.savedAdded : th.savedRemoved);
  };

  const handleGenerateCoverLetter = async () => {
    if (!jobId) return;
    setGeneratingAi(true);
    try {
      const result = await generateCoverLetter(jobId);
      const raw = result.coverLetter.trim();
      if (raw.length > MAX_COVER_LETTER_LEN) {
        setCoverLetter(trimToMaxWords(raw, MAX_COVER_LETTER_LEN));
        toast.warning(tj.aiCoverLetterTrimmed);
      } else {
        setCoverLetter(raw);
        toast.success(tj.aiCoverLetterGenerated);
      }
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleApply = async () => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/jobs/${jobId}`)}`);
      return;
    }

    if (user.role !== "seeker") {
      toast.warning(tj.onlySeekerCanApply);
      return;
    }

    if (!resumeFile && !profileResumeUrl) {
      toast.error(tj.needResumeError);
      return;
    }

    if (coverLetter.length > MAX_COVER_LETTER_LEN) {
      toast.error(tj.coverLetterTooLong);
      return;
    }

    setApplying(true);
    try {
      const formData = new FormData();
      if (resumeFile) {
        formData.append("resume", resumeFile);
      }
      if (coverLetter.trim().length > 0) {
        formData.append("coverLetter", coverLetter.trim());
      }

      const result = await applyToJob(jobId, formData);
      setExistingApplication(result.application);
      toast.success(tj.applySuccess);
      router.push("/applications");
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-card/60 border border-border/60 rounded-2xl p-6 md:p-8 space-y-6">
          <Skeleton className="h-9 w-2/3" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/4" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="fade-up-soft rounded-2xl border border-destructive/20 bg-destructive/5 p-10 text-center backdrop-blur flex flex-col items-center justify-center gap-4 max-w-xl mx-auto">
          <div className="p-3 rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <p className="text-destructive font-medium">{error}</p>
          <CustomButton
            onClick={() => setRetryTick((prev) => prev + 1)}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {tc.retry}
          </CustomButton>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="fade-up-soft rounded-2xl border border-dashed border-border/60 bg-card/70 p-10 text-center backdrop-blur">
          <p className="text-muted-foreground">{tj.notFound}</p>
        </div>
      </div>
    );
  }

  const saved = isSaved(job._id);
  const postedLabel = formatRelativeDate(job.createdAt, language);
  const isOverLimit = coverLetter.length > MAX_COVER_LETTER_LEN;
  const activeExistingApplication =
    user?.role === "seeker" ? existingApplication : null;
  const activeProfileResume =
    user?.role === "seeker" ? profileResumeUrl : null;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Back button */}
      <div className="fade-up-soft text-sm text-muted-foreground">
        <button
          type="button"
          onClick={() => router.back()}
          className="hover:text-foreground transition-colors inline-flex items-center gap-1.5"
        >
          &larr; {tj.backToList}
        </button>
      </div>

      {/* Job Details Card */}
      <div className="fade-up-soft bg-card/60 border border-border/60 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-lg space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-24 w-24 bg-primary/10 rounded-bl-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 relative z-10">
          <div className="space-y-3 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight break-words">
              {job.title}
            </h1>

            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary uppercase">
                {job.level}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent text-accent-foreground uppercase">
                {job.type}
              </span>
              {job.isRemote && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase">
                  Remote
                </span>
              )}
              {!job.isActive && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-destructive/15 text-destructive uppercase">
                  Closed
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleSave}
              aria-pressed={saved}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                saved
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-background/70 text-foreground hover:bg-secondary"
              )}
            >
              <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
              <span>{saved ? th.unsaveJob : th.saveJob}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background/70 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              <span>{tj.shareJob}</span>
            </button>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 pt-6 border-t border-border/40">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/40 min-w-0">
            <Briefcase className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                {tj.company}
              </span>
              <span className="text-sm font-semibold truncate">
                {job.company?.name || "N/A"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/40 min-w-0">
            <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                {tj.location}
              </span>
              <span className="text-sm font-semibold truncate">
                {job.isRemote ? tc.remote : job.location || tc.onsite}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/40 min-w-0">
            <DollarSign className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                {tj.salary}
              </span>
              <span className="text-sm font-semibold truncate">
                {formatSalaryRange(job.salaryMin, job.salaryMax, language)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/40 min-w-0">
            {postedLabel ? (
              <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
            ) : (
              <Layers className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                {postedLabel ? tj.posted : tj.level}
              </span>
              <span className="text-sm font-semibold capitalize truncate">
                {postedLabel || job.level}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3 pt-6 border-t border-border/30">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {tj.description}
          </h3>
          <p className="whitespace-pre-line text-muted-foreground leading-relaxed text-sm md:text-base">
            {job.description}
          </p>
        </div>

        {/* Requirements */}
        {job.requirements && job.requirements.length > 0 && (
          <div className="space-y-3 pt-6 border-t border-border/30">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              {tj.requirements}
            </h3>
            <ul className="space-y-2 pl-5 list-disc text-muted-foreground text-sm md:text-base">
              {job.requirements.map((reqItem, i) => (
                <li key={i}>{reqItem}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Skills Tag List */}
        <div className="space-y-3 pt-6 border-t border-border/30">
          <h3 className="text-lg font-semibold">{tj.skills}</h3>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill) => (
              <span
                key={skill}
                className="bg-accent text-accent-foreground hover:bg-accent/80 transition-colors px-3 py-1.5 rounded-xl text-xs font-semibold"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Closed Job Banner */}
      {!job.isActive && (
        <div className="fade-up-soft rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex items-center gap-3 text-sm text-amber-700 dark:text-amber-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{tj.jobClosedNotice}</span>
        </div>
      )}

      {/* Already Applied Banner */}
      {activeExistingApplication && (
        <div className="fade-up-soft rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="font-semibold text-base">
                {tj.alreadyAppliedTitle}
              </h2>
              <p className="text-sm text-muted-foreground">
                {tj.alreadyAppliedDesc}{" "}
                <span className="font-semibold uppercase text-foreground">
                  {activeExistingApplication.status}
                </span>
              </p>
            </div>
          </div>
          <Link
            href="/applications"
            className="interactive-button inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium shrink-0"
          >
            {tj.viewMyApplications}
          </Link>
        </div>
      )}

      {/* Apply Form - Only for Seekers when job is active and not yet applied */}
      {user?.role === "seeker" && job.isActive && !activeExistingApplication && (
        <div className="fade-up-soft bg-card/60 border border-border/60 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-lg space-y-6">
          <h2 className="text-xl font-bold">{tj.applyTitle}</h2>

          {activeProfileResume && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{tj.usingProfileResume}</span>
              </div>
              <a
                href={getProfileResumeViewUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
              >
                {tj.viewSavedResume}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-muted-foreground">
              {activeProfileResume
                ? tj.uploadNewResume
                : tj.uploadResumeLabel}
            </label>
            <div className="border border-dashed border-border/60 rounded-xl p-4 bg-background/50 hover:bg-background transition-colors flex flex-col items-center justify-center cursor-pointer relative text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm font-medium text-foreground break-all px-4">
                {resumeFile ? resumeFile.name : tj.dropzoneText}
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                {tj.uploadResumeHint}
              </span>
            </div>
            {resumeFile && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleClearFile}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  {tc.cancel}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">{tj.coverLetterLabel}</span>
              <button
                type="button"
                onClick={handleGenerateCoverLetter}
                disabled={generatingAi || applying}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {generatingAi ? tj.generatingAi : tj.generateAiCoverLetter}
              </button>
            </div>

            <CustomTextarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={6}
              placeholder={tj.coverLetterPlaceholder}
              error={isOverLimit ? tj.coverLetterTooLong : undefined}
            />

            <div
              className={cn(
                "text-right text-xs",
                isOverLimit ? "text-destructive font-semibold" : "text-muted-foreground"
              )}
            >
              {coverLetter.length} / {MAX_COVER_LETTER_LEN}
            </div>
          </div>

          <CustomButton
            onClick={handleApply}
            loading={applying}
            disabled={applying || isOverLimit}
            className="w-full"
          >
            {applying ? tj.submittingApplication : tj.submitApplication}
          </CustomButton>
        </div>
      )}

      {!user && job.isActive && (
        <div className="fade-up-soft bg-card/60 border border-border/60 rounded-2xl p-8 backdrop-blur-md shadow-lg text-center space-y-4 max-w-md mx-auto">
          <p className="text-muted-foreground text-sm">{tj.loginToApply}</p>
          <CustomButton
            onClick={() =>
              router.push(`/login?redirect=${encodeURIComponent(`/jobs/${jobId}`)}`)
            }
            className="w-full"
          >
            {tj.loginNow}
          </CustomButton>
        </div>
      )}

      {/* Related Jobs */}
      {relatedJobs.length > 0 && (
        <section className="space-y-4 pt-4">
          <h2 className="text-xl font-semibold">{tj.relatedJobs}</h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {relatedJobs.map((item, idx) => (
              <JobCard key={item._id} job={item} index={idx} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
