"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";

export default function Navbar() {
  const { user, loading, logout } = useAuth();

  return (
    <nav className="w-full bg-white border-b">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-semibold">
          JobPortal
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-4">
          {/* Link chung cho tất cả */}
          <Link href="/">Jobs</Link>

          {/* Menu cho SEEKER */}
          {!loading && user?.role === "seeker" && (
            <>
              <Link href="/applications">My Applications</Link>
              <Link href="/profile">Profile</Link>
            </>
          )}

          {/* Menu cho EMPLOYER và ADMIN (không có SEEKER) */}
          {!loading &&
            (user?.role === "employer" || user?.role === "admin") && (
              <>
                <Link href="/applications">Applications</Link>
                <Link href="/company">Company</Link>
                <Link href="/dashboard">Dashboard</Link>
              </>
            )}

          {/* Menu riêng cho ADMIN */}
          {!loading && user?.role === "admin" && (
            <Link href="/admin">Admin</Link>
          )}

          {/* Authentication Section */}
          {loading ? (
            <span className="text-sm text-gray-500">...</span>
          ) : user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">
                Xin chào, <span className="font-medium">{user.name}</span>
                <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {user.role}
                </span>
              </span>
              <button className="text-sm text-red-600" onClick={logout}>
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
        </div>
      </div>
    </nav>
  );
}
