// frontend/src/app/company/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getMyCompany, upsertMyCompany } from "@/lib/company";
import type { Company } from "@/types";
import CustomInput from "@/components/ui/CustomInput";
import CustomTextarea from "@/components/ui/CustomTextarea";
import CustomButton from "@/components/ui/CustomButton";

export default function CompanyPage() {
  const { user, loading } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    website: "",
  });

  useEffect(() => {
    let mounted = true;
    getMyCompany()
      .then((data) => {
        if (!mounted) return;
        setCompany(data.company);
        setForm({
          name: data.company.name,
          description: data.company.description ?? "",
          website: data.company.website ?? "",
        });
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      mounted = false;
    };
  }, []);

  const save = async () => {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      website: form.website.trim() || undefined,
    };
    const data = await upsertMyCompany(payload);
    setCompany(data.company);
    alert("Company saved");
  };

  if (loading) {
    return <div className="max-w-xl interactive-panel p-6">Loading...</div>;
  }
  if (user?.role !== "employer") {
    return (
      <div className="max-w-xl interactive-panel p-6">
        403 - Only employers can access the Company page.
      </div>
    );
  }

  return (
    <div className="max-w-xl interactive-panel space-y-4 p-6">
      <h1 className="text-xl font-semibold">Company (Employer)</h1>
      <CustomInput
        label="Company name"
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.target.value })}
      />
      <CustomTextarea
        label="Description"
        rows={4}
        value={form.description}
        onChange={(event) => setForm({ ...form, description: event.target.value })}
      />
      <CustomInput
        label="Website"
        value={form.website}
        onChange={(event) => setForm({ ...form, website: event.target.value })}
      />
      <CustomButton onClick={save}>Save</CustomButton>
      {company && (
        <p className="text-sm text-muted-foreground">
          Last updated company: {company.name}
        </p>
      )}
    </div>
  );
}

