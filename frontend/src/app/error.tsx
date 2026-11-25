"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import CustomButton from "@/components/ui/CustomButton";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { translations } from "@/lib/translations";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { language } = useLanguage();
  const tc = translations[language].common;

  useEffect(() => {
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="interactive-panel max-w-md w-full p-8 text-center space-y-5 border-destructive/30">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {tc.errorBoundaryTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tc.errorBoundaryDesc}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <CustomButton onClick={reset} className="w-full sm:w-auto gap-2">
            <RefreshCw className="h-4 w-4" />
            {tc.retry}
          </CustomButton>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {tc.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
