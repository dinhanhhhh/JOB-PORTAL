"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BarChart3,
  Briefcase,
  Building2,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import {
  adminDeleteApplication,
  adminDeleteCompany,
  adminDeleteJob,
  adminGetApplications,
  adminGetCompanies,
  adminGetJobs,
  adminGetStats,
  adminGetUsers,
  adminUpdateApplicationStatus,
  adminUpdateUser,
  type AdminApplication,
  type AdminCompany,
  type AdminJob,
  type AdminStatsRes,
  type AdminUser,
  type AppStatus,
  type Pagination,
  type Role,
} from "@/lib/admin";
import { getDisplayErrorMessage } from "@/lib/api";
import { formatRelativeDate } from "@/lib/searchHighlight";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { translations } from "@/lib/translations";
import CustomButton from "@/components/ui/CustomButton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TabKey = "overview" | "users" | "jobs" | "companies" | "applications";

interface PaginatedState<T> {
  key: string;
  rows: T[];
  pagination: Pagination;
  error: string | null;
}

const DEFAULT_PAGINATION: Pagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

function useAdminPaginatedList<T>(
  fetchKey: string,
  fetcher: () => Promise<{ data: T[]; pagination: Pagination }>,
  fallbackError: string
) {
  const [state, setState] = useState<PaginatedState<T>>({
    key: "",
    rows: [],
    pagination: DEFAULT_PAGINATION,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    fetcher()
      .then((res) => {
        if (cancelled) return;
        setState({
          key: fetchKey,
          rows: res.data,
          pagination: res.pagination,
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          key: fetchKey,
          rows: [],
          pagination: DEFAULT_PAGINATION,
          error: getDisplayErrorMessage(err, fallbackError),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [fetchKey, fetcher, fallbackError]);

  const loading = state.key !== fetchKey;
  return {
    rows: state.key === fetchKey ? state.rows : [],
    pagination:
      state.key === fetchKey ? state.pagination : DEFAULT_PAGINATION,
    error: state.key === fetchKey ? state.error : null,
    loading,
  };
}

function PaginationBar({
  page,
  totalPages,
  onPageChange,
  prevLabel,
  nextLabel,
  pageOfLabel,
}: {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
  prevLabel: string;
  nextLabel: string;
  pageOfLabel: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 pt-4 border-t border-border/40">
      <CustomButton
        variant="outline"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        className="text-xs py-1.5 px-3"
      >
        {prevLabel}
      </CustomButton>
      <span className="text-xs sm:text-sm text-muted-foreground font-medium">
        {pageOfLabel
          .replace("{page}", String(page))
          .replace("{total}", String(totalPages))}
      </span>
      <CustomButton
        variant="outline"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        className="text-xs py-1.5 px-3"
      >
        {nextLabel}
      </CustomButton>
    </div>
  );
}

function HorizontalBar({
  label,
  count,
  total,
  barColor,
}: {
  label: string;
  count: number;
  total: number;
  barColor: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium capitalize">{label}</span>
        <span className="text-muted-foreground">
          {count} ({pct}%)
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();

  const tad = translations[language].admin;
  const tc = translations[language].common;
  const ta = translations[language].auth;

  if (authLoading) {
    return (
      <div className="max-w-5xl mx-auto py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto interactive-panel p-8 text-center space-y-4">
        <p className="text-muted-foreground">{tad.loginRequired}</p>
        <Link
          href="/login?redirect=/admin"
          className="interactive-button inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium"
        >
          {ta.loginButton}
        </Link>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="max-w-lg mx-auto interactive-panel p-8 text-center space-y-4">
        <p className="text-muted-foreground">{tad.forbidden}</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
        >
          {tc.backHome}
        </Link>
      </div>
    );
  }

  return <AdminDashboardContent currentAdminId={user._id} />;
}

function AdminDashboardContent({
  currentAdminId,
}: {
  currentAdminId: string;
}) {
  const { language } = useLanguage();
  const tad = translations[language].admin;
  const [tab, setTab] = useState<TabKey>("overview");

  const tabItems: Array<{
    key: TabKey;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      key: "overview",
      label: tad.tabs.overview,
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      key: "users",
      label: tad.tabs.users,
      icon: <Users className="h-4 w-4" />,
    },
    {
      key: "jobs",
      label: tad.tabs.jobs,
      icon: <Briefcase className="h-4 w-4" />,
    },
    {
      key: "companies",
      label: tad.tabs.companies,
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      key: "applications",
      label: tad.tabs.applications,
      icon: <FileText className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6 py-4">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {tad.title}
        </h1>
        <p className="text-sm text-muted-foreground">{tad.subtitle}</p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-border/50 pb-3">
        {tabItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              tab === item.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/70 text-foreground hover:bg-secondary"
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "users" && <UsersTab currentAdminId={currentAdminId} />}
      {tab === "jobs" && <JobsTab />}
      {tab === "companies" && <CompaniesTab />}
      {tab === "applications" && <ApplicationsTab />}
    </div>
  );
}

function OverviewTab() {
  const { language } = useLanguage();
  const tad = translations[language].admin;
  const tc = translations[language].common;
  const tap = translations[language].applications;

  const [reloadTick, setReloadTick] = useState(0);
  const fetchKey = `overview:${reloadTick}`;
  const [state, setState] = useState<{
    key: string;
    data: AdminStatsRes | null;
    error: string | null;
  }>({ key: "", data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    adminGetStats()
      .then((res) => {
        if (cancelled) return;
        setState({ key: fetchKey, data: res, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          key: fetchKey,
          data: null,
          error: getDisplayErrorMessage(err, tc.error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [fetchKey, tc.error]);

  if (state.key !== fetchKey) {
    return <LoadingSpinner />;
  }

  if (state.error || !state.data) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center space-y-3">
        <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
        <p className="text-sm text-destructive">{state.error ?? tc.error}</p>
        <CustomButton
          variant="outline"
          onClick={() => setReloadTick((p) => p + 1)}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {tc.retry}
        </CustomButton>
      </div>
    );
  }

  const { stats, recentActivities } = state.data;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="interactive-panel p-5 space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {tad.totalUsers}
          </span>
          <span className="text-3xl font-bold">{stats.totalUsers}</span>
        </Card>
        <Card className="interactive-panel p-5 space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {tad.totalJobs}
          </span>
          <span className="text-3xl font-bold">{stats.totalJobs}</span>
        </Card>
        <Card className="interactive-panel p-5 space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {tad.activeJobs}
          </span>
          <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.activeJobs}
          </span>
        </Card>
        <Card className="interactive-panel p-5 space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {tad.totalApplications}
          </span>
          <span className="text-3xl font-bold text-primary">
            {stats.totalApplications}
          </span>
        </Card>
      </div>

      {/* Distribution Bars */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="interactive-panel p-5 space-y-4">
          <h2 className="text-sm font-semibold">{tad.usersByRole}</h2>
          <div className="space-y-3">
            <HorizontalBar
              label="Seeker"
              count={stats.usersByRole.seeker}
              total={stats.totalUsers}
              barColor="bg-primary"
            />
            <HorizontalBar
              label="Employer"
              count={stats.usersByRole.employer}
              total={stats.totalUsers}
              barColor="bg-blue-500"
            />
            <HorizontalBar
              label="Admin"
              count={stats.usersByRole.admin}
              total={stats.totalUsers}
              barColor="bg-amber-500"
            />
          </div>
        </div>

        <div className="interactive-panel p-5 space-y-4">
          <h2 className="text-sm font-semibold">{tad.applicationsByStatus}</h2>
          <div className="space-y-3">
            <HorizontalBar
              label={tap.statusLabels.submitted}
              count={stats.applicationsByStatus.submitted}
              total={stats.totalApplications}
              barColor="bg-slate-500"
            />
            <HorizontalBar
              label={tap.statusLabels.viewed}
              count={stats.applicationsByStatus.viewed}
              total={stats.totalApplications}
              barColor="bg-blue-500"
            />
            <HorizontalBar
              label={tap.statusLabels.accepted}
              count={stats.applicationsByStatus.accepted}
              total={stats.totalApplications}
              barColor="bg-emerald-500"
            />
            <HorizontalBar
              label={tap.statusLabels.rejected}
              count={stats.applicationsByStatus.rejected}
              total={stats.totalApplications}
              barColor="bg-destructive"
            />
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="interactive-panel p-5 space-y-3">
          <h2 className="text-sm font-semibold">{tad.recentJobs}</h2>
          {recentActivities.recentJobs.length === 0 ? (
            <p className="text-xs text-muted-foreground">{tad.noData}</p>
          ) : (
            <ul className="divide-y divide-border/40 text-sm">
              {recentActivities.recentJobs.map((job) => (
                <li
                  key={job._id}
                  className="py-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/jobs/${job._id}`}
                      className="font-medium hover:text-primary transition-colors block truncate"
                    >
                      {job.title}
                    </Link>
                    <span className="text-xs text-muted-foreground truncate block">
                      {job.company?.name ?? "-"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatRelativeDate(job.createdAt, language)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="interactive-panel p-5 space-y-3">
          <h2 className="text-sm font-semibold">{tad.recentApplications}</h2>
          {recentActivities.recentApplications.length === 0 ? (
            <p className="text-xs text-muted-foreground">{tad.noData}</p>
          ) : (
            <ul className="divide-y divide-border/40 text-sm">
              {recentActivities.recentApplications.map((app) => (
                <li
                  key={app._id}
                  className="py-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="font-medium block truncate">
                      {app.job?.title ?? "-"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate block">
                      {app.seeker?.email ?? "-"}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary uppercase font-medium shrink-0">
                    {app.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function UsersTab({ currentAdminId }: { currentAdminId: string }) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const tad = translations[language].admin;
  const tc = translations[language].common;

  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<"" | Role>("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reloadTick, setReloadTick] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchKey = `users:${page}:${roleFilter}:${debouncedSearch}:${reloadTick}`;
  const fetcher = useCallback(
    () =>
      adminGetUsers({
        page,
        limit: 10,
        role: roleFilter || undefined,
        search: debouncedSearch || undefined,
      }),
    [page, roleFilter, debouncedSearch]
  );

  const { rows, pagination, error, loading } = useAdminPaginatedList<AdminUser>(
    fetchKey,
    fetcher,
    tc.error
  );

  const handleSetRole = async (id: string, role: Role) => {
    setBusyId(id);
    try {
      await adminUpdateUser(id, { role });
      toast.success(tad.userUpdated);
      setReloadTick((p) => p + 1);
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    setBusyId(user._id);
    try {
      await adminUpdateUser(user._id, { isActive: !user.isActive });
      toast.success(tad.userUpdated);
      setReloadTick((p) => p + 1);
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={tad.searchUsers}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value as "" | Role);
            setPage(1);
          }}
          className="px-3 py-2 text-sm rounded-lg border border-border bg-background"
        >
          <option value="">{tad.allRoles}</option>
          <option value="seeker">seeker</option>
          <option value="employer">employer</option>
          <option value="admin">admin</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <CustomButton
            variant="outline"
            onClick={() => setReloadTick((p) => p + 1)}
          >
            {tc.retry}
          </CustomButton>
        </div>
      ) : rows.length === 0 ? (
        <div className="interactive-panel p-8 text-center text-sm text-muted-foreground">
          {tad.noData}
        </div>
      ) : (
        <div className="interactive-panel fade-up-soft p-4 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
                    {tad.name}
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
                    {tad.email}
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
                    {tad.role}
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
                    {tad.status}
                  </th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
                    {tad.actions}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => {
                  const isSelf = user._id === currentAdminId;
                  return (
                    <tr
                      key={user._id}
                      className="rounded-lg border border-border/30 bg-card/90 transition-colors hover:bg-primary/5"
                    >
                      <td className="px-3 py-3 font-medium">
                        <span>{user.name}</span>
                        {isSelf && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold uppercase">
                            {tad.youBadge}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">{user.email}</td>
                      <td className="px-3 py-3">
                        <select
                          disabled={isSelf || busyId === user._id}
                          className="rounded-md border border-border/40 bg-background/70 px-2 py-1.5 text-sm disabled:opacity-50"
                          value={user.role}
                          onChange={(e) =>
                            handleSetRole(user._id, e.target.value as Role)
                          }
                        >
                          {(["seeker", "employer", "admin"] as const).map(
                            (role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            )
                          )}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            user.isActive
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-destructive/15 text-destructive"
                          )}
                        >
                          {user.isActive ? tad.active : tad.inactive}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          disabled={isSelf || busyId === user._id}
                          onClick={() => handleToggleActive(user)}
                          className="interactive-button rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wide disabled:opacity-40 disabled:pointer-events-none"
                        >
                          {user.isActive ? tad.deactivate : tad.activate}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <PaginationBar
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            prevLabel={tc.previous}
            nextLabel={tc.next}
            pageOfLabel={tc.pageOf}
          />
        </div>
      )}
    </div>
  );
}

function JobsTab() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const tad = translations[language].admin;
  const tc = translations[language].common;

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">(
    ""
  );
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reloadTick, setReloadTick] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<AdminJob | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchKey = `jobs:${page}:${statusFilter}:${debouncedSearch}:${reloadTick}`;
  const fetcher = useCallback(
    () =>
      adminGetJobs({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
      }),
    [page, statusFilter, debouncedSearch]
  );

  const { rows, pagination, error, loading } = useAdminPaginatedList<AdminJob>(
    fetchKey,
    fetcher,
    tc.error
  );

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminDeleteJob(deleteTarget._id);
      setDeleteTarget(null);
      toast.success(tad.jobDeleted);
      setReloadTick((p) => p + 1);
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={tad.searchJobs}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "" | "active" | "inactive");
            setPage(1);
          }}
          className="px-3 py-2 text-sm rounded-lg border border-border bg-background"
        >
          <option value="">{tad.allStatuses}</option>
          <option value="active">{tad.active}</option>
          <option value="inactive">{tad.inactive}</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <CustomButton
            variant="outline"
            onClick={() => setReloadTick((p) => p + 1)}
          >
            {tc.retry}
          </CustomButton>
        </div>
      ) : rows.length === 0 ? (
        <div className="interactive-panel p-8 text-center text-sm text-muted-foreground">
          {tad.noData}
        </div>
      ) : (
        <div className="interactive-panel fade-up-soft p-4 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
                    {tad.titleCol}
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
                    {tad.companyCol}
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
                    {tad.employerCol}
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
                    {tad.status}
                  </th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
                    {tad.actions}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((job) => (
                  <tr
                    key={job._id}
                    className="rounded-lg border border-border/30 bg-card/90 transition-colors hover:bg-primary/5"
                  >
                    <td className="px-3 py-3 font-medium">
                      <Link
                        href={`/jobs/${job._id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {job.title}
                      </Link>
                    </td>
                    <td className="px-3 py-3">{job.company?.name ?? "-"}</td>
                    <td className="px-3 py-3">{job.employer?.email ?? "-"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          job.isActive
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {job.isActive ? tad.active : tad.inactive}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(job)}
                        className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {tad.delete}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationBar
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            prevLabel={tc.previous}
            nextLabel={tc.next}
            pageOfLabel={tc.pageOf}
          />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={tad.deleteJobTitle}
        description={tad.deleteJobDesc.replace(
          "{title}",
          deleteTarget?.title ?? ""
        )}
        variant="destructive"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function CompaniesTab() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const tad = translations[language].admin;
  const tc = translations[language].common;

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reloadTick, setReloadTick] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<AdminCompany | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchKey = `companies:${page}:${debouncedSearch}:${reloadTick}`;
  const fetcher = useCallback(
    () =>
      adminGetCompanies({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
      }),
    [page, debouncedSearch]
  );

  const { rows, pagination, error, loading } =
    useAdminPaginatedList<AdminCompany>(fetchKey, fetcher, tc.error);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminDeleteCompany(deleteTarget._id);
      setDeleteTarget(null);
      toast.success(tad.companyDeleted);
      setReloadTick((p) => p + 1);
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={tad.searchCompanies}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <CustomButton
            variant="outline"
            onClick={() => setReloadTick((p) => p + 1)}
          >
            {tc.retry}
          </CustomButton>
        </div>
      ) : rows.length === 0 ? (
        <div className="interactive-panel p-8 text-center text-sm text-muted-foreground">
          {tad.noData}
        </div>
      ) : (
        <div className="interactive-panel fade-up-soft p-4 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
                    {tad.name}
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
                    {tad.websiteCol}
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
                    {tad.ownerCol}
                  </th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
                    {tad.actions}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((company) => (
                  <tr
                    key={company._id}
                    className="rounded-lg border border-border/30 bg-card/90 transition-colors hover:bg-primary/5"
                  >
                    <td className="px-3 py-3 font-medium">{company.name}</td>
                    <td className="px-3 py-3">
                      {company.website ? (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <span className="max-w-[200px] truncate">
                            {company.website}
                          </span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-3">{company.owner?.email ?? "-"}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(company)}
                        className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {tad.delete}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationBar
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            prevLabel={tc.previous}
            nextLabel={tc.next}
            pageOfLabel={tc.pageOf}
          />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={tad.deleteCompanyTitle}
        description={tad.deleteCompanyDesc.replace(
          "{name}",
          deleteTarget?.name ?? ""
        )}
        variant="destructive"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function ApplicationsTab() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const tad = translations[language].admin;
  const tap = translations[language].applications;
  const tc = translations[language].common;

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"" | AppStatus>("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reloadTick, setReloadTick] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminApplication | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchKey = `applications:${page}:${statusFilter}:${debouncedSearch}:${reloadTick}`;
  const fetcher = useCallback(
    () =>
      adminGetApplications({
        page,
        limit: 10,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
      }),
    [page, statusFilter, debouncedSearch]
  );

  const { rows, pagination, error, loading } =
    useAdminPaginatedList<AdminApplication>(fetchKey, fetcher, tc.error);

  const handleSetStatus = async (id: string, status: AppStatus) => {
    setBusyId(id);
    try {
      await adminUpdateApplicationStatus(id, status);
      toast.success(tad.appUpdated);
      setReloadTick((p) => p + 1);
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminDeleteApplication(deleteTarget._id);
      setDeleteTarget(null);
      toast.success(tad.appDeleted);
      setReloadTick((p) => p + 1);
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={tad.searchApplications}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "" | AppStatus);
            setPage(1);
          }}
          className="px-3 py-2 text-sm rounded-lg border border-border bg-background"
        >
          <option value="">{tad.allStatuses}</option>
          {(["submitted", "viewed", "accepted", "rejected"] as const).map(
            (st) => (
              <option key={st} value={st}>
                {tap.statusLabels[st]}
              </option>
            )
          )}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <CustomButton
            variant="outline"
            onClick={() => setReloadTick((p) => p + 1)}
          >
            {tc.retry}
          </CustomButton>
        </div>
      ) : rows.length === 0 ? (
        <div className="interactive-panel p-8 text-center text-sm text-muted-foreground">
          {tad.noData}
        </div>
      ) : (
        <div className="interactive-panel fade-up-soft p-4 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
                    {tad.jobCol}
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
                    {tad.companyCol}
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
                    {tad.seekerCol}
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
                    {tad.status}
                  </th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
                    {tad.actions}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((application) => (
                  <tr
                    key={application._id}
                    className="rounded-lg border border-border/30 bg-card/90 transition-colors hover:bg-primary/5"
                  >
                    <td className="px-3 py-3 font-medium">
                      {application.job?.title ?? "-"}
                    </td>
                    <td className="px-3 py-3">
                      {application.job?.company?.name ?? "-"}
                    </td>
                    <td className="px-3 py-3">
                      {application.seeker?.email ?? "-"}
                    </td>
                    <td className="px-3 py-3">
                      <select
                        disabled={busyId === application._id}
                        className="rounded-md border border-border/40 bg-background/70 px-2 py-1.5 text-sm disabled:opacity-50"
                        value={application.status}
                        onChange={(e) =>
                          handleSetStatus(
                            application._id,
                            e.target.value as AppStatus
                          )
                        }
                      >
                        {(
                          [
                            "submitted",
                            "viewed",
                            "accepted",
                            "rejected",
                          ] as const
                        ).map((status) => (
                          <option key={status} value={status}>
                            {tap.statusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(application)}
                        className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {tad.delete}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationBar
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            prevLabel={tc.previous}
            nextLabel={tc.next}
            pageOfLabel={tc.pageOf}
          />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={tad.deleteAppTitle}
        description={tad.deleteAppDesc}
        variant="destructive"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
