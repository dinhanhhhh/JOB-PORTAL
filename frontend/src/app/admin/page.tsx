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
    <div className="border rounded p-3 overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((user) => (
            <tr key={user._id} className="border-t">
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>
                <select
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
              <td>{user.isActive ? "Yes" : "No"}</td>
              <td>
                <button
                  className="px-2 py-1 border rounded"
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
    <div className="border rounded p-3 overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Title</th>
            <th>Company</th>
            <th>Employer</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((job) => (
            <tr key={job._id} className="border-t">
              <td>{job.title}</td>
              <td>{job.company?.name ?? "-"}</td>
              <td>{job.employer?.email ?? "-"}</td>
              <td>
                <button
                  className="px-2 py-1 border rounded"
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
    <div className="border rounded p-3 overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Name</th>
            <th>Website</th>
            <th>Owner</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((company) => (
            <tr key={company._id} className="border-t">
              <td>{company.name}</td>
              <td>{company.website ?? "-"}</td>
              <td>{company.owner?.email ?? "-"}</td>
              <td>
                <button
                  className="px-2 py-1 border rounded"
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
    <div className="border rounded p-3 overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Job</th>
            <th>Company</th>
            <th>Seeker</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((application) => (
            <tr key={application._id} className="border-t">
              <td>{application.job?.title ?? "-"}</td>
              <td>{application.job?.company?.name ?? "-"}</td>
              <td>{application.seeker?.email ?? "-"}</td>
              <td>
                <select
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
              <td>
                <button
                  className="px-2 py-1 border rounded"
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
