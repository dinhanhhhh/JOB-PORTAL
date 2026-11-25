"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@/types";
import {
  me,
  logout as apiLogout,
  login as apiLogin,
  register as apiRegister,
} from "@/lib/auth";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (
    name: string,
    email: string,
    password: string,
    role?: "seeker" | "employer"
  ) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const syncUserFromServer = useCallback(async (activeCheck?: () => boolean) => {
    try {
      const currentUser = await me();
      if (activeCheck && !activeCheck()) return;
      setUser(currentUser);
      if (currentUser) {
        localStorage.setItem("auth_user", JSON.stringify(currentUser));
      } else {
        localStorage.removeItem("auth_user");
      }
    } catch {
      if (activeCheck && !activeCheck()) return;
      setUser(null);
      localStorage.removeItem("auth_user");
    } finally {
      if (!activeCheck || activeCheck()) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    void syncUserFromServer(() => isMounted);
    return () => {
      isMounted = false;
    };
  }, [syncUserFromServer]);

  const refreshUser = useCallback(async () => {
    await syncUserFromServer();
  }, [syncUserFromServer]);

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin({ email, password });
    setUser(u);
    localStorage.setItem("auth_user", JSON.stringify(u));
    return u;
  }, []);

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      role: "seeker" | "employer" = "seeker"
    ) => {
      const u = await apiRegister({ name, email, password, role });
      setUser(u);
      localStorage.setItem("auth_user", JSON.stringify(u));
      return u;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_user");
      }
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      setUser,
    }),
    [user, loading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
