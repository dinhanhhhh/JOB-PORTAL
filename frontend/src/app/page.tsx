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
    <div className="relative space-y-8 overflow-hidden py-6">
      <div
        className="floating-blob hidden md:block left-1/2 top-4 h-60 w-60 rounded-full bg-primary/20"
        style={{ animationDelay: "0.2s" }}
      />
      <div
        className="floating-blob hidden md:block right-[15%] top-24 h-52 w-52 rounded-full bg-accent/25"
        style={{ animationDelay: "1.2s" }}
      />

      <header className="fade-up-soft space-y-3 text-center md:text-left">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground/80">
          Find Your Next Move
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold">
          Opportunities curated for modern tech talent.
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Browse remote-friendly roles, tailored recommendations, and dynamic teams
          that are hiring right now.
        </p>
      </header>

      <div className="fade-up-soft flex flex-col gap-3 md:flex-row md:items-center">
        <div className="w-full md:flex-1">
          <CustomInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search jobs (react, node, ...)"
          />
        </div>
        <CustomButton onClick={() => loadJobs(query, true)}>
          Search
        </CustomButton>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : jobs.length === 0 ? (
        <div className="fade-up-soft rounded-2xl border border-dashed border-border/60 bg-card/70 p-10 text-center backdrop-blur">
          <p className="text-muted-foreground">
            No openings match your keywords yet. Try exploring other stacks or
            broaden your filters.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job, index) => (
            <JobCard key={job._id} job={job} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
