"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getJobById } from "@/lib/jobs";
import { applyToJob } from "@/lib/applications";
import type { Job } from "@/types";
import CustomButton from "@/components/ui/CustomButton";
import CustomTextarea from "@/components/ui/CustomTextarea";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  const { user } = useAuth();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  useEffect(() => {
    if (!jobId) return;

    getJobById(jobId)
      .then((data) => setJob(data.job))
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleApply = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role !== "seeker") {
      alert("Chỉ seeker mới có thể ứng tuyển");
      return;
    }

    setApplying(true);
    try {
      const formData = new FormData();
      if (resumeFile) {
        formData.append("resume", resumeFile);
      }
      if (coverLetter) {
        formData.append("coverLetter", coverLetter);
      }

      await applyToJob(jobId, formData);
      alert("Ứng tuyển thành công!");
      router.push("/applications");
    } catch (error) {
      console.error("Apply error:", error);
      alert("Ứng tuyển thất bại: " + (error as Error).message);
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <div>Đang tải...</div>;
  if (!job) return <div>Không tìm thấy công việc</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Job Details */}
      <div className="bg-card text-card-foreground rounded-lg border p-6 mb-6">
        <h1 className="text-2xl font-bold mb-4">{job.title}</h1>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <strong>Công ty:</strong> {job.company?.name || "N/A"}
          </div>
          <div>
            <strong>Level:</strong> {job.level}
          </div>
          <div>
            <strong>Location:</strong> {job.isRemote ? "Remote" : job.location}
          </div>
          <div>
            <strong>Type:</strong> {job.type}
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold mb-2">Mô tả công việc:</h3>
          <p className="whitespace-pre-line">{job.description}</p>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold mb-2">Kỹ năng yêu cầu:</h3>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill) => (
              <span
                key={skill}
                className="bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Apply Form - Only for Seekers */}
      {user?.role === "seeker" && (
        <div className="bg-card text-card-foreground rounded-lg border p-6">
          <h2 className="text-xl font-bold mb-4">Ứng tuyển công việc</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Upload CV (PDF)
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-accent file:text-accent-foreground hover:file:opacity-90"
            />
          </div>

          <CustomTextarea
            label="Thư giới thiệu (Cover Letter)"
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            rows={6}
            placeholder="Giới thiệu bản thân và lý do bạn phù hợp với công việc này..."
          />

          <CustomButton
            onClick={handleApply}
            loading={applying}
            className="w-full mt-4"
          >
            {applying ? "Đang gửi..." : "Gửi đơn ứng tuyển"}
          </CustomButton>
        </div>
      )}

      {!user && (
        <div className="text-center p-6">
          <p className="mb-4">Vui lòng đăng nhập để ứng tuyển công việc này</p>
          <CustomButton onClick={() => router.push("/login")}>
            Đăng nhập
          </CustomButton>
        </div>
      )}
    </div>
  );
}

