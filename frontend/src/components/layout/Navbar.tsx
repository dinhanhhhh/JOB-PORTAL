"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const linkClass = (href: string) =>
    (href === "/" ? pathname === "/" : pathname.startsWith(href))
      ? "text-primary font-medium"
      : "text-foreground/80 hover:text-primary";

  return (
    <nav className="w-full bg-background border-b">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between text-foreground">
        {/* Logo */}
        <Link href="/" className="font-semibold">
          JobPortal
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-4">
          {/* Link chung cho tất cả */}
          <Link href="/" className={linkClass("/")}>Jobs</Link>

          {/* Menu cho SEEKER */}
          {!loading && user?.role === "seeker" && (
            <>
              <Link href="/applications" className={linkClass("/applications")}>My Applications</Link>
              <Link href="/profile" className={linkClass("/profile")}>Profile</Link>
            </>
          )}

          {/* Menu cho EMPLOYER và ADMIN (không có SEEKER) */}
          {!loading &&
            (user?.role === "employer" || user?.role === "admin") && (
              <>
                <Link href="/applications" className={linkClass("/applications")}>Applications</Link>
                <Link href="/company" className={linkClass("/company")}>Company</Link>
                <Link href="/dashboard" className={linkClass("/dashboard")}>Dashboard</Link>
              </>
            )}

          {/* Menu riêng cho ADMIN */}
          {!loading && user?.role === "admin" && (
            <Link href="/admin" className={linkClass("/admin")}>Admin</Link>
          )}

          {/* Authentication Section */}
          {loading ? (
            <span className="text-sm text-muted-foreground">...</span>
          ) : user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-foreground/90">
                Xin chào, <span className="font-medium">{user.name}</span>
                <span className="ml-1 text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                  {user.role}
                </span>
              </span>
              <button className="text-sm text-destructive" onClick={logout}>
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm">
                Login
              </Link>
              <Link href="/register" className="text-sm">
                Register
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}


