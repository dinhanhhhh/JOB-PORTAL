"use client";

import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { translations } from "@/lib/translations";

export default function NotFound() {
  const { language } = useLanguage();
  const tc = translations[language].common;

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="interactive-panel max-w-md w-full p-8 text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <SearchX className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            404
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {tc.notFoundTitle}
          </h1>
          <p className="text-sm text-muted-foreground">{tc.notFoundDesc}</p>
        </div>
        <div className="pt-2">
          <Link
            href="/"
            className="interactive-button inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            {tc.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
