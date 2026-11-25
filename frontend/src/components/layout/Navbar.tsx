"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { cn } from "@/lib/utils";
import { translations } from "@/lib/translations";
import Skeleton from "@/components/ui/Skeleton";

// Load Toggles on client only to avoid SSR hydration mismatch
const ThemeToggle = dynamic(() => import("@/components/ui/ThemeToggle"), {
  ssr: false,
});
const LanguageToggle = dynamic(() => import("@/components/ui/LanguageToggle"), {
  ssr: false,
});

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const t = translations[language].nav;
  const ta = translations[language].auth;
  const tc = translations[language].common;

  const [menuState, setMenuState] = useState<{ open: boolean; path: string }>({
    open: false,
    path: "",
  });
  const mobileOpen = menuState.open && menuState.path === pathname;

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuState({ open: false, path: pathname });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen, pathname]);

  const closeMenu = () => {
    setMenuState({ open: false, path: pathname });
  };

  const toggleMenu = () => {
    setMenuState((prev) => ({
      open: !(prev.open && prev.path === pathname),
      path: pathname,
    }));
  };

  const linkClass = (href: string, mobile = false) =>
    cn(
      "interactive-link text-sm",
      mobile && "py-1.5 w-full justify-start",
      (href === "/" ? pathname === "/" : pathname.startsWith(href))
        ? "interactive-link-active font-semibold"
        : "text-foreground/80"
    );

  const handleLogoClick = () => {
    closeMenu();
    window.dispatchEvent(new CustomEvent("reset-jobs-filter"));
  };

  const handleLogout = async () => {
    closeMenu();
    try {
      await logout();
      toast.success(ta.logoutSuccess);
      router.push("/");
    } catch {
      toast.error(tc.error);
    }
  };

  const renderRoleLinks = (mobile = false) => (
    <>
      <Link
        href="/"
        onClick={handleLogoClick}
        className={linkClass("/", mobile)}
      >
        {t.jobs}
      </Link>

      {!loading && user?.role === "seeker" && (
        <>
          <Link
            href="/applications"
            onClick={closeMenu}
            className={linkClass("/applications", mobile)}
          >
            {t.myApplications}
          </Link>
          <Link
            href="/profile"
            onClick={closeMenu}
            className={linkClass("/profile", mobile)}
          >
            {t.profile}
          </Link>
        </>
      )}

      {!loading && (user?.role === "employer" || user?.role === "admin") && (
        <>
          <Link
            href="/applications"
            onClick={closeMenu}
            className={linkClass("/applications", mobile)}
          >
            {t.applications}
          </Link>
          {user?.role === "employer" && (
            <Link
              href="/company"
              onClick={closeMenu}
              className={linkClass("/company", mobile)}
            >
              {t.company}
            </Link>
          )}
          <Link
            href="/dashboard"
            onClick={closeMenu}
            className={linkClass("/dashboard", mobile)}
          >
            {t.dashboard}
          </Link>
        </>
      )}

      {!loading && user?.role === "admin" && (
        <Link
          href="/admin"
          onClick={closeMenu}
          className={linkClass("/admin", mobile)}
        >
          {t.admin}
        </Link>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur-md border-b border-border/60">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-2 text-foreground">
        <Link
          href="/"
          onClick={handleLogoClick}
          className="interactive-link text-lg font-semibold interactive-link-active shrink-0"
        >
          JobPortal
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4 min-w-0">
          {renderRoleLinks(false)}

          {loading ? (
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14 bg-primary/20" />
            </div>
          ) : user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-foreground/90 flex items-center gap-1.5">
                <span className="hidden lg:inline">{t.welcome},</span>
                <span className="font-medium max-w-[140px] truncate">
                  {user.name}
                </span>
                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                  {user.role}
                </span>
              </span>
              <button
                type="button"
                className="interactive-link text-sm text-destructive"
                onClick={handleLogout}
              >
                {t.logout}
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="interactive-link text-sm text-foreground/80"
              >
                {t.login}
              </Link>
              <Link
                href="/register"
                className="interactive-link text-sm text-primary"
              >
                {t.register}
              </Link>
            </>
          )}
          <LanguageToggle />
          <ThemeToggle />
        </div>

        {/* Mobile Controls */}
        <div className="flex md:hidden items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <button
            type="button"
            onClick={toggleMenu}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-menu"
            aria-label={tc.menu}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60 bg-background/70 text-foreground hover:bg-accent/60 transition-colors"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Panel */}
      {mobileOpen && (
        <div
          id="mobile-nav-menu"
          className="md:hidden max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-border/60 bg-background/95 backdrop-blur-md px-4 py-4 space-y-3"
        >
          <div className="flex flex-col gap-1.5">{renderRoleLinks(true)}</div>

          <div className="border-t border-border/50 pt-3">
            {loading ? (
              <div className="flex items-center gap-3 py-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16 bg-primary/20" />
              </div>
            ) : user ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 text-sm">
                  <span className="font-medium truncate">{user.name}</span>
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded shrink-0">
                    {user.role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm font-medium text-destructive hover:underline shrink-0"
                >
                  {t.logout}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="flex-1 text-center rounded-lg border border-border py-2 text-sm font-medium hover:bg-secondary transition-colors"
                >
                  {t.login}
                </Link>
                <Link
                  href="/register"
                  onClick={closeMenu}
                  className="flex-1 text-center interactive-button rounded-lg py-2 text-sm font-semibold"
                >
                  {t.register}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
