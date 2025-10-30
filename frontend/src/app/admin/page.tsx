"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminGetUsers,
  adminUpdateUser,
  adminGetJobs,
  adminDeleteJob,
  adminGetCompanies,
  adminDeleteCompany,
  adminGetApplications,
  adminUpdateApplicationStatus,
  adminDeleteApplication,
  type AdminUser,
  type Role,
  type AdminJob,
  type AdminCompany,
  type AdminApplication,
  type AppStatus,
} from "@/lib/admin";

type TabKey = "users" | "jobs" | "companies" | "applications";

type UseAdminListResult<T> = {
  rows: T[];
  loading: boolean;
  refresh: (showLoader?: boolean) => Promise<void>;
};

function useAdminList<T>(fetcher: () => Promise<T[]>): UseAdminListResult<T> {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const refresh = useCallback(
    async (showLoader = false) => {
      if (showLoader) setLoading(true);
      try {
        const data = await fetcher();
        if (!isMounted.current) return;
        setRows(data);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    },
    [fetcher]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, loading, refresh };
}

export default function AdminPage() {
  const [tab, setTab] = useState<TabKey>("users");

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <div className="flex gap-2">
        {(["users", "jobs", "companies", "applications"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded border ${
              tab === t ? "bg-primary text-primary-foreground" : "bg-card"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "users" && <UsersTab />}
      {tab === "jobs" && <JobsTab />}
      {tab === "companies" && <CompaniesTab />}
      {tab === "applications" && <ApplicationsTab />}
    </div>
  );
}

function UsersTab() {
  const fetcher = useCallback(async () => {
    const res = await adminGetUsers({ page: 1, limit: 20 });
    return res.data;
  }, []);
  const { rows, loading, refresh } = useAdminList<AdminUser>(fetcher);

  const setRole = useCallback(
    async (id: string, role: Role) => {
      await adminUpdateUser(id, { role });
      await refresh(true);
    },
    [refresh]
  );

  const toggleActive = useCallback(
    async (user: AdminUser) => {
      await adminUpdateUser(user._id, { isActive: !user.isActive });
      await refresh(true);
    },
    [refresh]
  );

  if (loading) return <p>Loading...</p>;
  return (
    <div className="interactive-panel fade-up-soft overflow-hidden p-4">
      <table className="w-full text-sm border-separate border-spacing-y-2">
        <thead>
          <tr>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Name
            </th>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Email
            </th>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Role
            </th>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Active
            </th>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((user) => (
            <tr
              key={user._id}
              className="rounded-lg border border-border/30 bg-card/90 transition-colors duration-200 hover:bg-primary/5"
            >
              <td className="px-3 py-3 font-medium">{user.name}</td>
              <td className="px-3 py-3">{user.email}</td>
              <td className="px-3 py-3">
                <select
                  className="w-full rounded-md border border-border/40 bg-background/70 px-2 py-2 text-sm transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={user.role}
                  onChange={(event) => setRole(user._id, event.target.value as Role)}
                >
                  {(["seeker", "employer", "admin"] as const).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-3">{user.isActive ? "Yes" : "No"}</td>
              <td className="px-3 py-3 text-right">
                <button
                  className="interactive-button px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                  onClick={() => toggleActive(user)}
                >
                  {user.isActive ? "Deactivate" : "Activate"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JobsTab() {
  const fetcher = useCallback(async () => {
    const res = await adminGetJobs({ page: 1, limit: 20 });
    return res.data;
  }, []);
  const { rows, loading, refresh } = useAdminList<AdminJob>(fetcher);

  const remove = useCallback(
    async (id: string) => {
      if (!confirm("Delete this job?")) return;
      await adminDeleteJob(id);
      await refresh(true);
    },
    [refresh]
  );

  if (loading) return <p>Loading...</p>;
  return (
    <div className="interactive-panel fade-up-soft overflow-hidden p-4">
      <table className="w-full text-sm border-separate border-spacing-y-2">
        <thead>
          <tr>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Title
            </th>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Company
            </th>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Employer
            </th>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((job) => (
            <tr
              key={job._id}
              className="rounded-lg border border-border/30 bg-card/90 transition-colors duration-200 hover:bg-primary/5"
            >
              <td className="px-3 py-3 font-medium">{job.title}</td>
              <td className="px-3 py-3">{job.company?.name ?? "-"}</td>
              <td className="px-3 py-3">{job.employer?.email ?? "-"}</td>
              <td className="px-3 py-3 text-right">
                <button
                  className="interactive-button px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                  onClick={() => remove(job._id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompaniesTab() {
  const fetcher = useCallback(async () => {
    const res = await adminGetCompanies({ page: 1, limit: 20 });
    return res.data;
  }, []);
  const { rows, loading, refresh } = useAdminList<AdminCompany>(fetcher);

  const remove = useCallback(
    async (id: string) => {
      if (!confirm("Delete this company and related jobs/applications?")) return;
      await adminDeleteCompany(id);
      await refresh(true);
    },
    [refresh]
  );

  if (loading) return <p>Loading...</p>;
  return (
    <div className="interactive-panel fade-up-soft overflow-hidden p-4">
      <table className="w-full text-sm border-separate border-spacing-y-2">
        <thead>
          <tr>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Name
            </th>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Website
            </th>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Owner
            </th>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((company) => (
            <tr
              key={company._id}
              className="rounded-lg border border-border/30 bg-card/90 transition-colors duration-200 hover:bg-primary/5"
            >
              <td className="px-3 py-3 font-medium">{company.name}</td>
              <td className="px-3 py-3">{company.website ?? "-"}</td>
              <td className="px-3 py-3">{company.owner?.email ?? "-"}</td>
              <td className="px-3 py-3 text-right">
                <button
                  className="interactive-button px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                  onClick={() => remove(company._id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApplicationsTab() {
  const fetcher = useCallback(async () => {
    const res = await adminGetApplications({ page: 1, limit: 20 });
    return res.data;
  }, []);
  const { rows, loading, refresh } = useAdminList<AdminApplication>(fetcher);

  const setStatus = useCallback(
    async (id: string, status: AppStatus) => {
      await adminUpdateApplicationStatus(id, status);
      await refresh(true);
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!confirm("Delete this application?")) return;
      await adminDeleteApplication(id);
      await refresh(true);
    },
    [refresh]
  );

  if (loading) return <p>Loading...</p>;
  return (
    <div className="interactive-panel fade-up-soft overflow-hidden p-4">
      <table className="w-full text-sm border-separate border-spacing-y-2">
        <thead>
          <tr>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Job
            </th>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Company
            </th>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Seeker
            </th>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Status
            </th>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((application) => (
            <tr
              key={application._id}
              className="rounded-lg border border-border/30 bg-card/90 transition-colors duration-200 hover:bg-primary/5"
            >
              <td className="px-3 py-3 font-medium">{application.job?.title ?? "-"}</td>
              <td className="px-3 py-3">{application.job?.company?.name ?? "-"}</td>
              <td className="px-3 py-3">{application.seeker?.email ?? "-"}</td>
              <td className="px-3 py-3">
                <select
                  className="w-full rounded-md border border-border/40 bg-background/70 px-2 py-2 text-sm transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={application.status}
                  onChange={(event) =>
                    setStatus(application._id, event.target.value as AppStatus)
                  }
                >
                  {(["submitted", "viewed", "accepted", "rejected"] as const).map(
                    (status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    )
                  )}
                </select>
              </td>
              <td className="px-3 py-3 text-right">
                <button
                  className="interactive-button px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                  onClick={() => remove(application._id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
