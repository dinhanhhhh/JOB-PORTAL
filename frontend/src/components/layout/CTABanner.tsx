"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { cn } from "@/lib/utils";

export default function CTABanner() {
  const { user, loading } = useAuth();
  const { language } = useLanguage();
  const [isTriggered, setIsTriggered] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isVisible = !loading && !user && !isDismissed && isTriggered;

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (loading || user || isDismissed) {
      return;
    }

    const handleScroll = () => {
      if (sessionStorage.getItem("cta-dismissed") === "true") {
        return;
      }
      if (window.scrollY > 300) {
        setIsTriggered(true);
      }
    };

    const handleShowCTA = () => {
      if (sessionStorage.getItem("cta-dismissed") === "true") {
        return;
      }
      setIsTriggered(true);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("show-cta-banner", handleShowCTA);

    const rafId = window.requestAnimationFrame(() => {
      handleScroll();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("show-cta-banner", handleShowCTA);
    };
  }, [user, loading, isDismissed]);

  const handleDismiss = () => {
    setIsTriggered(false);
    sessionStorage.setItem("cta-dismissed", "true");
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }
    dismissTimerRef.current = setTimeout(() => {
      setIsDismissed(true);
      dismissTimerRef.current = null;
    }, 500);
  };

  if (loading || user || isDismissed) {
    return null;
  }

  const isVi = language === "vi";
  const titleText = isVi
    ? "Khám phá nhiều cơ hội hơn!"
    : "Discover more opportunities!";
  const descriptionText = isVi
    ? "Đăng ký tài khoản ngay để ứng tuyển nhanh chóng và nhận gợi ý việc làm phù hợp."
    : "Register an account now to apply quickly and receive tailored job recommendations.";
  const loginText = isVi ? "Đăng nhập" : "Login";
  const registerText = isVi ? "Đăng ký ngay" : "Register Now";

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 left-4 md:left-auto z-50 max-w-sm max-w-[calc(100vw-2rem)]",
        "transition-all duration-500 ease-out transform",
        isVisible
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-12 opacity-0 scale-95 pointer-events-none"
      )}
    >
      <div className="interactive-panel p-5 shadow-2xl border border-border/60 rounded-2xl bg-card/90 backdrop-blur-md">
        <div className="flex items-start justify-between gap-4">
          <h4 className="font-semibold text-base text-foreground md:text-lg">
            {titleText}
          </h4>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {descriptionText}
        </p>

        <div className="mt-4 flex items-center justify-end gap-3">
          <Link
            href="/login"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-2 px-3 rounded-lg hover:bg-secondary"
          >
            {loginText}
          </Link>
          <Link
            href="/register"
            className="interactive-button text-xs font-semibold py-2 px-4 rounded-lg"
          >
            {registerText}
          </Link>
        </div>
      </div>
    </div>
  );
}
