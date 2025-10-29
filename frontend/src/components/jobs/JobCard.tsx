"use client";

import Link from "next/link";
import type { Job } from "@/types";

export default function JobCard({ job }: { job: Job }) {
  return (
    <div className="bg-card text-card-foreground border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{job.title}</h3>
        <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">
          {job.level}
        </span>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
        {job.description}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {job.skills.slice(0, 4).map((s) => (
          <span
            key={s}
            className="text-xs bg-accent text-accent-foreground border px-2 py-0.5 rounded"
          >
            {s}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-foreground/80">{job.isRemote ? "Remote" : job.location ?? "Onsite"}</span>
        <Link
          className="text-primary hover:underline"
          href={`/jobs/${job._id}`}
        >
          View
        </Link>
      </div>
      {job.company && (
        <div className="mt-2 text-sm text-muted-foreground">{job.company.name}</div>
      )}
    </div>
  );
}
