"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Briefcase,
  Building2,
  CheckCircle2,
  ExternalLink,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  createJob,
  deleteJob,
  generateJobDescription,
  getMyJobs,
  toggleJobStatus,
  updateJob,
} from "@/lib/jobs";
import { getMyCompany } from "@/lib/company";
import {
  getJobApplications,
  summarizeCandidate,
  updateApplicationStatus,
} from "@/lib/applications";
import {
  ApiClientError,
  getApplicationResumeViewUrl,
  getDisplayErrorMessage,
} from "@/lib/api";
import { formatRelativeDate, formatSalaryRange } from "@/lib/searchHighlight";
import {
  calculateSkillMatch,
  validateJobSalaryInputs,
} from "@/lib/profileUtils";
import type {
  Application,
  ApplicationStatus,
  Company,
  Job,
  JobLevel,
  JobType,
} from "@/types";
import CustomInput from "@/components/ui/CustomInput";
import CustomTextarea from "@/components/ui/CustomTextarea";
import CustomButton from "@/components/ui/CustomButton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SuggestionTagInput from "@/components/ui/SuggestionTagInput";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { POPULAR_REQUIREMENTS, POPULAR_SKILLS } from "@/lib/suggestions";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

type DashboardTab = "my-jobs" | "form" | "applicants";

interface DashboardDataState {
  key: string;
  jobs: Job[];
  company: Company | null;
  error: string | null;
}

interface ApplicantsState {
  key: string;
  applications: Application[];
  error: string | null;
}

interface JobFormState {
  title: string;
  description: string;
  requirements: string[];
  skills: string[];
  location: string;
  isRemote: boolean;
  salaryMinStr: string;
  salaryMaxStr: string;
  level: JobLevel;
  type: JobType;
}

const INITIAL_JOB_FORM: JobFormState = {
  title: "",
  description: "",
  requirements: [],
  skills: ["React", "TypeScript"],
  location: "Ho Chi Minh City",
  isRemote: false,
  salaryMinStr: "1500",
  salaryMaxStr: "2500",
  level: "mid",
  type: "full-time",
};

function jobToFormState(job: Job): JobFormState {
  return {
    title: job.title,
    description: job.description,
    requirements: job.requirements ?? [],
    skills: job.skills ?? [],
    location: job.location ?? "",
    isRemote: job.isRemote,
    salaryMinStr: job.salaryMin !== undefined ? String(job.salaryMin) : "",
    salaryMaxStr: job.salaryMax !== undefined ? String(job.salaryMax) : "",
    level: job.level,
    type: job.type,
  };
}

const STATUS_BADGE_CLASS: Record<ApplicationStatus, string> = {
  submitted: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  viewed: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  accepted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-destructive/15 text-destructive",
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();

  const td = translations[language].dashboard;
  const tc = translations[language].common;
  const ta = translations[language].auth;
  const tco = translations[language].company;

  const [activeTab, setActiveTab] = useState<DashboardTab>("my-jobs");
  const [reloadTick, setReloadTick] = useState(0);

  const dashboardKey =
    !authLoading && user?.role === "employer" ? `${user._id}:${reloadTick}` : "";

  const [dashboardState, setDashboardState] = useState<DashboardDataState>({
    key: "",
    jobs: [],
    company: null,
    error: null,
  });

  const loadingDashboard =
    Boolean(dashboardKey) && dashboardState.key !== dashboardKey;
  const jobs = dashboardState.key === dashboardKey ? dashboardState.jobs : [];
  const company =
    dashboardState.key === dashboardKey ? dashboardState.company : null;
  const dashboardError =
    dashboardState.key === dashboardKey ? dashboardState.error : null;

  // Tab 1 filters & delete dialog
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed">(
    "all"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Tab 2 create/edit form
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [form, setForm] = useState<JobFormState>(INITIAL_JOB_FORM);
  const [skillInput, setSkillInput] = useState("");
  const [requirementInput, setRequirementInput] = useState("");
  const skillInputRef = useRef<HTMLInputElement>(null);
  const requirementInputRef = useRef<HTMLInputElement>(null);
  const [submittingJob, setSubmittingJob] = useState(false);
  const [generatingJd, setGeneratingJd] = useState(false);

  // Tab 3 applicants
  const [selectedJobId, setSelectedJobId] = useState("");
  const [applicantsReloadTick, setApplicantsReloadTick] = useState(0);
  const effectiveSelectedJobId =
    selectedJobId && jobs.some((j) => j._id === selectedJobId)
      ? selectedJobId
      : jobs[0]?._id ?? "";

  const applicantsFetchKey =
    activeTab === "applicants" && effectiveSelectedJobId
      ? `${effectiveSelectedJobId}:${applicantsReloadTick}`
      : "";

  const [applicantsState, setApplicantsState] = useState<ApplicantsState>({
    key: "",
    applications: [],
    error: null,
  });

  const loadingApplicants =
    Boolean(applicantsFetchKey) && applicantsState.key !== applicantsFetchKey;
  const applications =
    applicantsState.key === applicantsFetchKey
      ? applicantsState.applications
      : [];
  const applicantsError =
    applicantsState.key === applicantsFetchKey ? applicantsState.error : null;

  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [summaryMap, setSummaryMap] = useState<Record<string, string>>({});

  // Fetch employer jobs and company profile cleanly without sync setState in effect
  useEffect(() => {
    if (!dashboardKey) return;
    let cancelled = false;

    Promise.allSettled([getMyJobs(), getMyCompany()]).then(
      ([jobsRes, companyRes]) => {
        if (cancelled) return;

        if (jobsRes.status === "rejected") {
          setDashboardState({
            key: dashboardKey,
            jobs: [],
            company: null,
            error: getDisplayErrorMessage(jobsRes.reason, tc.error),
          });
          return;
        }

        let resolvedCompany: Company | null = null;
        if (companyRes.status === "fulfilled") {
          resolvedCompany = companyRes.value.company;
        } else if (
          !(
            companyRes.reason instanceof ApiClientError &&
            companyRes.reason.status === 404
          )
        ) {
          console.warn("Company fetch warning:", companyRes.reason);
        }

        setDashboardState({
          key: dashboardKey,
          jobs: jobsRes.value.jobs,
          company: resolvedCompany,
          error: null,
        });
      }
    );

    return () => {
      cancelled = true;
    };
  }, [dashboardKey, tc.error]);

  // Fetch applicants for the selected job when Applicants tab is active
  useEffect(() => {
    if (!applicantsFetchKey || !effectiveSelectedJobId) return;
    let cancelled = false;

    getJobApplications(effectiveSelectedJobId)
      .then((res) => {
        if (cancelled) return;
        setApplicantsState({
          key: applicantsFetchKey,
          applications: res.applications,
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setApplicantsState({
          key: applicantsFetchKey,
          applications: [],
          error: getDisplayErrorMessage(err, tc.error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [applicantsFetchKey, effectiveSelectedJobId, tc.error]);

  // Skill tag handlers
  const parseUniqueNewSkills = (raw: string, existing: string[]): string[] => {
    const existingLower = new Set(existing.map((s) => s.toLowerCase()));
    const added: string[] = [];
    for (const part of raw.split(",")) {
      const cleaned = part.trim();
      if (!cleaned) continue;
      const lower = cleaned.toLowerCase();
      if (!existingLower.has(lower)) {
        existingLower.add(lower);
        added.push(cleaned);
      }
    }
    return added;
  };

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

    const newSkills = parseUniqueNewSkills(trimmed, form.skills);
    if (newSkills.length === 0) {
      toast.info(
        language === "vi"
          ? "Kỹ năng này đã có trong danh sách."
          : "This skill is already in the list."
      );
      setSkillInput("");
      skillInputRef.current?.focus();
      return;
    }

    setForm((prev) => ({ ...prev, skills: [...prev.skills, ...newSkills] }));
    setSkillInput("");
    skillInputRef.current?.focus();
  };

  const removeSkill = (target: string) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== target),
    }));
  };

  // Requirement handlers
  const addRequirement = (overrideValue?: string) => {
    const raw = overrideValue ?? requirementInput;
    const trimmed = raw.trim();
    if (!trimmed) {
      toast.info(
        language === "vi"
          ? "Vui lòng nhập hoặc chọn yêu cầu từ danh sách gợi ý."
          : "Please enter or pick a requirement from the suggestions."
      );
      requirementInputRef.current?.focus();
      return;
    }

    const exists = form.requirements.some(
      (r) => r.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      toast.info(
        language === "vi"
          ? "Yêu cầu này đã có trong danh sách."
          : "This requirement is already in the list."
      );
      setRequirementInput("");
      requirementInputRef.current?.focus();
      return;
    }

    setForm((prev) => ({
      ...prev,
      requirements: [...prev.requirements, trimmed],
    }));
    setRequirementInput("");
    requirementInputRef.current?.focus();
  };

  const removeRequirement = (indexToRemove: number) => {
    setForm((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== indexToRemove),
    }));
  };

  const handleGenerateJd = async () => {
    if (form.title.trim().length < 3 || form.skills.length === 0) {
      toast.warning(td.aiJdMissingInput);
      return;
    }

    setGeneratingJd(true);
    try {
      const res = await generateJobDescription({
        title: form.title.trim(),
        skills: form.skills,
        level: form.level,
      });
      setForm((prev) => ({ ...prev, description: res.description }));
      toast.success(td.aiJdSuccess);
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setGeneratingJd(false);
    }
  };

  const handleStartCreate = () => {
    setEditingJob(null);
    setForm(INITIAL_JOB_FORM);
    setSkillInput("");
    setRequirementInput("");
    setActiveTab("form");
  };

  const handleStartEdit = (job: Job) => {
    setEditingJob(job);
    setForm(jobToFormState(job));
    setSkillInput("");
    setRequirementInput("");
    setActiveTab("form");
  };

  const handleCancelEdit = () => {
    setEditingJob(null);
    setForm(INITIAL_JOB_FORM);
    setSkillInput("");
    setRequirementInput("");
    setActiveTab("my-jobs");
  };

  const handleSubmitJob = async () => {
    const title = form.title.trim();
    const description = form.description.trim();

    const pendingSkills = parseUniqueNewSkills(skillInput, form.skills);
    const mergedSkills =
      pendingSkills.length > 0 ? [...form.skills, ...pendingSkills] : form.skills;

    const pendingRequirement = requirementInput.trim();
    const mergedRequirements = pendingRequirement
      ? [...form.requirements, pendingRequirement]
      : form.requirements;

    if (title.length < 3) {
      toast.error(td.validationTitle);
      return;
    }
    if (description.length < 20) {
      toast.error(td.validationDesc);
      return;
    }
    if (mergedSkills.length === 0) {
      toast.error(td.validationSkills);
      return;
    }

    const salaryCheck = validateJobSalaryInputs(
      form.salaryMinStr,
      form.salaryMaxStr
    );
    if (salaryCheck.error === "invalid") {
      toast.error(td.validationSalaryInvalid);
      return;
    }
    if (salaryCheck.error === "negative") {
      toast.error(td.validationSalaryNegative);
      return;
    }
    if (salaryCheck.error === "inverted") {
      toast.error(td.validationSalaryInverted);
      return;
    }

    const payload = {
      title,
      description,
      requirements: mergedRequirements,
      skills: mergedSkills,
      location: form.location.trim() || undefined,
      isRemote: form.isRemote,
      salaryMin: salaryCheck.salaryMin,
      salaryMax: salaryCheck.salaryMax,
      level: form.level,
      type: form.type,
    };

    setSubmittingJob(true);
    try {
      if (editingJob) {
        await updateJob(editingJob._id, payload);
        toast.success(td.jobUpdated);
      } else {
        await createJob(payload);
        toast.success(td.jobCreated);
      }
      setEditingJob(null);
      setForm(INITIAL_JOB_FORM);
      setSkillInput("");
      setRequirementInput("");
      setActiveTab("my-jobs");
      setReloadTick((prev) => prev + 1);
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setSubmittingJob(false);
    }
  };

  const handleToggleJobStatus = async (job: Job) => {
    setTogglingId(job._id);
    try {
      const res = await toggleJobStatus(job._id);
      setDashboardState((prev) => ({
        ...prev,
        jobs: prev.jobs.map((item) =>
          item._id === job._id ? { ...item, isActive: res.job.isActive } : item
        ),
      }));
      toast.success(td.jobStatusUpdated);
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDeleteJob = async () => {
    if (!jobToDelete) return;
    setDeleting(true);
    try {
      await deleteJob(jobToDelete._id);
      setDashboardState((prev) => ({
        ...prev,
        jobs: prev.jobs.filter((item) => item._id !== jobToDelete._id),
      }));
      if (editingJob?._id === jobToDelete._id) {
        setEditingJob(null);
        setForm(INITIAL_JOB_FORM);
      }
      setJobToDelete(null);
      toast.success(td.jobDeleted);
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateApplicationStatus = async (
    applicationId: string,
    status: ApplicationStatus
  ) => {
    setUpdatingAppId(applicationId);
    try {
      await updateApplicationStatus(applicationId, status);
      setApplicantsState((prev) => ({
        ...prev,
        applications: prev.applications.map((app) =>
          app._id === applicationId ? { ...app, status } : app
        ),
      }));
      toast.success(td.statusUpdated);
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setUpdatingAppId(null);
    }
  };

  const handleSummarizeCandidate = async (applicationId: string) => {
    setSummarizingId(applicationId);
    try {
      const res = await summarizeCandidate(applicationId);
      setSummaryMap((prev) => ({ ...prev, [applicationId]: res.summary }));
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setSummarizingId(null);
    }
  };

  if (authLoading || loadingDashboard) {
    return (
      <div className="max-w-5xl mx-auto py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto interactive-panel p-8 text-center space-y-4">
        <p className="text-muted-foreground">{td.loginRequired}</p>
        <Link
          href="/login?redirect=/dashboard"
          className="interactive-button inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium"
        >
          {ta.loginButton}
        </Link>
      </div>
    );
  }

  if (user.role !== "employer") {
    return (
      <div className="max-w-lg mx-auto interactive-panel p-8 text-center space-y-4">
        <p className="text-muted-foreground">{td.onlyEmployer}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
          >
            {tc.backHome}
          </Link>
          {user.role === "admin" && (
            <Link
              href="/admin"
              className="interactive-button inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium"
            >
              {tco.goAdmin}
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center space-y-4">
        <AlertCircle className="h-7 w-7 text-destructive mx-auto" />
        <p className="text-destructive font-medium">{dashboardError}</p>
        <CustomButton
          variant="outline"
          onClick={() => setReloadTick((prev) => prev + 1)}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {tc.retry}
        </CustomButton>
      </div>
    );
  }

  const activeJobsCount = jobs.filter((j) => j.isActive).length;
  const closedJobsCount = jobs.length - activeJobsCount;

  const filteredJobs = jobs.filter((job) => {
    if (statusFilter === "active" && !job.isActive) return false;
    if (statusFilter === "closed" && job.isActive) return false;
    if (
      searchTerm.trim() &&
      !job.title.toLowerCase().includes(searchTerm.trim().toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const selectedJob = jobs.find((j) => j._id === effectiveSelectedJobId);

  return (
    <div className="space-y-6 py-4">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {td.title}
          </h1>
          <p className="text-sm text-muted-foreground">{td.subtitle}</p>
        </div>

        <CustomButton onClick={handleStartCreate} className="gap-2 w-fit">
          <Plus className="h-4 w-4" />
          {td.postJobTab}
        </CustomButton>
      </header>

      {/* Missing Company Profile Banner */}
      {!company && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 text-sm text-amber-800 dark:text-amber-200">
            <Building2 className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{td.missingCompanyBanner}</span>
          </div>
          <Link
            href="/company"
            className="interactive-button inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-semibold shrink-0"
          >
            {td.setupCompanyBtn}
          </Link>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border/50 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("my-jobs")}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "my-jobs"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/70 text-foreground hover:bg-secondary"
          )}
        >
          <Briefcase className="h-4 w-4" />
          {td.myJobsTab} ({jobs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("form")}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "form"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/70 text-foreground hover:bg-secondary"
          )}
        >
          {editingJob ? (
            <>
              <Pencil className="h-4 w-4" />
              {td.editJobTab}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              {td.postJobTab}
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("applicants")}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "applicants"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/70 text-foreground hover:bg-secondary"
          )}
        >
          <Users className="h-4 w-4" />
          {td.applicantsTab}
        </button>
      </div>

      {/* TAB 1: MY JOBS */}
      {activeTab === "my-jobs" && (
        <section className="space-y-5">
          {/* KPI Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="interactive-panel p-4 flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {td.totalJobs}
              </span>
              <span className="text-2xl font-bold">{jobs.length}</span>
            </Card>
            <Card className="interactive-panel p-4 flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {td.activeJobs}
              </span>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {activeJobsCount}
              </span>
            </Card>
            <Card className="interactive-panel p-4 flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {td.closedJobs}
              </span>
              <span className="text-2xl font-bold text-muted-foreground">
                {closedJobsCount}
              </span>
            </Card>
          </div>

          {/* Search & Status Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={td.searchMyJobsPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "all" | "active" | "closed"
                )
              }
              className="px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">{td.allStatuses}</option>
              <option value="active">{td.activeOnly}</option>
              <option value="closed">{td.closedOnly}</option>
            </select>
          </div>

          {/* Job List */}
          {filteredJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card/60 p-10 text-center text-sm text-muted-foreground">
              {td.noMyJobs}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredJobs.map((job) => (
                <div
                  key={job._id}
                  className="interactive-panel p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/jobs/${job._id}`}
                        className="font-semibold text-base sm:text-lg hover:text-primary transition-colors truncate"
                      >
                        {job.title}
                      </Link>
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase",
                          job.isActive
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {job.isActive ? td.activeOnly : td.closedOnly}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="uppercase font-medium">{job.level}</span>
                      <span className="uppercase">{job.type}</span>
                      <span>
                        {formatSalaryRange(
                          job.salaryMin,
                          job.salaryMax,
                          language
                        )}
                      </span>
                      <span>
                        {job.isRemote ? tc.remote : job.location || tc.onsite}
                      </span>
                      <span>{formatRelativeDate(job.createdAt, language)}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {job.skills.slice(0, 5).map((skill) => (
                        <span
                          key={skill}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedJobId(job._id);
                        setActiveTab("applicants");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Users className="h-3.5 w-3.5" />
                      {td.viewApplicants}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(job)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/70 px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {td.editJob}
                    </button>

                    <button
                      type="button"
                      disabled={togglingId === job._id}
                      onClick={() => handleToggleJobStatus(job)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/70 px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors disabled:opacity-50"
                    >
                      <Power className="h-3.5 w-3.5" />
                      {job.isActive ? td.closeJob : td.reopenJob}
                    </button>

                    <button
                      type="button"
                      onClick={() => setJobToDelete(job)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {td.deleteJob}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: CREATE / EDIT JOB FORM */}
      {activeTab === "form" && (
        <Card className="interactive-panel overflow-visible space-y-5 p-6">
          {editingJob && (
            <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {td.editingBanner}{" "}
                <strong className="text-primary">{editingJob.title}</strong>
              </span>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs font-medium text-muted-foreground hover:text-foreground underline"
              >
                {td.cancelEdit}
              </button>
            </div>
          )}

          <CustomInput
            id="job-title"
            label={td.jobTitle}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{td.level}</label>
              <select
                className="h-9 w-full rounded-md border border-border/60 bg-background/70 px-3 text-sm transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.level}
                onChange={(e) =>
                  setForm({ ...form, level: e.target.value as JobLevel })
                }
              >
                {["entry", "mid", "senior", "lead", "executive"].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{td.jobType}</label>
              <select
                className="h-9 w-full rounded-md border border-border/60 bg-background/70 px-3 text-sm transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as JobType })
                }
              >
                {[
                  "full-time",
                  "part-time",
                  "contract",
                  "internship",
                  "freelance",
                ].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 items-end">
            <CustomInput
              id="job-location"
              label={td.location}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm h-9 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isRemote}
                onChange={(e) =>
                  setForm({ ...form, isRemote: e.target.checked })
                }
                className="h-4 w-4 rounded border-border/60 bg-background/60"
              />
              <span>{td.isRemote}</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <CustomInput
              id="salary-min"
              type="number"
              min={0}
              label={td.salaryMin}
              value={form.salaryMinStr}
              onChange={(e) =>
                setForm({ ...form, salaryMinStr: e.target.value })
              }
            />
            <CustomInput
              id="salary-max"
              type="number"
              min={0}
              label={td.salaryMax}
              value={form.salaryMaxStr}
              onChange={(e) =>
                setForm({ ...form, salaryMaxStr: e.target.value })
              }
            />
          </div>

          {/* Skills Tag Chips */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{td.skillsLabel}</label>
            <SuggestionTagInput
              inputRef={skillInputRef}
              value={skillInput}
              onChange={setSkillInput}
              onAdd={addSkill}
              suggestions={POPULAR_SKILLS}
              selectedItems={form.skills}
              placeholder={td.skillPlaceholder}
              addButtonLabel={td.addSkill}
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
                      className="rounded-full p-0.5 hover:bg-primary/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Dynamic Requirements List */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{td.requirementsLabel}</label>
            <SuggestionTagInput
              inputRef={requirementInputRef}
              value={requirementInput}
              onChange={setRequirementInput}
              onAdd={addRequirement}
              suggestions={POPULAR_REQUIREMENTS[language]}
              selectedItems={form.requirements}
              placeholder={td.requirementPlaceholder}
              addButtonLabel={td.addRequirement}
              suggestionsHeading={
                language === "vi" ? "Yêu cầu gợi ý" : "Suggested requirements"
              }
              emptySuggestionsText={
                language === "vi"
                  ? "Không có gợi ý khớp — nhấn Enter hoặc + Thêm yêu cầu để thêm mới"
                  : "No matching suggestions — press Enter or + Add to add custom"
              }
            />
            {form.requirements.length > 0 && (
              <ul className="space-y-2 pt-1">
                {form.requirements.map((reqItem, idx) => (
                  <li
                    key={`${idx}-${reqItem}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm"
                  >
                    <span className="break-words min-w-0 flex-1">{reqItem}</span>
                    <button
                      type="button"
                      onClick={() => removeRequirement(idx)}
                      className="text-muted-foreground hover:text-destructive p-1"
                      aria-label="Remove requirement"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Description + AI Generate */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="job-description" className="text-sm font-medium">
                {td.descriptionLabel}
              </label>
              <button
                type="button"
                disabled={generatingJd || submittingJob}
                onClick={handleGenerateJd}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {generatingJd ? td.generatingAiJd : td.generateAiJd}
              </button>
            </div>
            <CustomTextarea
              id="job-description"
              rows={7}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            {editingJob && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
              >
                {td.cancelEdit}
              </button>
            )}
            <CustomButton
              onClick={handleSubmitJob}
              loading={submittingJob}
              disabled={submittingJob || !company}
            >
              {submittingJob
                ? td.submittingJob
                : editingJob
                ? td.updateJobBtn
                : td.createJobBtn}
            </CustomButton>
          </div>
        </Card>
      )}

      {/* TAB 3: APPLICANTS BY JOB */}
      {activeTab === "applicants" && (
        <section className="space-y-5">
          {jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card/60 p-10 text-center text-sm text-muted-foreground">
              {td.noJobsForApplicants}
            </div>
          ) : (
            <>
              <div className="interactive-panel p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <label
                  htmlFor="applicant-job-select"
                  className="text-sm font-medium shrink-0"
                >
                  {td.selectJobLabel}:
                </label>
                <select
                  id="applicant-job-select"
                  value={effectiveSelectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="flex-1 h-9 rounded-md border border-border/60 bg-background px-3 text-sm"
                >
                  {jobs.map((job) => (
                    <option key={job._id} value={job._id}>
                      {job.title} ({job.isActive ? td.activeOnly : td.closedOnly})
                    </option>
                  ))}
                </select>
              </div>

              {loadingApplicants ? (
                <LoadingSpinner />
              ) : applicantsError ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
                  <p className="text-sm text-destructive">{applicantsError}</p>
                  <CustomButton
                    variant="outline"
                    onClick={() => setApplicantsReloadTick((p) => p + 1)}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {tc.retry}
                  </CustomButton>
                </div>
              ) : applications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-card/60 p-10 text-center text-sm text-muted-foreground">
                  {td.noApplicantsYet}
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((app) => {
                    const seekerObj =
                      typeof app.seeker === "object" && app.seeker !== null
                        ? app.seeker
                        : null;
                    const profile = app.seekerProfile;
                    const match = calculateSkillMatch(
                      selectedJob?.skills ?? [],
                      profile?.skills ?? []
                    );
                    const aiSummary = summaryMap[app._id];

                    return (
                      <div
                        key={app._id}
                        className="interactive-panel p-5 space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-base">
                                {seekerObj?.name || "Candidate"}
                              </h3>
                              <span
                                className={cn(
                                  "px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase",
                                  STATUS_BADGE_CLASS[app.status]
                                )}
                              >
                                {app.status}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {seekerObj?.email} · {td.appliedAt}:{" "}
                              {formatRelativeDate(app.createdAt, language)}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <select
                              value={app.status}
                              disabled={updatingAppId === app._id}
                              onChange={(e) =>
                                handleUpdateApplicationStatus(
                                  app._id,
                                  e.target.value as ApplicationStatus
                                )
                              }
                              className="h-9 rounded-md border border-border bg-background px-2.5 text-xs font-medium"
                            >
                              {(
                                [
                                  "submitted",
                                  "viewed",
                                  "accepted",
                                  "rejected",
                                ] as const
                              ).map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>

                            {app.resumeUrl && (
                              <a
                                href={getApplicationResumeViewUrl(app._id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border border-border bg-background/70 px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
                              >
                                {td.viewCv}
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}

                            <button
                              type="button"
                              disabled={summarizingId === app._id}
                              onClick={() => handleSummarizeCandidate(app._id)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              {summarizingId === app._id
                                ? td.summarizingAi
                                : td.summarizeAi}
                            </button>
                          </div>
                        </div>

                        {/* Skill Match Indicator */}
                        {selectedJob && selectedJob.skills.length > 0 && (
                          <div className="rounded-xl border border-border/50 bg-background/50 p-3 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold">
                                {td.skillMatch}
                              </span>
                              <span className="font-bold text-primary">
                                {match.percentage}% ({match.matched.length}/
                                {selectedJob.skills.length})
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {match.matched.map((skill) => (
                                <span
                                  key={`m-${skill}`}
                                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-medium"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  {skill}
                                </span>
                              ))}
                              {match.missing.map((skill) => (
                                <span
                                  key={`x-${skill}`}
                                  className="rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[11px]"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Candidate Profile Summary Details */}
                        {profile && (
                          <div className="grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
                            {profile.experience && (
                              <div>
                                <strong className="text-foreground">
                                  {td.experience}:
                                </strong>{" "}
                                {profile.experience}
                              </div>
                            )}
                            {profile.education && (
                              <div>
                                <strong className="text-foreground">
                                  {td.education}:
                                </strong>{" "}
                                {profile.education}
                              </div>
                            )}
                          </div>
                        )}

                        {app.coverLetter && (
                          <div className="rounded-xl bg-secondary/40 p-3 text-sm space-y-1">
                            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {td.coverLetter}
                            </div>
                            <p className="whitespace-pre-line text-foreground/90 text-xs sm:text-sm">
                              {app.coverLetter}
                            </p>
                          </div>
                        )}

                        {aiSummary && (
                          <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
                              <Sparkles className="h-3.5 w-3.5" />
                              {td.aiSummaryTitle}
                            </div>
                            <p className="whitespace-pre-line text-xs sm:text-sm text-foreground leading-relaxed">
                              {aiSummary}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      )}

      <ConfirmDialog
        open={Boolean(jobToDelete)}
        title={td.deleteConfirmTitle}
        description={td.deleteConfirmDesc.replace(
          "{title}",
          jobToDelete?.title ?? ""
        )}
        variant="destructive"
        loading={deleting}
        onConfirm={handleConfirmDeleteJob}
        onCancel={() => {
          if (!deleting) setJobToDelete(null);
        }}
      />
    </div>
  );
}
