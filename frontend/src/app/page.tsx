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
import { X } from "lucide-react";

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [suggestions, setSuggestions] = useState<Job[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const isMounted = useRef(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { language } = useLanguage();
  const t = translations[language].home;
  
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
    async (keyword?: string, showLoader = false) => {
      if (showLoader) setLoading(true);
      setShowSuggestions(false);
      setActiveIndex(-1);
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

  const handleSuggestionClick = (jobTitle: string) => {
    setQuery(jobTitle);
    setShowSuggestions(false);
    setActiveIndex(-1);
    void loadJobs(jobTitle, true);
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
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIndex(-1);
    // Không gọi loadJobs nữa để tránh reload lại danh sách card
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

      <form 
        onSubmit={(e) => {
          e.preventDefault();
          if (activeIndex === -1) {
            void loadJobs(query, true);
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

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <LoadingSpinner />
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
            <JobCard key={job._id} job={job} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
