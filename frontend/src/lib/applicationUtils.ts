export type AppStatusKey = "submitted" | "viewed" | "accepted" | "rejected";

export function safeGetJobInfo(job: unknown): {
  id: string | null;
  title: string | null;
  companyName: string | null;
} {
  if (!job) {
    return { id: null, title: null, companyName: null };
  }

  if (typeof job === "string") {
    return { id: job, title: null, companyName: null };
  }

  if (typeof job === "object") {
    const obj = job as Record<string, unknown>;
    const id = typeof obj._id === "string" ? obj._id : null;
    const title = typeof obj.title === "string" ? obj.title : null;
    let companyName: string | null = null;

    if (obj.company && typeof obj.company === "object") {
      const comp = obj.company as Record<string, unknown>;
      if (typeof comp.name === "string") {
        companyName = comp.name;
      }
    }

    return { id, title, companyName };
  }

  return { id: null, title: null, companyName: null };
}

export function safeGetSeekerInfo(seeker: unknown): {
  name: string | null;
  email: string | null;
} {
  if (!seeker || typeof seeker === "string") {
    return { name: null, email: null };
  }

  if (typeof seeker === "object") {
    const obj = seeker as Record<string, unknown>;
    return {
      name: typeof obj.name === "string" ? obj.name : null,
      email: typeof obj.email === "string" ? obj.email : null,
    };
  }

  return { name: null, email: null };
}

export function canWithdrawApplication(status: AppStatusKey): boolean {
  return status === "submitted" || status === "viewed";
}

export function countApplicationsByStatus(
  apps: ReadonlyArray<{ status: AppStatusKey }>
): Record<"all" | AppStatusKey, number> {
  const counts: Record<"all" | AppStatusKey, number> = {
    all: apps.length,
    submitted: 0,
    viewed: 0,
    accepted: 0,
    rejected: 0,
  };

  for (const app of apps) {
    if (app.status in counts) {
      counts[app.status] += 1;
    }
  }

  return counts;
}

export function getApplicationTimelineStep(status: AppStatusKey): 1 | 2 | 3 {
  if (status === "submitted") return 1;
  if (status === "viewed") return 2;
  return 3;
}
