const DIACRITIC_CHAR_MAP: Record<string, string> = {
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
  đ: "[dđDĐ]",
};

export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildDiacriticPattern(input: string): string {
  const escaped = escapeRegex(input);
  return escaped
    .split("")
    .map((char) => {
      if (Object.prototype.hasOwnProperty.call(DIACRITIC_CHAR_MAP, char)) {
        return DIACRITIC_CHAR_MAP[char];
      }
      const lower = char.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(DIACRITIC_CHAR_MAP, lower)) {
        return DIACRITIC_CHAR_MAP[lower];
      }
      return char;
    })
    .join("");
}

/**
 * Splits text into highlighted and plain segments without stateful /g regex.test() bugs.
 */
export function splitHighlightSegments(
  text: string,
  keyword: string | undefined
): HighlightSegment[] {
  const trimmed = keyword?.trim() ?? "";
  if (!trimmed) {
    return [{ text, highlighted: false }];
  }

  const pattern = buildDiacriticPattern(trimmed);
  const splitRegex = new RegExp(`(${pattern})`, "gi");
  const exactRegex = new RegExp(`^(?:${pattern})$`, "i");

  return text
    .split(splitRegex)
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      highlighted: exactRegex.test(part),
    }));
}

export function matchesKeyword(
  text: string,
  keyword: string | undefined
): boolean {
  const trimmed = keyword?.trim() ?? "";
  if (!trimmed) return false;
  const pattern = buildDiacriticPattern(trimmed);
  return new RegExp(pattern, "i").test(text);
}

export function formatSalaryRange(
  salaryMin: number | undefined,
  salaryMax: number | undefined,
  language: "vi" | "en"
): string {
  const hasMin =
    typeof salaryMin === "number" &&
    Number.isFinite(salaryMin) &&
    salaryMin >= 0;
  const hasMax =
    typeof salaryMax === "number" &&
    Number.isFinite(salaryMax) &&
    salaryMax >= 0;

  if (hasMin && hasMax) {
    return `$${salaryMin.toLocaleString("en-US")} – $${salaryMax.toLocaleString("en-US")}`;
  }
  if (hasMin) {
    return language === "vi"
      ? `Từ $${salaryMin.toLocaleString("en-US")}`
      : `From $${salaryMin.toLocaleString("en-US")}`;
  }
  if (hasMax) {
    return language === "vi"
      ? `Đến $${salaryMax.toLocaleString("en-US")}`
      : `Up to $${salaryMax.toLocaleString("en-US")}`;
  }
  return language === "vi" ? "Thỏa thuận" : "Negotiable";
}

export function parsePageParam(value: string | null | undefined): number {
  if (!value) return 1;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return 1;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

export function formatRelativeDate(
  isoDate: string | undefined,
  language: "vi" | "en",
  nowMs = Date.now()
): string {
  if (!isoDate) return "";
  const time = Date.parse(isoDate);
  if (!Number.isFinite(time)) return "";

  const diffDays = Math.max(0, Math.floor((nowMs - time) / (1000 * 60 * 60 * 24)));

  if (diffDays === 0) return language === "vi" ? "Hôm nay" : "Today";
  if (diffDays === 1) return language === "vi" ? "Hôm qua" : "Yesterday";
  if (diffDays < 7) {
    return language === "vi" ? `${diffDays} ngày trước` : `${diffDays}d ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return language === "vi" ? `${weeks} tuần trước` : `${weeks}w ago`;
  }

  return new Date(time).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US");
}
