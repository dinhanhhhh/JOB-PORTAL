"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  type KeyboardEvent,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { getJobs, type JobSortOption } from "@/lib/jobs";
import type { Job } from "@/types";
import JobCard from "@/components/jobs/JobCard";
import CustomInput from "@/components/ui/CustomInput";
import CustomButton from "@/components/ui/CustomButton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";
import {
  matchesKeyword,
  parsePageParam,
  splitHighlightSegments,
} from "@/lib/searchHighlight";
import {
  AlertCircle,
  Bookmark,
  Briefcase,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

const ALLOWED_LIMITS = ["6", "9", "12"] as const;
const ALLOWED_SORTS: readonly JobSortOption[] = [
  "newest",
  "oldest",
  "salary_desc",
  "salary_asc",
];

function SuggestionHighlight({
  text,
  keyword,
}: {
  text: string;
  keyword: string | undefined;
}) {
  const segments = splitHighlightSegments(text, keyword);
  return (
    <>
      {segments.map((segment, i) =>
        segment.highlighted ? (
          <mark
            key={i}
            className="bg-primary/20 text-primary font-bold px-0.5 rounded-sm"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        )
      )}
    </>
  );
}

interface JobsFetchState {
  key: string;
  jobs: Job[];
  total: number;
  totalPages: number;
  error: string | null;
}

function HomePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { language } = useLanguage();
  const t = translations[language].home;
  const tc = translations[language].common;
  const { savedJobs, clearSaved } = useSavedJobs();

  // Derived URL parameters
  const activeQuery = searchParams.get("q") || "";
  const activeLocation = searchParams.get("location") || "";
  const level = searchParams.get("level") || "";
  const isRemote = searchParams.get("isRemote") || "";
  const type = searchParams.get("type") || "";
  const activeSalaryMin = searchParams.get("salaryMin") || "";
  const rawSort = searchParams.get("sort") || "newest";
  const sort: JobSortOption = ALLOWED_SORTS.includes(rawSort as JobSortOption)
    ? (rawSort as JobSortOption)
    : "newest";
  const rawLimit = searchParams.get("limit") || "6";
  const limit = ALLOWED_LIMITS.includes(rawLimit as (typeof ALLOWED_LIMITS)[number])
    ? rawLimit
    : "6";
  const page = parsePageParam(searchParams.get("page"));

  // Derived draft inputs to avoid calling setState synchronously inside useEffect
  const [queryDraft, setQueryDraft] = useState({
    base: activeQuery,
    value: activeQuery,
  });
  const query = queryDraft.base === activeQuery ? queryDraft.value : activeQuery;

  const [locationDraft, setLocationDraft] = useState({
    base: activeLocation,
    value: activeLocation,
  });
  const locationInput =
    locationDraft.base === activeLocation ? locationDraft.value : activeLocation;

  const [salaryDraft, setSalaryDraft] = useState({
    base: activeSalaryMin,
    value: activeSalaryMin,
  });
  const salaryInput =
    salaryDraft.base === activeSalaryMin ? salaryDraft.value : activeSalaryMin;

  const setQueryValue = useCallback(
    (value: string) => {
      setQueryDraft({ base: activeQuery, value });
    },
    [activeQuery]
  );

  const [activeTab, setActiveTab] = useState<"all" | "saved">("all");
  const [retryTick, setRetryTick] = useState(0);

  const currentFetchKey = useMemo(
    () =>
      JSON.stringify({
        q: activeQuery.trim(),
        location: activeLocation.trim(),
        level,
        isRemote,
        type,
        salaryMin: activeSalaryMin.trim(),
        sort,
        limit,
        page,
        retryTick,
      }),
    [
      activeQuery,
      activeLocation,
      level,
      isRemote,
      type,
      activeSalaryMin,
      sort,
      limit,
      page,
      retryTick,
    ]
  );

  const [fetchState, setFetchState] = useState<JobsFetchState>({
    key: "",
    jobs: [],
    total: 0,
    totalPages: 1,
    error: null,
  });

  const loading = fetchState.key !== currentFetchKey;

  // Autocomplete suggestion states
  const [suggestions, setSuggestions] = useState<Job[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = query.trim();
  const effectiveSuggestions = trimmedQuery.length > 0 ? suggestions : [];
  const effectiveShowSuggestions = showSuggestions && trimmedQuery.length > 0;

  // Update URL search params helper
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      if (!("page" in updates)) {
        params.delete("page");
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [searchParams, router, pathname]
  );

  // Close suggestions dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Reset all filters when clicking Navbar logo or Jobs link
  useEffect(() => {
    const handleReset = () => {
      setQueryDraft({ base: "", value: "" });
      setLocationDraft({ base: "", value: "" });
      setSalaryDraft({ base: "", value: "" });
      setShowSuggestions(false);
      setActiveTab("all");
      router.push(pathname);
    };
    window.addEventListener("reset-jobs-filter", handleReset);
    return () => {
      window.removeEventListener("reset-jobs-filter", handleReset);
    };
  }, [router, pathname]);

  // Debounce location input into URL params
  useEffect(() => {
    const trimmed = locationInput.trim();
    if (trimmed === activeLocation.trim()) return;

    const timer = setTimeout(() => {
      updateParams({ location: trimmed || null });
    }, 350);

    return () => clearTimeout(timer);
  }, [locationInput, activeLocation, updateParams]);

  // Debounce salaryMin input into URL params
  useEffect(() => {
    const trimmed = salaryInput.trim();
    if (trimmed === activeSalaryMin.trim()) return;

    const timer = setTimeout(() => {
      updateParams({ salaryMin: trimmed || null });
    }, 350);

    return () => clearTimeout(timer);
  }, [salaryInput, activeSalaryMin, updateParams]);

  // Debounced search suggestions
  useEffect(() => {
    if (trimmedQuery.length === 0) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const data = await getJobs({
          q: trimmedQuery,
          page: 1,
          limit: 5,
          location: activeLocation.trim() || undefined,
          level: level || undefined,
          isRemote: isRemote || undefined,
          type: type || undefined,
          salaryMin: activeSalaryMin.trim() || undefined,
        });
        if (!cancelled) {
          setSuggestions(data.data);
          setShowSuggestions(true);
          setActiveIndex(-1);
        }
      } catch (err) {
        console.error("Fetch suggestions error:", err);
        if (!cancelled) {
          setSuggestions([]);
          setShowSuggestions(true);
        }
      } finally {
        if (!cancelled) {
          setLoadingSuggestions(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedQuery, activeLocation, level, isRemote, type, activeSalaryMin]);

  // Load paginated jobs list whenever URL query params change
  useEffect(() => {
    let cancelled = false;

    const runFetch = async () => {
      try {
        const data = await getJobs({
          q: activeQuery.trim() || undefined,
          location: activeLocation.trim() || undefined,
          page,
          limit,
          level: level || undefined,
          isRemote: isRemote || undefined,
          type: type || undefined,
          salaryMin: activeSalaryMin.trim() || undefined,
          sort,
        });
        if (cancelled) return;
        setFetchState({
          key: currentFetchKey,
          jobs: data.data,
          total: data.pagination.total ?? data.data.length,
          totalPages: Math.max(1, data.pagination.totalPages || 1),
          error: null,
        });
      } catch (err) {
        console.error("Load jobs error:", err);
        if (cancelled) return;
        setFetchState((prev) => ({
          key: currentFetchKey,
          jobs: prev.jobs,
          total: prev.total,
          totalPages: prev.totalPages,
          error: tc.error,
        }));
      }
    };

    void runFetch();

    return () => {
      cancelled = true;
    };
  }, [
    currentFetchKey,
    activeQuery,
    activeLocation,
    page,
    limit,
    level,
    isRemote,
    type,
    activeSalaryMin,
    sort,
    tc.error,
  ]);

  const handleSuggestionClick = (jobTitle: string) => {
    setQueryValue(jobTitle);
    updateParams({ q: jobTitle });
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!effectiveShowSuggestions || effectiveSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < effectiveSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : effectiveSuggestions.length - 1
      );
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < effectiveSuggestions.length) {
        e.preventDefault();
        handleSuggestionClick(effectiveSuggestions[activeIndex].title);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };

  const handleClearSearch = () => {
    setQueryDraft({ base: "", value: "" });
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIndex(-1);
    updateParams({ q: null });
  };

  const handleClearAllFilters = () => {
    setQueryDraft({ base: "", value: "" });
    setLocationDraft({ base: "", value: "" });
    setSalaryDraft({ base: "", value: "" });
    setShowSuggestions(false);
    router.push(pathname);
  };

  const getSuggestionMeta = (job: Job) => {
    const matchingSkills = job.skills
      .filter((skill) => matchesKeyword(skill, query))
      .slice(0, 3);

    if (matchingSkills.length > 0) {
      return matchingSkills.join(", ");
    }

    return (
      job.company?.name ||
      job.location ||
      (job.isRemote ? tc.remote : tc.onsite)
    );
  };

  const activeFilterChips = [
    activeQuery
      ? { key: "q", label: `"${activeQuery}"` }
      : null,
    activeLocation
      ? { key: "location", label: `${t.locationLabel}: ${activeLocation}` }
      : null,
    level ? { key: "level", label: `${tc.level}: ${level}` } : null,
    type ? { key: "type", label: type } : null,
    isRemote
      ? {
          key: "isRemote",
          label: isRemote === "true" ? tc.remoteOnly : tc.onsiteOnly,
        }
      : null,
    activeSalaryMin
      ? { key: "salaryMin", label: `≥ $${activeSalaryMin}` }
      : null,
  ].filter((chip): chip is { key: string; label: string } => chip !== null);

  return (
    <div className="relative space-y-6 overflow-x-clip py-6">
      {/* Decorative blobs isolated inside overflow-hidden wrapper so suggestions dropdown never clips */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div
          className="floating-blob hidden md:block left-1/2 top-4 h-60 w-60 rounded-full bg-primary/20"
          style={{ animationDelay: "0.2s" }}
        />
        <div
          className="floating-blob hidden md:block right-[15%] top-24 h-52 w-52 rounded-full bg-accent/25"
          style={{ animationDelay: "1.2s" }}
        />
      </div>

      <header className="fade-up-soft space-y-3 text-center md:text-left">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground/80">
          {t.subtitle}
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold">{t.title}</h1>
        <p className="text-muted-foreground max-w-2xl">{t.description}</p>
      </header>

      {/* Tabs: All Jobs vs Saved Jobs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              activeTab === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/70 text-foreground hover:bg-secondary"
            )}
          >
            <Briefcase className="h-4 w-4" />
            {t.allJobsTab}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("saved")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              activeTab === "saved"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/70 text-foreground hover:bg-secondary"
            )}
          >
            <Bookmark className="h-4 w-4" />
            {t.savedJobsTab}
            <span className="rounded-full bg-background/20 px-2 py-0.5 text-xs font-semibold">
              {savedJobs.length}
            </span>
          </button>
        </div>

        {activeTab === "all" && !loading && !fetchState.error && (
          <p className="text-sm text-muted-foreground">
            {t.resultsCount.replace("{count}", String(fetchState.total))}
          </p>
        )}
      </div>

      {activeTab === "saved" ? (
        <section className="space-y-4">
          {savedJobs.length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={clearSaved}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t.clearSaved}
              </button>
            </div>
          )}

          {savedJobs.length === 0 ? (
            <div className="fade-up-soft rounded-2xl border border-dashed border-border/60 bg-card/70 p-10 text-center backdrop-blur">
              <p className="text-muted-foreground">{t.savedEmpty}</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {savedJobs.map((job, index) => (
                <JobCard key={job._id} job={job} index={index} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Search Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateParams({ q: query.trim() || null });
              setShowSuggestions(false);
              setActiveIndex(-1);
            }}
            className="fade-up-soft flex flex-col gap-3 md:flex-row md:items-center relative z-20"
          >
            <div className="w-full md:flex-1 relative" ref={dropdownRef}>
              <div className="relative group w-full">
                <CustomInput
                  value={query}
                  onChange={(event) => setQueryValue(event.target.value)}
                  onFocus={() =>
                    query.trim().length > 0 && setShowSuggestions(true)
                  }
                  onKeyDown={handleKeyDown}
                  placeholder={t.searchPlaceholder}
                  className="pr-10 w-full"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls="job-search-suggestions"
                  aria-expanded={effectiveShowSuggestions}
                  aria-activedescendant={
                    activeIndex >= 0
                      ? `job-search-suggestion-${activeIndex}`
                      : undefined
                  }
                />
                {query && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    aria-label={tc.clearFilters}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all z-10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {effectiveShowSuggestions && (
                <div
                  id="job-search-suggestions"
                  role="listbox"
                  className="absolute top-full left-0 w-full mt-2 rounded-xl border border-border bg-card shadow-2xl overflow-hidden z-50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
                >
                  {loadingSuggestions ? (
                    <div className="flex items-center justify-center p-4 gap-2 text-sm text-muted-foreground">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span>
                        {language === "vi"
                          ? "Đang tìm gợi ý..."
                          : "Searching suggestions..."}
                      </span>
                    </div>
                  ) : effectiveSuggestions.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {language === "vi"
                        ? "Không tìm thấy gợi ý nào"
                        : "No suggestions found"}
                    </div>
                  ) : (
                    effectiveSuggestions.map((job, index) => (
                      <button
                        key={job._id}
                        id={`job-search-suggestion-${index}`}
                        type="button"
                        role="option"
                        aria-selected={activeIndex === index}
                        className={cn(
                          "w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between gap-2 group border-b border-border/40 last:border-0",
                          activeIndex === index
                            ? "bg-accent/80 text-primary"
                            : "hover:bg-accent/40"
                        )}
                        onClick={() => handleSuggestionClick(job.title)}
                        onMouseEnter={() => setActiveIndex(index)}
                      >
                        <div className="flex flex-col min-w-0">
                          <span
                            className={cn(
                              "font-medium truncate transition-colors",
                              activeIndex === index && "translate-x-1 duration-300"
                            )}
                          >
                            <SuggestionHighlight text={job.title} keyword={query} />
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate">
                            <SuggestionHighlight
                              text={getSuggestionMeta(job)}
                              keyword={query}
                            />
                          </span>
                        </div>
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 transition-colors",
                            activeIndex === index
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary"
                          )}
                        >
                          {job.level}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <CustomButton type="submit">{t.searchButton}</CustomButton>
          </form>

          {/* Filters Panel */}
          <div className="fade-up-soft p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Location Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t.locationLabel}
                </label>
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) =>
                    setLocationDraft({
                      base: activeLocation,
                      value: e.target.value,
                    })
                  }
                  placeholder={t.locationPlaceholder}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Level Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {tc.level}
                </label>
                <select
                  value={level}
                  onChange={(e) => updateParams({ level: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                >
                  <option value="">{tc.allLevels}</option>
                  <option value="entry">Entry</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead</option>
                  <option value="executive">Executive</option>
                </select>
              </div>

              {/* Job Type Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {language === "vi" ? "Loại hình" : "Job Type"}
                </label>
                <select
                  value={type}
                  onChange={(e) => updateParams({ type: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                >
                  <option value="">{tc.allTypes}</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                  <option value="freelance">Freelance</option>
                </select>
              </div>

              {/* Remote / Onsite Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {language === "vi" ? "Hình thức" : "Work Mode"}
                </label>
                <select
                  value={isRemote}
                  onChange={(e) => updateParams({ isRemote: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                >
                  <option value="">
                    {language === "vi" ? "Tất cả hình thức" : "All Modes"}
                  </option>
                  <option value="true">{tc.remoteOnly}</option>
                  <option value="false">{tc.onsiteOnly}</option>
                </select>
              </div>

              {/* Salary Min Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {tc.minSalary}
                </label>
                <input
                  type="number"
                  min={0}
                  value={salaryInput}
                  onChange={(e) =>
                    setSalaryDraft({
                      base: activeSalaryMin,
                      value: e.target.value,
                    })
                  }
                  placeholder={language === "vi" ? "Ví dụ: 1500" : "e.g. 1500"}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Sort & Page Size */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t.sortLabel}
                  </label>
                  <select
                    value={sort}
                    onChange={(e) => updateParams({ sort: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    <option value="newest">{t.sortNewest}</option>
                    <option value="oldest">{t.sortOldest}</option>
                    <option value="salary_desc">{t.sortSalaryDesc}</option>
                    <option value="salary_asc">{t.sortSalaryAsc}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t.perPageLabel}
                  </label>
                  <select
                    value={limit}
                    onChange={(e) => updateParams({ limit: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    {ALLOWED_LIMITS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Active Filter Chips & Clear Filters */}
            {activeFilterChips.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/40">
                <div className="flex flex-wrap items-center gap-2">
                  {activeFilterChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => updateParams({ [chip.key]: null })}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                    >
                      <span>{chip.label}</span>
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary"
                >
                  <X className="h-3.5 w-3.5" />
                  {tc.clearFilters}
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : fetchState.error ? (
            <div className="fade-up-soft rounded-2xl border border-destructive/20 bg-destructive/5 p-10 text-center backdrop-blur flex flex-col items-center justify-center gap-4 max-w-xl mx-auto">
              <div className="p-3 rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="h-6 w-6" />
              </div>
              <p className="text-destructive font-medium">{fetchState.error}</p>
              <CustomButton
                onClick={() => setRetryTick((prev) => prev + 1)}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                {tc.retry}
              </CustomButton>
            </div>
          ) : fetchState.jobs.length === 0 ? (
            <div className="fade-up-soft rounded-2xl border border-dashed border-border/60 bg-card/70 p-10 text-center backdrop-blur">
              <p className="text-muted-foreground">{t.noJobs}</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {fetchState.jobs.map((job, index) => (
                <JobCard
                  key={job._id}
                  job={job}
                  index={index}
                  highlightKeyword={activeQuery}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && !fetchState.error && fetchState.totalPages > 1 && (
            <div className="fade-up-soft flex items-center justify-center gap-3 pt-6 border-t border-border/30">
              <CustomButton
                variant="outline"
                disabled={page === 1}
                onClick={() =>
                  updateParams({ page: String(Math.max(1, page - 1)) })
                }
                className="text-xs py-2 px-3 gap-1"
              >
                {tc.previous}
              </CustomButton>

              <span className="text-sm text-muted-foreground font-medium">
                {tc.pageOf
                  .replace("{page}", String(page))
                  .replace("{total}", String(fetchState.totalPages))}
              </span>

              <CustomButton
                variant="outline"
                disabled={page === fetchState.totalPages}
                onClick={() =>
                  updateParams({
                    page: String(Math.min(fetchState.totalPages, page + 1)),
                  })
                }
                className="text-xs py-2 px-3 gap-1"
              >
                {tc.next}
              </CustomButton>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-48 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
