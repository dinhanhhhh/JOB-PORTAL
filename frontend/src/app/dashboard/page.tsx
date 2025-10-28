// frontend/src/app/dashboard/page.tsx
"use client";

import { useState } from "react";
import { createJob } from "@/lib/jobs";
import type { JobLevel, JobType } from "@/types";
import CustomInput from "@/components/ui/CustomInput";
import CustomTextarea from "@/components/ui/CustomTextarea";
import CustomButton from "@/components/ui/CustomButton";
import { Card } from "@/components/ui/card";

function validateJobDraft(d: {
  title: string;
  description: string;
  skills: string[];
}): string | null {
  if (!d.title || d.title.trim().length < 3) {
    return "Tiêu đề (title) phải có ít nhất 3 ký tự";
  }
  if (!d.description || d.description.trim().length < 20) {
    return "Mô tả (description) phải có ít nhất 20 ký tự";
  }
  if (!Array.isArray(d.skills) || d.skills.length === 0) {
    return "Cần ít nhất 1 kỹ năng (skills)";
  }
  return null;
}

export default function DashboardPage() {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [skills, setSkills] = useState<string>("React, TypeScript");
  const [level, setLevel] = useState<JobLevel>("mid");
  const [type, setType] = useState<JobType>("full-time");
  const [location, setLocation] = useState<string>("Ho Chi Minh City");
  const [isRemote, setIsRemote] = useState<boolean>(false);
  const [salaryMin, setSalaryMin] = useState<number | undefined>(1500);
  const [salaryMax, setSalaryMax] = useState<number | undefined>(2500);
  const [loading, setLoading] = useState<boolean>(false);

  const submit = async () => {
    const skillArr = skills
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const draft = {
      title,
      description,
      skills: skillArr,
    };
    const message = validateJobDraft(draft);
    if (message) {
      alert(message);
      return;
    }

    setLoading(true);
    try {
      await createJob({
        title: title.trim(),
        description: description.trim(),
        requirements: [],
        skills: skillArr,
        location: location?.trim() || undefined,
        isRemote,
        salaryMin: typeof salaryMin === "number" ? salaryMin : undefined,
        salaryMax: typeof salaryMax === "number" ? salaryMax : undefined,
        level,
        type,
      });
      alert("Tạo job thành công!");
    } catch (e) {
      console.error(e);
      const msg = (e as Error).message || "";
      if (msg.includes("Please create a company profile first")) {
        alert("Bạn cần tạo Company trước khi đăng Job: vào /company để tạo.");
      } else {
        alert(`Tạo job lỗi: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <h1 className="text-xl font-semibold mb-4">
        Employer Dashboard — Tạo Job
      </h1>
      <div className="space-y-3">
        <CustomInput
          label="Tiêu đề"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <CustomTextarea
          label="Mô tả (≥ 20 ký tự)"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <CustomInput
          label="Kỹ năng (phân tách bởi dấu phẩy)"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
        />
        <div>
          <label className="text-sm">Cấp độ</label>
          <select
            className="border rounded px-3 py-2 ml-2"
            value={level}
            onChange={(e) => setLevel(e.target.value as JobLevel)}
          >
            {["entry", "mid", "senior", "lead", "executive"].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm">Loại công việc</label>
          <select
            className="border rounded px-3 py-2 ml-2"
            value={type}
            onChange={(e) => setType(e.target.value as JobType)}
          >
            {[
              "full-time",
              "part-time",
              "contract",
              "internship",
              "freelance",
            ].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <CustomInput
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <input
            id="remote"
            type="checkbox"
            checked={isRemote}
            onChange={(e) => setIsRemote(e.target.checked)}
          />
          <label htmlFor="remote" className="text-sm">
            Remote
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <CustomInput
            type="number"
            label="Salary Min"
            value={salaryMin ?? 0}
            onChange={(e) =>
              setSalaryMin(
                Number.isFinite(+e.target.value) ? +e.target.value : undefined
              )
            }
          />
          <CustomInput
            type="number"
            label="Salary Max"
            value={salaryMax ?? 0}
            onChange={(e) =>
              setSalaryMax(
                Number.isFinite(+e.target.value) ? +e.target.value : undefined
              )
            }
          />
        </div>

        <CustomButton onClick={submit} loading={loading} disabled={loading}>
          Tạo Job
        </CustomButton>
        <p className="text-xs text-gray-500">
          Lưu ý: Cần có Company trước khi đăng Job. Nếu gặp lỗi “Please create a
          company profile first”, hãy vào trang <code>/company</code> để tạo.
        </p>
      </div>
    </Card>
  );
}
