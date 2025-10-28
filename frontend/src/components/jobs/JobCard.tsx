"use client";

import Link from "next/link";
import type { Job } from "@/types";

export default function JobCard({ job }: { job: Job }) {
  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{job.title}</h3>
        <span className="text-xs px-2 py-1 rounded bg-gray-100">
          {job.level}
        </span>
      </div>
      <p className="text-sm text-gray-600 line-clamp-2 mt-1">
        {job.description}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {job.skills.slice(0, 4).map((s) => (
          <span
            key={s}
            className="text-xs bg-blue-50 border border-blue-200 px-2 py-0.5 rounded"
          >
            {s}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span>{job.isRemote ? "Remote" : job.location ?? "Onsite"}</span>
        <Link
          className="text-blue-600 hover:underline"
          href={`/jobs/${job._id}`}
        >
          View
        </Link>
      </div>
      {job.company && (
        <div className="mt-2 text-sm text-gray-500">{job.company.name}</div>
      )}
    </div>
  );
}
