"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    role?: "seeker" | "employer"
  ) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    me()
      .then((u) => {
        if (isMounted) setUser(u);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const u = await apiLogin({ email, password });
      setUser(u);
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: "seeker" | "employer" = "seeker"
  ) => {
    try {
      const u = await apiRegister({ name, email, password, role });
      setUser(u);
    } catch (error) {
      console.error("Register failed", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
      setUser(null);
    } catch (error) {
      console.error("Logout failed", error);
      throw error;
    }
  };

  const value: AuthContextValue = {
    user,
    loading,
    login,
    register,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
