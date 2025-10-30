"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getJobs } from "@/lib/jobs";
import type { Job } from "@/types";
import JobCard from "@/components/jobs/JobCard";
import CustomInput from "@/components/ui/CustomInput";
import CustomButton from "@/components/ui/CustomButton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadJobs = useCallback(
    async (keyword?: string, showLoader = false) => {
      if (showLoader) setLoading(true);
      try {
        const trimmed = keyword?.trim() || undefined;
        const data = await getJobs({ q: trimmed });
        if (!isMounted.current) return;
        setJobs(data.data);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <CustomInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search jobs (react, node, ...)"
        />
        <CustomButton onClick={() => loadJobs(query, true)}>Search</CustomButton>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
