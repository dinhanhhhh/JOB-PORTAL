"use client";

import Link from "next/link";
import type { Job } from "@/types";
import { cn } from "@/lib/utils";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { translations } from "@/lib/translations";

type JobCardProps = {
  job: Job;
  index?: number;
  highlightKeyword?: string;
};

function diacriticPattern(input: string): string {
  const map: Record<string, string> = {
    a: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    à: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    á: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ả: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ã: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ạ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    â: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ầ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ấ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ẩ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ẫ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ậ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ă: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ằ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ắ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ẳ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ẵ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    ặ: "[aàáảãạâầấẩẫậăằắẳẵặAÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]",
    
    e: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    è: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    é: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    ẻ: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    ẽ: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    ẹ: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    ê: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    ề: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    ế: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    ể: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    ễ: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    ệ: "[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]",
    
    i: "[iìíỉĩịIÌÍỈĨỊ]",
    ì: "[iìíỉĩịIÌÍỈĨỊ]",
    í: "[iìíỉĩịIÌÍỈĨỊ]",
    ỉ: "[iìíỉĩịIÌÍỈĨỊ]",
    ĩ: "[iìíỉĩịIÌÍỈĨỊ]",
    ị: "[iìíỉĩịIÌÍỈĨỊ]",
    
    o: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ò: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ó: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ỏ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    õ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ọ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ô: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ồ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ố: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ổ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ỗ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ộ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ơ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ờ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ớ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ở: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ỡ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    ợ: "[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]",
    
    u: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ù: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ú: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ủ: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ũ: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ụ: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ư: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ừ: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ứ: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ử: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ữ: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    ự: "[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]",
    
    y: "[yỳýỷỹỵYỲÝỶỸỴ]",
    ỳ: "[yỳýỷỹỵYỲÝỶỸỴ]",
    ý: "[yỳýỷỹỵYỲÝỶỸỴ]",
    ỷ: "[yỳýỷỹỵYỲÝỶỸỴ]",
    ỹ: "[yỳýỷỹỵYỲÝỶỸỴ]",
    ỵ: "[yỳýỷỹỵYỲÝỶỸỴ]",
    
    d: "[dđDĐ]",
    đ: "[dđDĐ]"
  };
  return input
    .split("")
    .map((char) => map[char] || map[char.toLowerCase()] || char)
    .join("");
}

// Reusable text highlight helper
function highlightText(text: string, keyword: string | undefined) {
  if (!keyword || !keyword.trim()) {
    return text;
  }
  const escapedKeyword = keyword.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  const fuzzyPattern = diacriticPattern(escapedKeyword);
  const regex = new RegExp(`(${fuzzyPattern})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        className="bg-primary/20 text-primary font-semibold px-0.5 rounded-sm"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function JobCard({ job, index = 0, highlightKeyword }: JobCardProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const t = translations[language].common;

  const handleViewClick = () => {
    if (!user) {
      window.dispatchEvent(new CustomEvent("show-cta-banner"));
    }
  };

  return (
    <div
      className={cn(
        "interactive-card hover-rise fade-up-soft p-4 text-card-foreground shadow-sm"
      )}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-lg leading-tight">
          {highlightText(job.title, highlightKeyword)}
        </h3>
        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground border border-white/10">
          {job.level}
        </span>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
        {highlightText(job.description, highlightKeyword)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {job.skills.slice(0, 4).map((skill) => (
          <span
            key={skill}
            className="text-xs px-2 py-0.5 rounded-full border border-accent/40 bg-accent/20 text-accent-foreground/90 transition-colors duration-200 hover:bg-accent/40"
          >
            {highlightText(skill, highlightKeyword)}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-foreground/75">
          {job.isRemote ? t.remote : job.location ?? t.onsite}
        </span>
        <Link
          className="interactive-link text-sm text-primary"
          href={`/jobs/${job._id}`}
          onClick={handleViewClick}
        >
          {t.view}
        </Link>
      </div>
      {job.company && (
        <div className="mt-2 text-sm text-muted-foreground">{job.company.name}</div>
      )}
    </div>
  );
}
