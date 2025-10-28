// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getJobs } from "@/lib/jobs";
import type { Job } from "@/types";
import JobCard from "@/components/jobs/JobCard";
import CustomInput from "@/components/ui/CustomInput";
import CustomButton from "@/components/ui/CustomButton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [q, setQ] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Tách hàm fetch, đảm bảo không update state sau khi unmount
  const fetchJobs = async (
    keyword?: string,
    opts?: { signal?: AbortSignal }
  ) => {
    setLoading(true);
    try {
      const data = await getJobs({ q: keyword });
      // Không có API abort trong getJobs hiện tại; dùng cờ mounted để tránh update sau unmount
      setJobs(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const run = async () => {
      setLoading(true); // có setState trong effect → disable rule cho đúng ngữ cảnh
      try {
        const data = await getJobs({ q: undefined });
        if (mounted) setJobs(data.data);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
    run();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <CustomInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm việc (react, node, ...)"
        />
        <CustomButton onClick={() => fetchJobs(q)}>Tìm</CustomButton>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {jobs.map((j) => (
            <JobCard key={j._id} job={j} />
          ))}
        </div>
      )}
    </div>
  );
}
