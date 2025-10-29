"use client";

import { useEffect, useState } from "react";
import { getMyApplications } from "@/lib/applications";
import type { Application, Job } from "@/types";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

// Helper function để lấy job title an toàn
const getJobTitle = (job: string | Job): string => {
  if (typeof job === "string") {
    return "Loading..."; // Hoặc có thể fetch job details nếu cần
  }
  return job.title;
};

// Helper function để lấy job ID an toàn (nếu cần cho link)
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
      <h1 className="text-xl font-semibold">Đơn ứng tuyển của tôi</h1>
      <div className="space-y-3">
        {apps.map((a) => (
          <div key={a._id} className="bg-card text-card-foreground border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{getJobTitle(a.job)}</div>
              <span className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded">
                {a.status}
              </span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {(a.coverLetter ?? "").slice(0, 100)}
            </div>
            {/* Thêm link đến job nếu cần */}
            <div className="mt-2">
              <a
                href={`/jobs/${getJobId(a.job)}`}
                className="text-sm text-primary hover:underline"
              >
                Xem chi tiết job
              </a>
            </div>
          </div>
        ))}
        {apps.length === 0 && (
          <p className="text-sm text-muted-foreground">Chưa có đơn nào.</p>
        )}
      </div>
    </div>
  );
}

