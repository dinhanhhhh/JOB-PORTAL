"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getJobById } from "@/lib/jobs";
import { applyToJob } from "@/lib/applications";
import type { Job } from "@/types";
import CustomButton from "@/components/ui/CustomButton";
import CustomTextarea from "@/components/ui/CustomTextarea";
import Skeleton from "@/components/ui/Skeleton";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, Briefcase, MapPin, DollarSign, Layers, FileText, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { translations } from "@/lib/translations";

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  const { user } = useAuth();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const { language } = useLanguage();
  const tc = translations[language].common;

  const fetchJob = () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    getJobById(jobId)
      .then((data) => setJob(data.job))
      .catch((err) => {
        console.error("Get job error:", err);
        setError(tc.error);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchJob();
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-card/60 border border-border/60 rounded-2xl p-6 md:p-8 space-y-6">
          <Skeleton className="h-9 w-2/3" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/4" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="fade-up-soft rounded-2xl border border-destructive/20 bg-destructive/5 p-10 text-center backdrop-blur flex flex-col items-center justify-center gap-4 max-w-xl mx-auto">
          <div className="p-3 rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <p className="text-destructive font-medium">{error}</p>
          <CustomButton onClick={fetchJob} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {tc.retry}
          </CustomButton>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="fade-up-soft rounded-2xl border border-dashed border-border/60 bg-card/70 p-10 text-center backdrop-blur">
          <p className="text-muted-foreground">
            {language === "vi" ? "Không tìm thấy công việc" : "Job not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Back button */}
      <div className="fade-up-soft text-sm text-muted-foreground">
        <button onClick={() => router.back()} className="hover:text-foreground transition-colors flex items-center gap-1.5">
          &larr; Quay lại danh sách
        </button>
      </div>

      {/* Job Details Card */}
      <div className="fade-up-soft bg-card/60 border border-border/60 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-lg space-y-6 relative overflow-hidden">
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 h-24 w-24 bg-primary/10 rounded-bl-full pointer-events-none" />

        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">{job.title}</h1>
          
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary uppercase">
              {job.level}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent text-accent-foreground uppercase">
              {job.type}
            </span>
            {job.isRemote && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase">
                Remote
              </span>
            )}
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 pt-6 border-t border-border/40">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/40">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Công ty</span>
              <span className="text-sm font-semibold truncate">{job.company?.name || "N/A"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/40">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Địa điểm</span>
              <span className="text-sm font-semibold truncate">{job.isRemote ? "Remote" : job.location || "N/A"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/40">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Mức lương</span>
              <span className="text-sm font-semibold truncate">
                {job.salaryMin || job.salaryMax
                  ? `${job.salaryMin ? `$${job.salaryMin}` : ""} - ${job.salaryMax ? `$${job.salaryMax}` : ""}`
                  : "Thỏa thuận"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/40">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Cấp bậc</span>
              <span className="text-sm font-semibold capitalize">{job.level}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3 pt-6 border-t border-border/30">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Mô tả công việc
          </h3>
          <p className="whitespace-pre-line text-muted-foreground leading-relaxed text-sm md:text-base">
            {job.description}
          </p>
        </div>

        {/* Requirements */}
        {job.requirements && job.requirements.length > 0 && (
          <div className="space-y-3 pt-6 border-t border-border/30">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Yêu cầu công việc
            </h3>
            <ul className="space-y-2 pl-5 list-disc text-muted-foreground text-sm md:text-base">
              {job.requirements.map((reqItem, i) => (
                <li key={i}>{reqItem}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Skills Tag List */}
        <div className="space-y-3 pt-6 border-t border-border/30">
          <h3 className="text-lg font-semibold">Kỹ năng yêu cầu</h3>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill) => (
              <span
                key={skill}
                className="bg-accent text-accent-foreground hover:bg-accent/80 transition-colors px-3 py-1.5 rounded-xl text-xs font-semibold"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Apply Form - Only for Seekers */}
      {user?.role === "seeker" && (
        <div className="fade-up-soft bg-card/60 border border-border/60 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-lg space-y-6">
          <h2 className="text-xl font-bold">Ứng tuyển công việc</h2>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-muted-foreground">
              Tải lên hồ sơ của bạn (PDF)
            </label>
            <div className="border border-dashed border-border/60 rounded-xl p-4 bg-background/50 hover:bg-background transition-colors flex flex-col items-center justify-center cursor-pointer relative">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm font-medium text-foreground">
                {resumeFile ? resumeFile.name : "Kéo thả hoặc nhấp để chọn file PDF"}
              </span>
              <span className="text-xs text-muted-foreground mt-1">Hỗ trợ tối đa 5MB</span>
            </div>
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
            {applying ? "Đang gửi hồ sơ..." : "Nộp đơn ứng tuyển"}
          </CustomButton>
        </div>
      )}

      {!user && (
        <div className="fade-up-soft bg-card/60 border border-border/60 rounded-2xl p-8 backdrop-blur-md shadow-lg text-center space-y-4 max-w-md mx-auto">
          <p className="text-muted-foreground text-sm">Vui lòng đăng nhập với tài khoản Ứng viên để nộp hồ sơ ứng tuyển công việc này.</p>
          <CustomButton onClick={() => router.push("/login")} className="w-full">
            Đăng nhập ngay
          </CustomButton>
        </div>
      )}
    </div>
  );
}
