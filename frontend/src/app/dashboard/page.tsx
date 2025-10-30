// frontend/src/app/dashboard/page.tsx
"use client";

import { useState } from "react";
import { createJob } from "@/lib/jobs";
import type { JobLevel, JobType } from "@/types";
import CustomInput from "@/components/ui/CustomInput";
import CustomTextarea from "@/components/ui/CustomTextarea";
import CustomButton from "@/components/ui/CustomButton";
import { Card } from "@/components/ui/card";

function validateJobDraft(d: { title: string; description: string; skills: string[] }): string | null {
  if (!d.title || d.title.trim().length < 3) {
    return "Title must be at least 3 characters";
  }
  if (!d.description || d.description.trim().length < 20) {
    return "Description must be at least 20 characters";
  }
  if (!Array.isArray(d.skills) || d.skills.length === 0) {
    return "Please add at least one skill";
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
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 0);

    const message = validateJobDraft({ title, description, skills: skillArr });
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
      alert("Job created successfully!");
    } catch (error) {
      console.error(error);
      const msg = (error as Error).message || "";
      if (msg.includes("Please create a company profile first")) {
        alert("Create your company profile at /company before posting jobs.");
      } else {
        alert(`Failed to create job: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="interactive-panel space-y-4 p-6">
      <h1 className="text-xl font-semibold">Employer Dashboard – Create Job</h1>
      <CustomInput
        label="Title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <CustomTextarea
        label="Description (>= 20 characters)"
        rows={5}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <CustomInput
        label="Skills (comma separated)"
        value={skills}
        onChange={(event) => setSkills(event.target.value)}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Level</label>
          <select
            className="h-9 w-full rounded-md border border-border/40 bg-background/70 px-3 text-sm transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={level}
            onChange={(event) => setLevel(event.target.value as JobLevel)}
          >
            {["entry", "mid", "senior", "lead", "executive"].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Job type</label>
          <select
            className="h-9 w-full rounded-md border border-border/40 bg-background/70 px-3 text-sm transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={type}
            onChange={(event) => setType(event.target.value as JobType)}
          >
            {["full-time", "part-time", "contract", "internship", "freelance"].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>
      <CustomInput
        label="Location"
        value={location}
        onChange={(event) => setLocation(event.target.value)}
      />
      <div className="flex items-center gap-2 text-sm">
        <input
          id="remote"
          type="checkbox"
          checked={isRemote}
          onChange={(event) => setIsRemote(event.target.checked)}
          className="h-4 w-4 rounded border-border/60 bg-background/60"
        />
        <label htmlFor="remote">Remote</label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <CustomInput
          type="number"
          label="Salary Min"
          value={salaryMin ?? ""}
          onChange={(event) =>
            setSalaryMin(
              Number.isFinite(+event.target.value) ? +event.target.value : undefined
            )
          }
        />
        <CustomInput
          type="number"
          label="Salary Max"
          value={salaryMax ?? ""}
          onChange={(event) =>
            setSalaryMax(
              Number.isFinite(+event.target.value) ? +event.target.value : undefined
            )
          }
        />
      </div>

      <CustomButton onClick={submit} loading={loading} disabled={loading}>
        Create job
      </CustomButton>
      <p className="text-xs text-muted-foreground">
        Tip: You need a company profile before posting jobs. If you see the message
        &quot;Please create a company profile first&quot;, head over to <code>/company</code> to create it.
      </p>
    </Card>
  );
}


