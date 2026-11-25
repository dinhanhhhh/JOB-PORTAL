"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Job } from "@/types";
import { useAuth } from "@/components/providers/AuthProvider";
import { getSavedJobsStorageKey } from "@/lib/api";

const CHANGE_EVENT = "saved-jobs-changed";
const EMPTY_JOBS: Job[] = [];

type SnapshotCacheEntry = {
  raw: string | null;
  jobs: Job[];
};

const snapshotCache = new Map<string, SnapshotCacheEntry>();

function readSavedJobs(storageKey: string): Job[] {
  if (typeof window === "undefined") {
    return EMPTY_JOBS;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    const cached = snapshotCache.get(storageKey);
    if (cached && cached.raw === raw) {
      return cached.jobs;
    }

    if (!raw) {
      snapshotCache.set(storageKey, { raw: null, jobs: EMPTY_JOBS });
      return EMPTY_JOBS;
    }

    const parsed: unknown = JSON.parse(raw);
    const jobs = Array.isArray(parsed)
      ? parsed.filter(
          (item): item is Job =>
            Boolean(item && typeof item === "object" && "_id" in item)
        )
      : EMPTY_JOBS;

    snapshotCache.set(storageKey, { raw, jobs });
    return jobs;
  } catch {
    snapshotCache.set(storageKey, { raw: null, jobs: EMPTY_JOBS });
    return EMPTY_JOBS;
  }
}

function getServerSnapshot(): Job[] {
  return EMPTY_JOBS;
}

function writeSavedJobs(storageKey: string, nextJobs: Job[]): void {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(nextJobs);
    window.localStorage.setItem(storageKey, raw);
    snapshotCache.set(storageKey, { raw, jobs: nextJobs });
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch (err) {
    console.error("Failed to persist saved jobs:", err);
  }
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => onStoreChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener(CHANGE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(CHANGE_EVENT, handleChange);
  };
}

export function useSavedJobs() {
  const { user } = useAuth();
  const storageKey = getSavedJobsStorageKey(user?._id);

  const getSnapshot = useCallback(
    () => readSavedJobs(storageKey),
    [storageKey]
  );

  const savedJobs = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const isSaved = useCallback(
    (jobId: string): boolean => savedJobs.some((item) => item._id === jobId),
    [savedJobs]
  );

  const toggleSave = useCallback(
    (job: Job): boolean => {
      const current = readSavedJobs(storageKey);
      const exists = current.some((item) => item._id === job._id);
      if (exists) {
        writeSavedJobs(
          storageKey,
          current.filter((item) => item._id !== job._id)
        );
        return false;
      }
      writeSavedJobs(storageKey, [job, ...current]);
      return true;
    },
    [storageKey]
  );

  const removeSaved = useCallback(
    (jobId: string): void => {
      const current = readSavedJobs(storageKey);
      writeSavedJobs(
        storageKey,
        current.filter((item) => item._id !== jobId)
      );
    },
    [storageKey]
  );

  const clearSaved = useCallback((): void => {
    writeSavedJobs(storageKey, EMPTY_JOBS);
  }, [storageKey]);

  return {
    savedJobs,
    isSaved,
    toggleSave,
    removeSaved,
    clearSaved,
  };
}
