"use client";

import { Loader2 } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  label?: string;
  className?: string;
}

export default function LoadingSpinner({ label, className }: LoadingSpinnerProps) {
  const { language } = useLanguage();
  const displayLabel = label ?? translations[language].common.loading;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-2 text-sm text-muted-foreground py-4",
        className
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span>{displayLabel}</span>
    </div>
  );
}
