// frontend/src/app/company/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getMyCompany, upsertMyCompany } from "@/lib/company";
import type { Company } from "@/types";
import CustomInput from "@/components/ui/CustomInput";
import CustomTextarea from "@/components/ui/CustomTextarea";
import CustomButton from "@/components/ui/CustomButton";

export default function CompanyPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<{
    name: string;
    description?: string;
    website?: string;
  }>({ name: "" });

  useEffect(() => {
    let mounted = true;
    getMyCompany()
      .then((data) => {
        if (mounted) {
          setCompany(data.company);
          setForm({
            name: data.company.name,
            description: data.company.description,
            website: data.company.website,
          });
        }
      })
      .catch(() => {
        /* 404 nếu chưa có */
      });
    return () => {
      mounted = false;
    };
  }, []);

  const save = async () => {
    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      website: form.website?.trim() || undefined,
    };
    const data = await upsertMyCompany(payload);
    setCompany(data.company);
    alert("Đã lưu company");
  };

  return (
    <div className="max-w-xl bg-white border rounded-xl p-6 space-y-4">
      <h1 className="text-xl font-semibold">Company (Employer)</h1>
      <CustomInput
        label="Tên công ty"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <CustomTextarea
        label="Mô tả"
        rows={4}
        value={form.description ?? ""}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <CustomInput
        label="Website"
        value={form.website ?? ""}
        onChange={(e) => setForm({ ...form, website: e.target.value })}
      />
      <CustomButton onClick={save}>Lưu</CustomButton>
      {company && (
        <p className="text-sm text-gray-600 mt-2">
          Cập nhật gần nhất: {company.name}
        </p>
      )}
    </div>
  );
}
