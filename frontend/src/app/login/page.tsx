"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import CustomInput from "@/components/ui/CustomInput";
import CustomButton from "@/components/ui/CustomButton";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { getApiBaseApi } from "@/lib/api";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, user, loading } = useAuth(); // 👈 lấy loading từ AuthProvider nếu có
  const router = useRouter();

  // ✅ Redirect khi đã đăng nhập — chạy trong effect, không trong render
  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    await login(values.email, values.password);
    router.replace("/"); // ✅ event phase: hợp lệ
  };

  return (
    <Card>
      <h1 className="text-xl font-semibold mb-4">Đăng nhập</h1>

      {/* Có thể ẩn form khi đã có user để tránh nháy UI */}
      {user ? (
        <p className="text-sm text-gray-600">Đang chuyển hướng…</p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <CustomInput
            label="Email"
            {...register("email")}
            error={errors.email?.message}
          />
          <CustomInput
            type="password"
            label="Mật khẩu"
            {...register("password")}
            error={errors.password?.message}
          />
          <CustomButton loading={isSubmitting} className="w-full">
            Đăng nhập
          </CustomButton>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Hoặc</span>
            </div>
          </div>

          <CustomButton
            variant="outline"
            className="w-full"
            onClick={() => {
              const url = `${getApiBaseApi()}/auth/google`;
              console.log("Google OAuth URL:", url);
              window.location.href = url;
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
            Đăng nhập với Google
          </CustomButton>

          <div className="text-sm text-gray-600 mt-2">
            <p>
              <b>Demo:</b>
            </p>
            <p>Seeker: dev@example.com / dev12345</p>
            <p>Employer: hr@example.com / hr12345</p>
            <p>Admin: admin@example.com / admin123</p>
          </div>
        </form>
      )}
    </Card>
  );
}
