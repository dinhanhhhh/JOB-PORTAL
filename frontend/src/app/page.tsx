"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getJobs } from "@/lib/jobs";
import type { Job } from "@/types";
import JobCard from "@/components/jobs/JobCard";
import CustomInput from "@/components/ui/CustomInput";
import CustomButton from "@/components/ui/CustomButton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { AlertCircle, RefreshCw, X } from "lucide-react";

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState<string>("");
  const [activeQuery, setActiveQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [suggestions, setSuggestions] = useState<Job[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter states
  const [level, setLevel] = useState<string>("");
  const [isRemote, setIsRemote] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [salaryMin, setSalaryMin] = useState<string>("");

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const { language } = useLanguage();
  const t = translations[language].home;
  const tc = translations[language].common;
  
  useEffect(() => {
    isMounted.current = true;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      isMounted.current = false;
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Use debounce for suggestions
  useEffect(() => {
    if (query.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      const data = await getJobs({ q: query.trim() });
      if (isMounted.current) {
        setSuggestions(data.data.slice(0, 5)); // Show top 5
        setShowSuggestions(true);
        setActiveIndex(-1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const loadJobs = useCallback(
    async (currentQuery = activeQuery, currentPage = page, showLoader = false) => {
      if (showLoader) setLoading(true);
      setError(null);
      setShowSuggestions(false);
      setActiveIndex(-1);
      try {
        const trimmed = currentQuery?.trim() || undefined;
        const data = await getJobs({
          q: trimmed,
          page: currentPage,
          limit: 3,
          level: level || undefined,
          isRemote: isRemote || undefined,
          type: type || undefined,
          salaryMin: salaryMin || undefined,
        });
        if (!isMounted.current) return;
        setJobs(data.data);
        setTotalPages(data.pagination.totalPages || 1);
      } catch (err) {
        console.error("Load jobs error:", err);
        if (isMounted.current) {
          setError(tc.error);
        }
      } finally {
        if (isMounted.current) setLoading(false);
      }
    },
    [level, isRemote, type, salaryMin, activeQuery, page, tc.error]
  );

  useEffect(() => {
    void loadJobs(activeQuery, page, true);
  }, [loadJobs, activeQuery, page]);

  const handleSuggestionClick = (jobTitle: string) => {
    setQuery(jobTitle);
    setActiveQuery(jobTitle);
    setShowSuggestions(false);
    setActiveIndex(-1);
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        handleSuggestionClick(suggestions[activeIndex].title);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };

  const handleClear = () => {
    setQuery("");
    setActiveQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIndex(-1);
    setPage(1);
  };

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
          {t.subtitle}
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold">
          {t.title}
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          {t.description}
        </p>
      </header>

      {/* Search Form */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          if (activeIndex === -1) {
            setActiveQuery(query);
            setPage(1);
          }
        }}
        className="fade-up-soft flex flex-col gap-3 md:flex-row md:items-center relative z-20"
      >
        <div className="w-full md:flex-1 relative" ref={dropdownRef}>
          <div className="relative group w-full">
            <CustomInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => query.trim().length > 0 && setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder={t.searchPlaceholder}
              className="pr-10 w-full"
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all z-10"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-2 rounded-xl border border-border bg-card shadow-2xl overflow-hidden z-50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
              {suggestions.map((job, index) => (
                <button
                  key={job._id}
                  type="button"
                  className={cn(
                    "w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between group border-b border-border/40 last:border-0",
                    activeIndex === index ? "bg-accent/80 text-primary" : "hover:bg-accent/40"
                  )}
                  onClick={() => handleSuggestionClick(job.title)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div className="flex flex-col">
                    <span className={cn("font-medium transition-colors", activeIndex === index && "translate-x-1 duration-300")}>
                      {job.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{job.company?.name || job.location}</span>
                  </div>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider transition-colors",
                    activeIndex === index ? "bg-primary text-primary-foreground" : "bg-secondary"
                  )}>
                    {job.level}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <CustomButton type="submit">
          {t.searchButton}
        </CustomButton>
      </form>

      {/* Filters Panel */}
      <div className="fade-up-soft p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {/* Level Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {tc.level}
            </label>
            <select
              value={level}
              onChange={(e) => {
                setLevel(e.target.value);
                setPage(1);
              }}
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
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
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
              onChange={(e) => {
                setIsRemote(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
            >
              <option value="">{language === "vi" ? "Tất cả hình thức" : "All Modes"}</option>
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
              value={salaryMin}
              onChange={(e) => {
                setSalaryMin(e.target.value);
                setPage(1);
              }}
              placeholder={language === "vi" ? "Ví dụ: 1500" : "e.g. 1500"}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Clear Filters button */}
        {(level || type || isRemote || salaryMin || activeQuery) && (
          <div className="flex justify-end pt-2 border-t border-border/40">
            <button
              onClick={() => {
                setQuery("");
                setActiveQuery("");
                setLevel("");
                setIsRemote("");
                setType("");
                setSalaryMin("");
                setPage(1);
              }}
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
      ) : error ? (
        <div className="fade-up-soft rounded-2xl border border-destructive/20 bg-destructive/5 p-10 text-center backdrop-blur flex flex-col items-center justify-center gap-4 max-w-xl mx-auto">
          <div className="p-3 rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <p className="text-destructive font-medium">{error}</p>
          <CustomButton onClick={() => void loadJobs(activeQuery, page, true)} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {tc.retry}
          </CustomButton>
        </div>
      ) : jobs.length === 0 ? (
        <div className="fade-up-soft rounded-2xl border border-dashed border-border/60 bg-card/70 p-10 text-center backdrop-blur">
          <p className="text-muted-foreground">
            {t.noJobs}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job, index) => (
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
      {!loading && !error && totalPages > 1 && (
        <div className="fade-up-soft flex items-center justify-center gap-3 pt-6 border-t border-border/30">
          <CustomButton
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="text-xs py-2 px-3 gap-1"
          >
            {tc.previous}
          </CustomButton>

          <span className="text-sm text-muted-foreground font-medium">
            {tc.pageOf.replace("{page}", String(page)).replace("{total}", String(totalPages))}
          </span>

          <CustomButton
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            className="text-xs py-2 px-3 gap-1"
          >
            {tc.next}
          </CustomButton>
        </div>
      )}
    </div>
  );
}
