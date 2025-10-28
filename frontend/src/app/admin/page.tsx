// frontend/src/app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
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
              tab === t ? "bg-black text-white" : "bg-white"
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
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const res = await adminGetUsers({ page: 1, limit: 20 });
    setRows(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const setRole = async (id: string, role: Role) => {
    await adminUpdateUser(id, { role });
    await fetchData();
  };
  const toggleActive = async (u: AdminUser) => {
    await adminUpdateUser(u._id, { isActive: !u.isActive });
    await fetchData();
  };

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
          {rows.map((u) => (
            <tr key={u._id} className="border-t">
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                <select
                  value={u.role}
                  onChange={(e) => setRole(u._id, e.target.value as Role)}
                >
                  {["seeker", "employer", "admin"].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
              <td>{u.isActive ? "Yes" : "No"}</td>
              <td>
                <button
                  className="px-2 py-1 border rounded"
                  onClick={() => toggleActive(u)}
                >
                  {u.isActive ? "Deactivate" : "Activate"}
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
  const [rows, setRows] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const res = await adminGetJobs({ page: 1, limit: 20 });
    setRows(res.data);
    setLoading(false);
  };
  useEffect(() => {
    fetchData();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Xóa job này và toàn bộ applications liên quan?")) return;
    await adminDeleteJob(id);
    await fetchData();
  };

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
          {rows.map((j) => (
            <tr key={j._id} className="border-t">
              <td>{j.title}</td>
              <td>{j.company?.name ?? "-"}</td>
              <td>{j.employer?.email ?? "-"}</td>
              <td>
                <button
                  className="px-2 py-1 border rounded"
                  onClick={() => remove(j._id)}
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
  const [rows, setRows] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const res = await adminGetCompanies({ page: 1, limit: 20 });
    setRows(res.data);
    setLoading(false);
  };
  useEffect(() => {
    fetchData();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Xóa công ty này và toàn bộ jobs/applications liên quan?"))
      return;
    await adminDeleteCompany(id);
    await fetchData();
  };

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
          {rows.map((c) => (
            <tr key={c._id} className="border-t">
              <td>{c.name}</td>
              <td>{c.website ?? "-"}</td>
              <td>{c.owner?.email ?? "-"}</td>
              <td>
                <button
                  className="px-2 py-1 border rounded"
                  onClick={() => remove(c._id)}
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
  const [rows, setRows] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const res = await adminGetApplications({ page: 1, limit: 20 });
    setRows(res.data);
    setLoading(false);
  };
  useEffect(() => {
    fetchData();
  }, []);

  const setStatus = async (id: string, status: AppStatus) => {
    await adminUpdateApplicationStatus(id, status);
    await fetchData();
  };
  const remove = async (id: string) => {
    if (!confirm("Xóa application này?")) return;
    await adminDeleteApplication(id);
    await fetchData();
  };

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
          {rows.map((a) => (
            <tr key={a._id} className="border-t">
              <td>{a.job?.title ?? "-"}</td>
              <td>{a.job?.company?.name ?? "-"}</td>
              <td>{a.seeker?.email ?? "-"}</td>
              <td>
                <select
                  value={a.status}
                  onChange={(e) =>
                    setStatus(a._id, e.target.value as AppStatus)
                  }
                >
                  {["submitted", "viewed", "accepted", "rejected"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button
                  className="px-2 py-1 border rounded"
                  onClick={() => remove(a._id)}
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
