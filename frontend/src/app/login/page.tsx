"use client";

import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CustomButton from "@/components/ui/CustomButton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { translations } from "@/lib/translations";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getApiBaseApi,
  getDisplayErrorMessage,
  isSafeRedirectPath,
} from "@/lib/api";
import type { UserRole } from "@/types";
import Link from "next/link";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type FormValues = z.infer<typeof schema>;

function getDefaultRedirectForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "employer":
      return "/dashboard";
    default:
      return "/";
  }
}

function LoginPageContent() {
  const { login, user, loading } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const t = translations[language].auth;
  const tc = translations[language].common;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const redirectTarget = isSafeRedirectPath(searchParams.get("redirect"));
  const oauthErrorParam = searchParams.get("error");
  const oauthErrorMessage =
    oauthErrorParam === "account_disabled"
      ? t.oauthDisabled
      : oauthErrorParam === "server_error"
      ? t.oauthServerError
      : oauthErrorParam === "auth_failed"
      ? t.oauthFailed
      : null;

  const activeError = formError ?? oauthErrorMessage;

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectTarget ?? getDefaultRedirectForRole(user.role));
    }
  }, [user, loading, router, redirectTarget]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      const signedInUser = await login(values.email, values.password);
      toast.success(t.loginSuccess);
      router.replace(
        redirectTarget ?? getDefaultRedirectForRole(signedInUser.role)
      );
    } catch (error) {
      const msg = getDisplayErrorMessage(error, tc.error);
      setFormError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background text-foreground px-4 py-10">
      <Card className="w-full max-w-md space-y-6 rounded-2xl border p-6 sm:p-8 shadow-lg backdrop-blur">
        <div className="text-center space-y-2">
          <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <span className="text-xl">~</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.loginTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.loginSubtitle}</p>
        </div>

        {activeError && !user && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{activeError}</span>
          </div>
        )}

        {user ? (
          <p className="text-sm text-muted-foreground text-center">
            {tc.redirecting}
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t.password}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border/60 bg-background/60"
                />
                {t.rememberMe}
              </label>
              <button
                type="button"
                onClick={() => toast.info(t.forgotPasswordHint)}
                className="interactive-link text-primary text-sm"
              >
                {t.forgotPassword}
              </button>
            </div>

            <CustomButton
              type="submit"
              className="w-full"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? t.signingIn : t.loginButton}
            </CustomButton>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {t.orContinueWith}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                window.location.href = `${getApiBaseApi()}/auth/google`;
              }}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t.noAccount}{" "}
          <Link href="/register" className="interactive-link text-primary">
            {t.registerButton}
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LoginPageContent />
    </Suspense>
  );
}
