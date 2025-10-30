"use client";

import { useEffect, useState } from "react";
import { getMyApplications } from "@/lib/applications";
import type { Application, Job } from "@/types";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const getJobTitle = (job: string | Job): string => {
  if (typeof job === "string") {
    return "Loading...";
  }
  return job.title;
};

const getJobId = (job: string | Job): string => {
  if (typeof job === "string") {
    return job;
  }
  return job._id;
};

export default function MyApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    getMyApplications()
      .then((data) => {
        if (mounted) setApps(data.applications);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My Applications</h1>
      <div className="space-y-3">
        {apps.map((a) => (
          <div
            key={a._id}
            className="interactive-panel hover-rise space-y-2 rounded-xl p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">{getJobTitle(a.job)}</div>
              <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground border border-white/10">
                {a.status}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {(a.coverLetter ?? "").slice(0, 100)}
            </div>
            <div className="pt-1 text-sm">
              <a
                href={`/jobs/${getJobId(a.job)}`}
                className="interactive-link text-primary"
              >
                View job details
              </a>
            </div>
          </div>
        ))}
        {apps.length === 0 && (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t applied to any jobs yet.
          </p>
        )}
      </div>
    </div>
  );
}

