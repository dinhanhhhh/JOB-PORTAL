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

// ✅ Cách đúng: KHÔNG truyền { required_error } vào z.enum
const RoleEnum = z.enum(["seeker", "employer"]);

const schema = z.object({
  name: z.string().min(2, "Tên tối thiểu 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  role: RoleEnum, // bắt buộc, kiểu "seeker" | "employer"
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: registerUser, user } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    // ✅ Set mặc định bằng RHF
    defaultValues: { role: "seeker" },
    mode: "onSubmit",
  });

  // ✅ Redirect khi đã đăng nhập — chạy trong effect, không trong render
  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const onSubmit = async (values: FormValues) => {
    await registerUser(values.name, values.email, values.password, values.role);
    router.push("/");
  };

  const role = watch("role");

  return (
    <Card>
      <h1 className="text-xl font-semibold mb-4">Đăng ký</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <CustomInput
          label="Họ tên"
          {...register("name")}
          error={errors.name?.message}
        />
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
        <div>
          <label className="text-sm mr-2">Vai trò</label>
          <select
            className="border rounded px-3 py-2 bg-white"
            {...register("role")}
          >
            <option value="seeker">Seeker</option>
            <option value="employer">Employer</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Bạn chọn: <b>{role}</b>
          </p>
          {errors.role && (
            <p className="text-sm text-red-600">{errors.role.message}</p>
          )}
        </div>
        <CustomButton loading={isSubmitting} className="w-full">
          Đăng ký
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
          onClick={() =>
            (window.location.href = `${getApiBaseApi()}/auth/google`)
          }
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
          Đăng ký với Google
        </CustomButton>
      </form>
    </Card>
  );
}
