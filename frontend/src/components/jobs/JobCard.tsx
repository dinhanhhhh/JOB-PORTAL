"use client";

import Link from "next/link";
import { Bookmark, Building2, Clock, DollarSign, MapPin } from "lucide-react";
import type { Job } from "@/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { translations } from "@/lib/translations";
import {
  formatRelativeDate,
  formatSalaryRange,
  splitHighlightSegments,
} from "@/lib/searchHighlight";

type JobCardProps = {
  job: Job;
  index?: number;
  highlightKeyword?: string;
};

function HighlightedText({
  text,
  keyword,
}: {
  text: string;
  keyword: string | undefined;
}) {
  const segments = splitHighlightSegments(text, keyword);
  return (
    <>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <mark
            key={index}
            className="bg-primary/20 text-primary font-semibold px-0.5 rounded-sm"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </>
  );
}

export default function JobCard({
  job,
  index = 0,
  highlightKeyword,
}: JobCardProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSaved, toggleSave } = useSavedJobs();

  const t = translations[language].common;
  const th = translations[language].home;
  const saved = isSaved(job._id);

  const handleViewClick = () => {
    if (!user) {
      window.dispatchEvent(new CustomEvent("show-cta-banner"));
    }
  };

  const handleBookmarkClick = () => {
    const nowSaved = toggleSave(job);
    toast.info(nowSaved ? th.savedAdded : th.savedRemoved);
  };

  const visibleSkills = job.skills.slice(0, 4);
  const remainingSkills = Math.max(0, job.skills.length - visibleSkills.length);
  const postedLabel = formatRelativeDate(job.createdAt, language);

  return (
    <div
      className={cn(
        "interactive-card hover-rise fade-up-soft p-4 text-card-foreground shadow-sm flex flex-col justify-between gap-3"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base sm:text-lg leading-snug line-clamp-2">
            <HighlightedText text={job.title} keyword={highlightKeyword} />
          </h3>
          <button
            type="button"
            onClick={handleBookmarkClick}
            aria-pressed={saved}
            aria-label={saved ? th.unsaveJob : th.saveJob}
            title={saved ? th.unsaveJob : th.saveJob}
            className={cn(
              "p-1.5 rounded-lg border transition-colors shrink-0",
              saved
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/60 bg-background/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium uppercase">
            {job.level}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-medium uppercase">
            {job.type}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
            <DollarSign className="h-3 w-3" />
            {formatSalaryRange(job.salaryMin, job.salaryMax, language)}
          </span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          <HighlightedText text={job.description} keyword={highlightKeyword} />
        </p>

        <div className="flex flex-wrap gap-1.5">
          {visibleSkills.map((skill) => (
            <span
              key={skill}
              className="text-xs px-2 py-0.5 rounded-full border border-accent/40 bg-accent/20 text-accent-foreground/90 transition-colors duration-200 hover:bg-accent/40"
            >
              <HighlightedText text={skill} keyword={highlightKeyword} />
            </span>
          ))}
          {remainingSkills > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              +{remainingSkills}
            </span>
          )}
        </div>
      </div>

      <div className="pt-2.5 border-t border-border/40 space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 min-w-0 truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {job.isRemote ? t.remote : job.location ?? t.onsite}
            </span>
          </span>
          {postedLabel && (
            <span className="inline-flex items-center gap-1 shrink-0">
              <Clock className="h-3.5 w-3.5" />
              {postedLabel}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 truncate">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{job.company?.name || "—"}</span>
          </span>
          <Link
            className="interactive-link text-sm font-medium text-primary shrink-0"
            href={`/jobs/${job._id}`}
            onClick={handleViewClick}
          >
            {t.view}
          </Link>
        </div>
      </div>
    </div>
  );
}
