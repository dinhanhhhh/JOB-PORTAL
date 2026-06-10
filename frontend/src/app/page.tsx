"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  Suspense,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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

function diacriticPattern(input: string): string {
  const map: Record<string, string> = {
    a: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    à: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    á: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ả: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ã: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ạ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    â: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ầ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ấ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ẩ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ẫ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ậ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ă: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ằ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ắ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ẳ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ẵ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ặ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",

    e: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    è: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    é: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    ẻ: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    ẽ: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    ẹ: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    ê: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    ề: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    ế: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    ể: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    ễ: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    ệ: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",

    i: "[iìíỉĩịIÌÍỈĨỊ]",
    ì: "[iìíỉĩịIÌÍỈĨỊ]",
    í: "[iìíỉĩịIÌÍỈĨỊ]",
    ỉ: "[iìíỉĩịIÌÍỈĨỊ]",
    ĩ: "[iìíỉĩịIÌÍỈĨỊ]",
    ị: "[iìíỉĩịIÌÍỈĨỊ]",

    o: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ò: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ó: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ỏ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    õ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ọ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ô: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ồ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ố: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ổ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ỗ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ộ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ơ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ờ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ớ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ở: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ỡ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ợ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",

    u: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ù: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ú: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ủ: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ũ: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ụ: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ư: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ừ: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ứ: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ử: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ui: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ux: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    "ui/ux": "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ữ: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ự: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",

    y: "[yỳýỷỹỵYỲÝỶỸỴ]",
    ỳ: "[yỳýỷỹỵYỲÝỶỸỴ]",
    ý: "[yỳýỷỹỵYỲÝỶỸỴ]",
    ỷ: "[yỳýỷỹỵYỲÝỶỸỴ]",
    ỹ: "[yỳýỷỹỵYỲÝỶỸỴ]",
    ỵ: "[yỳýỷỹỵYỲÝỶỸỴ]",

    d: "[dđDĐ]",
    đ: "[dđDĐ]"
  };
  return input
    .split("")
    .map((char) => map[char] || map[char.toLowerCase()] || char)
    .join("");
}

function buildKeywordRegex(keyword: string, flags = "i") {
  const escapedKeyword = keyword.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  const fuzzyPattern = diacriticPattern(escapedKeyword);
  return new RegExp(`(${fuzzyPattern})`, flags);
}

function highlightSuggestionText(text: string, keyword: string | undefined): ReactNode {
  if (!keyword || !keyword.trim()) {
    return text;
  }
  const regex = buildKeywordRegex(keyword, "gi");
  const matchRegex = buildKeywordRegex(keyword);
  const parts = text.split(regex);
  return parts.map((part, i) =>
    matchRegex.test(part) ? (
      <mark
        key={i}
        className="bg-primary/20 text-primary font-bold px-0.5 rounded-sm"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function HomePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [jobs, setJobs] = useState<Job[]>([]);
  
  // Local query state for typing
  const initialQ = searchParams.get("q") || "";
  const [query, setQuery] = useState<string>(initialQ);
  
  // Sync input value with URL param q on back/forward navigation
  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  // Derived filter states from URL search params
  const activeQuery = searchParams.get("q") || "";
  const level = searchParams.get("level") || "";
  const isRemote = searchParams.get("isRemote") || "";
  const type = searchParams.get("type") || "";
  const salaryMin = searchParams.get("salaryMin") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  const [loading, setLoading] = useState<boolean>(true);
  const [suggestions, setSuggestions] = useState<Job[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const suggestionRequestId = useRef(0);

  // Pagination states
  const [totalPages, setTotalPages] = useState<number>(1);

  const { language } = useLanguage();
  const t = translations[language].home;
  const tc = translations[language].common;

  // Helper to update search params in the URL
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
      // Reset page to 1 unless page is explicitly updated
      if (!updates.page) {
        params.delete("page");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );
  
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

  // Listen to logo/nav clicks to reset all job filters
  useEffect(() => {
    const handleReset = () => {
      setQuery("");
      router.push(pathname);
    };
    window.addEventListener("reset-jobs-filter", handleReset);
    return () => {
      window.removeEventListener("reset-jobs-filter", handleReset);
    };
  }, [router, pathname]);

  // Use debounce for suggestions
  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length === 0) {
      suggestionRequestId.current += 1;
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveIndex(-1);
      setLoadingSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    const currentRequestId = ++suggestionRequestId.current;
    const timer = setTimeout(async () => {
      try {
        const data = await getJobs({
          q: trimmedQuery,
          page: 1,
          limit: 5,
          level: level || undefined,
          isRemote: isRemote || undefined,
          type: type || undefined,
          salaryMin: salaryMin || undefined,
        });
        if (isMounted.current && currentRequestId === suggestionRequestId.current) {
          setSuggestions(data.data);
          setShowSuggestions(true);
          setActiveIndex(-1);
        }
      } catch (err) {
        console.error("Fetch suggestions error:", err);
        if (isMounted.current && currentRequestId === suggestionRequestId.current) {
          setSuggestions([]);
          setShowSuggestions(true);
        }
      } finally {
        if (isMounted.current && currentRequestId === suggestionRequestId.current) {
          setLoadingSuggestions(false);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, level, isRemote, type, salaryMin]);

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
    updateParams({ q: jobTitle });
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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
    updateParams({ q: "" });
  };

  const getSuggestionMeta = (job: Job) => {
    const matchingSkills = job.skills
      .filter((skill) => buildKeywordRegex(query).test(skill))
      .slice(0, 3);

    if (matchingSkills.length > 0) {
      return matchingSkills.join(", ");
    }

    return job.company?.name || job.location || (job.isRemote ? tc.remote : tc.onsite);
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
          updateParams({ q: query });
          setShowSuggestions(false);
          setActiveIndex(-1);
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
              role="combobox"
              aria-autocomplete="list"
              aria-controls="job-search-suggestions"
              aria-expanded={showSuggestions && query.trim().length > 0}
              aria-activedescendant={
                activeIndex >= 0 ? `job-search-suggestion-${activeIndex}` : undefined
              }
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
          {showSuggestions && query.trim().length > 0 && (
            <div
              id="job-search-suggestions"
              role="listbox"
              className="absolute top-full left-0 w-full mt-2 rounded-xl border border-border bg-card shadow-2xl overflow-hidden z-50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
            >
              {loadingSuggestions ? (
                <div className="flex items-center justify-center p-4 gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>{language === "vi" ? "Đang tìm gợi ý..." : "Searching suggestions..."}</span>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {language === "vi" ? "Không tìm thấy gợi ý nào" : "No suggestions found"}
                </div>
              ) : (
                suggestions.map((job, index) => (
                  <button
                    key={job._id}
                    id={`job-search-suggestion-${index}`}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === index}
                    className={cn(
                      "w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between group border-b border-border/40 last:border-0",
                      activeIndex === index ? "bg-accent/80 text-primary" : "hover:bg-accent/40"
                    )}
                    onClick={() => handleSuggestionClick(job.title)}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <div className="flex flex-col">
                      <span className={cn("font-medium transition-colors", activeIndex === index && "translate-x-1 duration-300")}>
                        {highlightSuggestionText(job.title, query)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {highlightSuggestionText(getSuggestionMeta(job), query)}
                      </span>
                    </div>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider transition-colors",
                      activeIndex === index ? "bg-primary text-primary-foreground" : "bg-secondary"
                    )}>
                      {job.level}
                    </span>
                  </button>
                ))
              )}
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
                updateParams({ level: e.target.value });
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
                updateParams({ type: e.target.value });
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
                updateParams({ isRemote: e.target.value });
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
                updateParams({ salaryMin: e.target.value });
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
                router.push(pathname);
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
            onClick={() => updateParams({ page: String(Math.max(1, page - 1)) })}
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
            onClick={() => updateParams({ page: String(Math.min(totalPages, page + 1)) })}
            className="text-xs py-2 px-3 gap-1"
          >
            {tc.next}
          </CustomButton>
        </div>
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
