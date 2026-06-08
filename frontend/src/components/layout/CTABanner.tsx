"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

export default function CTABanner() {
  const { user, loading } = useAuth();
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasLoggedInUser, setHasLoggedInUser] = useState(false);

  // Set hasLoggedInUser on mount/load if user is already present
  useEffect(() => {
    if (!loading && user) {
      setHasLoggedInUser(true);
    }
  }, [user, loading]);

  // Handle auto-close animation when user logs in/registers successfully
  useEffect(() => {
    if (user && !loading) {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsDismissed(true);
      }, 500); // Wait for transition-all duration-500 to finish
      return () => clearTimeout(timer);
    }
  }, [user, loading]);

  useEffect(() => {
    // Check if user is logged in or if banner was dismissed in this session
    if (loading || user || hasLoggedInUser) {
      setIsVisible(false);
      return;
    }

    const dismissed = sessionStorage.getItem("cta-dismissed") === "true";
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // 1. Show banner when user scrolls down past 300px
    const handleScroll = () => {
      if (window.scrollY > 300 && !isDismissed) {
        setIsVisible(true);
      }
    };

    // 2. Show banner on custom click event
    const handleShowCTA = () => {
      if (!isDismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("show-cta-banner", handleShowCTA);

    // Initial check in case they are already scrolled
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("show-cta-banner", handleShowCTA);
    };
  }, [user, loading, isDismissed, hasLoggedInUser]);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("cta-dismissed", "true");
    setTimeout(() => {
      setIsDismissed(true);
    }, 500); // Wait for transition-all duration-500 to finish
  };

  // Do not render anything if user is logged in, loading, or has dismissed the banner
  if (loading || hasLoggedInUser || (isDismissed && !isVisible)) {
    return null;
  }

  const isVi = language === "vi";
  const titleText = isVi ? "Khám phá nhiều cơ hội hơn!" : "Discover more opportunities!";
  const descriptionText = isVi
    ? "Đăng ký tài khoản ngay để ứng tuyển nhanh chóng và nhận gợi ý việc làm phù hợp."
    : "Register an account now to apply quickly and receive tailored job recommendations.";
  const loginText = isVi ? "Đăng nhập" : "Login";
  const registerText = isVi ? "Đăng ký ngay" : "Register Now";

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 left-4 md:left-auto z-50 max-w-sm",
        "transition-all duration-500 ease-out transform",
        isVisible
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-12 opacity-0 scale-95 pointer-events-none"
      )}
    >
      <div className="interactive-panel p-5 shadow-2xl border border-border/60 rounded-2xl bg-card/90 backdrop-blur-md">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <h4 className="font-semibold text-base text-foreground md:text-lg">
            {titleText}
          </h4>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Description */}
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {descriptionText}
        </p>

        {/* CTA Buttons */}
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
