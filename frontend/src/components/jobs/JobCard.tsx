"use client";

import Link from "next/link";
import type { Job } from "@/types";
import { cn } from "@/lib/utils";

type JobCardProps = {
  job: Job;
  index?: number;
};

export default function JobCard({ job, index = 0 }: JobCardProps) {
  return (
    <div
      className={cn(
        "interactive-card hover-rise fade-up-soft p-4 text-card-foreground shadow-sm"
      )}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-lg leading-tight">{job.title}</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground border border-white/10">
          {job.level}
        </span>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
        {job.description}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {job.skills.slice(0, 4).map((skill) => (
          <span
            key={skill}
            className="text-xs px-2 py-0.5 rounded-full border border-accent/40 bg-accent/20 text-accent-foreground/90 transition-colors duration-200 hover:bg-accent/40"
          >
            {skill}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-foreground/75">
          {job.isRemote ? "Remote" : job.location ?? "Onsite"}
        </span>
        <Link
          className="interactive-link text-sm text-primary"
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
