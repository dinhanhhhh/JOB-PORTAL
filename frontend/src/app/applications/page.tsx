"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import {
  getMyApplications,
  summarizeCandidate,
  updateApplicationStatus,
  withdrawApplication,
} from "@/lib/applications";
import {
  canWithdrawApplication,
  countApplicationsByStatus,
  getApplicationTimelineStep,
  safeGetJobInfo,
  safeGetSeekerInfo,
  type AppStatusKey,
} from "@/lib/applicationUtils";
import {
  getApplicationResumeViewUrl,
  getDisplayErrorMessage,
} from "@/lib/api";
import { formatRelativeDate } from "@/lib/searchHighlight";
import type { Application, ApplicationStatus } from "@/types";
import CustomButton from "@/components/ui/CustomButton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

interface ApplicationsFetchState {
  key: string;
  applications: Application[];
  error: string | null;
}

const STATUS_BADGE_CLASSES: Record<ApplicationStatus, string> = {
  submitted: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  viewed: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  accepted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-destructive/15 text-destructive",
};

const COVER_LETTER_PREVIEW_LEN = 160;

export default function MyApplicationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();

  const tap = translations[language].applications;
  const tc = translations[language].common;
  const ta = translations[language].auth;

  const [reloadTick, setReloadTick] = useState(0);
  const fetchKey = !authLoading && user ? `${user._id}:${reloadTick}` : "";

  const [fetchState, setFetchState] = useState<ApplicationsFetchState>({
    key: "",
    applications: [],
    error: null,
  });

  const [statusFilter, setStatusFilter] = useState<"all" | AppStatusKey>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  // Seeker withdraw modal
  const [withdrawTarget, setWithdrawTarget] = useState<Application | null>(
    null
  );
  const [withdrawing, setWithdrawing] = useState(false);

  // Employer / Admin status & AI summary
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [summaryMap, setSummaryMap] = useState<Record<string, string>>({});

  const loading = Boolean(fetchKey) && fetchState.key !== fetchKey;
  const apps = fetchState.key === fetchKey ? fetchState.applications : [];
  const fetchError = fetchState.key === fetchKey ? fetchState.error : null;

  useEffect(() => {
    if (!fetchKey) return;
    let cancelled = false;

    getMyApplications()
      .then((data) => {
        if (cancelled) return;
        setFetchState({
          key: fetchKey,
          applications: data.applications,
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setFetchState({
          key: fetchKey,
          applications: [],
          error: getDisplayErrorMessage(err, tc.error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [fetchKey, tc.error]);

  const handleConfirmWithdraw = async () => {
    if (!withdrawTarget) return;
    setWithdrawing(true);
    try {
      await withdrawApplication(withdrawTarget._id);
      setFetchState((prev) => ({
        ...prev,
        applications: prev.applications.filter(
          (item) => item._id !== withdrawTarget._id
        ),
      }));
      setWithdrawTarget(null);
      toast.success(tap.withdrawSuccess);
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setWithdrawing(false);
    }
  };

  const handleStatusChange = async (
    applicationId: string,
    nextStatus: ApplicationStatus
  ) => {
    setUpdatingId(applicationId);
    try {
      const res = await updateApplicationStatus(applicationId, nextStatus);
      setFetchState((prev) => ({
        ...prev,
        applications: prev.applications.map((item) =>
          item._id === applicationId
            ? {
                ...item,
                status: nextStatus,
                viewedAt: res.application.viewedAt ?? item.viewedAt,
                respondedAt: res.application.respondedAt ?? item.respondedAt,
              }
            : item
        ),
      }));
      toast.success(tap.statusUpdated);
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSummarize = async (applicationId: string) => {
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

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto interactive-panel p-8 text-center space-y-4">
        <p className="text-muted-foreground">{tap.loginRequired}</p>
        <Link
          href="/login?redirect=/applications"
          className="interactive-button inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium"
        >
          {ta.loginButton}
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
          onClick={() => setReloadTick((prev) => prev + 1)}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {tc.retry}
        </CustomButton>
      </div>
    );
  }

  const isManager = user.role === "employer" || user.role === "admin";
  const counts = countApplicationsByStatus(apps);

  const filteredApps = apps.filter((app) => {
    if (statusFilter !== "all" && app.status !== statusFilter) {
      return false;
    }

    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;

    const jobInfo = safeGetJobInfo(app.job);
    const seekerInfo = safeGetSeekerInfo(app.seeker);
    const haystack = [
      jobInfo.title,
      jobInfo.companyName,
      seekerInfo.name,
      seekerInfo.email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });

  const withdrawJobTitle =
    safeGetJobInfo(withdrawTarget?.job).title ?? tap.jobUnavailable;

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {isManager ? tap.manageApplicationsTitle : tap.myApplicationsTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isManager ? tap.subtitleManager : tap.subtitleSeeker}
        </p>
      </header>

      {/* Filter Pills + Quick Search */}
      <div className="interactive-panel p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "submitted", "viewed", "accepted", "rejected"] as const).map(
            (key) => {
              const label =
                key === "all" ? tap.allStatuses : tap.statusLabels[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    statusFilter === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  <span>{label}</span>
                  <span className="rounded-full bg-background/20 px-1.5 py-0.5 text-[11px] font-semibold">
                    {counts[key]}
                  </span>
                </button>
              );
            }
          )}
        </div>

        <div className="relative">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={tap.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Applications List */}
      {apps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/60 p-10 text-center text-sm text-muted-foreground">
          {tap.emptyAll}
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/60 p-10 text-center text-sm text-muted-foreground">
          {tap.emptyFiltered}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApps.map((app) => {
            const jobInfo = safeGetJobInfo(app.job);
            const seekerInfo = safeGetSeekerInfo(app.seeker);
            const step = getApplicationTimelineStep(app.status);
            const fullCoverLetter = app.coverLetter ?? "";
            const isLongCoverLetter =
              fullCoverLetter.length > COVER_LETTER_PREVIEW_LEN;
            const isExpanded = Boolean(expandedMap[app._id]);
            const displayedCoverLetter =
              isLongCoverLetter && !isExpanded
                ? `${fullCoverLetter.slice(0, COVER_LETTER_PREVIEW_LEN)}...`
                : fullCoverLetter;
            const aiSummary = summaryMap[app._id];

            return (
              <div
                key={app._id}
                className="interactive-panel p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {jobInfo.id ? (
                        <Link
                          href={`/jobs/${jobInfo.id}`}
                          className="font-semibold text-base sm:text-lg hover:text-primary transition-colors"
                        >
                          {jobInfo.title ?? tap.viewJob}
                        </Link>
                      ) : (
                        <span className="font-semibold text-base text-muted-foreground">
                          {tap.jobUnavailable}
                        </span>
                      )}
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                          STATUS_BADGE_CLASSES[app.status]
                        )}
                      >
                        {tap.statusLabels[app.status]}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {jobInfo.companyName && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {jobInfo.companyName}
                        </span>
                      )}
                      {isManager && (seekerInfo.name || seekerInfo.email) && (
                        <span className="inline-flex items-center gap-1 text-foreground">
                          <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          {tap.applicant}: {seekerInfo.name || "—"}{" "}
                          {seekerInfo.email ? `(${seekerInfo.email})` : ""}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {tap.appliedAt}:{" "}
                        {formatRelativeDate(app.createdAt, language)}
                      </span>
                    </div>
                  </div>

                  {/* Role-specific Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {app.resumeUrl && (
                      <a
                        href={getApplicationResumeViewUrl(app._id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/70 px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
                      >
                        {tap.openCv}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}

                    {user.role === "seeker" &&
                      canWithdrawApplication(app.status) && (
                        <button
                          type="button"
                          onClick={() => setWithdrawTarget(app)}
                          className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {tap.withdrawBtn}
                        </button>
                      )}

                    {isManager && (
                      <select
                        value={app.status}
                        disabled={updatingId === app._id}
                        onChange={(e) =>
                          handleStatusChange(
                            app._id,
                            e.target.value as ApplicationStatus
                          )
                        }
                        className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium"
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
                            {tap.statusLabels[st]}
                          </option>
                        ))}
                      </select>
                    )}

                    {user.role === "employer" && (
                      <button
                        type="button"
                        disabled={summarizingId === app._id}
                        onClick={() => handleSummarize(app._id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {summarizingId === app._id
                          ? tap.summarizingAi
                          : tap.summarizeAi}
                      </button>
                    )}
                  </div>
                </div>

                {/* 3-Step Visual Timeline */}
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/40 bg-background/50 p-3 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium min-w-0">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{tap.timelineSubmitted}</span>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1.5 min-w-0",
                      step >= 2
                        ? "text-blue-600 dark:text-blue-400 font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{tap.timelineViewed}</span>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1.5 min-w-0",
                      app.status === "accepted"
                        ? "text-emerald-600 dark:text-emerald-400 font-medium"
                        : app.status === "rejected"
                        ? "text-destructive font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {app.status === "accepted"
                        ? tap.timelineAccepted
                        : app.status === "rejected"
                        ? tap.timelineRejected
                        : tap.timelineDecisionPending}
                    </span>
                  </div>
                </div>

                {/* Cover Letter */}
                {fullCoverLetter && (
                  <div className="rounded-xl bg-secondary/40 p-3 text-xs sm:text-sm space-y-1.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {tap.coverLetter}
                    </div>
                    <p className="whitespace-pre-line text-foreground/90 leading-relaxed">
                      {displayedCoverLetter}
                    </p>
                    {isLongCoverLetter && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedMap((prev) => ({
                            ...prev,
                            [app._id]: !isExpanded,
                          }))
                        }
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {isExpanded ? tap.showLess : tap.showMore}
                      </button>
                    )}
                  </div>
                )}

                {/* AI Summary Box */}
                {aiSummary && (
                  <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
                      <Sparkles className="h-3.5 w-3.5" />
                      {tap.aiSummaryTitle}
                    </div>
                    <p className="whitespace-pre-line text-xs sm:text-sm leading-relaxed">
                      {aiSummary}
                    </p>
                  </div>
                )}

                {jobInfo.id && (
                  <div className="pt-1 text-xs">
                    <Link
                      href={`/jobs/${jobInfo.id}`}
                      className="interactive-link text-primary font-medium"
                    >
                      {tap.viewJob}
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(withdrawTarget)}
        title={tap.withdrawTitle}
        description={tap.withdrawDesc.replace("{title}", withdrawJobTitle)}
        variant="destructive"
        loading={withdrawing}
        onConfirm={handleConfirmWithdraw}
        onCancel={() => {
          if (!withdrawing) setWithdrawTarget(null);
        }}
      />
    </div>
  );
}
