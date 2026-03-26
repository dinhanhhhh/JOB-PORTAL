"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { cn } from "@/lib/utils";
import { Globe } from "lucide-react";

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className={cn(
        "relative flex h-8 w-14 items-center rounded-full bg-secondary/80 p-1.5 transition-all duration-300 ring-1 ring-border shadow-sm interactive-panel",
        "hover:scale-105 active:scale-95"
      )}
      aria-label="Toggle language"
    >
      <div
        className={cn(
          "h-5 w-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shadow-lg transition-transform duration-300 z-10",
          language === "en" ? "translate-x-6" : "translate-x-0"
        )}
      >
        {language.toUpperCase()}
      </div>
      <div className="absolute inset-0 flex items-center justify-between px-2.5 pointer-events-none">
        <Globe className={cn("h-3.5 w-3.5 text-foreground/40 transition-opacity", language === "vi" ? "opacity-0" : "opacity-100")} />
        <Globe className={cn("h-3.5 w-3.5 text-foreground/40 transition-opacity", language === "en" ? "opacity-0" : "opacity-100")} />
      </div>
    </button>
  );
}
