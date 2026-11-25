import { Types } from "mongoose";

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

// Unicode range covers Latin-1/Extended-A/Extended-B and Vietnamese Extended Additional, compatible with JS RegExp & PCRE2.
const NON_WORD_CHAR = "[^a-zA-Z0-9_À-ɏḀ-ỿ]";

/**
 * Checks whether a value is a valid MongoDB ObjectId string.
 */
export function isValidObjectId(id: string | undefined): id is string {
  return typeof id === "string" && Types.ObjectId.isValid(id);
}

/**
 * Escapes special regular expression metacharacters in literal search inputs.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Escapes regex metacharacters first, then expands Latin/Vietnamese letters into diacritic-insensitive character classes.
 */
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
 * Builds a diacritic-insensitive regex pattern bounded by non-word characters (supporting Vietnamese letters at boundaries).
 */
export function buildWordBoundaryRegexPattern(input: string): string {
  const fuzzy = buildDiacriticPattern(input);
  return `(?:^|${NON_WORD_CHAR})(?:${fuzzy})(?:$|${NON_WORD_CHAR})`;
}

/**
 * Parses an integer safely and clamps it between min and max, returning fallback for non-numeric inputs.
 */
export function parseBoundedInt(
  input: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(input)));
  }

  if (typeof input !== "string") return fallback;
  const trimmed = input.trim();
  if (!trimmed || !/^-?\d+$/.test(trimmed)) return fallback;

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/**
 * Parses a non-negative finite number, returning undefined for empty, invalid, or negative inputs.
 */
export function parseNonNegativeNumber(input: unknown): number | undefined {
  if (typeof input === "number") {
    return Number.isFinite(input) && input >= 0 ? input : undefined;
  }

  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
}

/**
 * Normalizes an email address by trimming whitespace and lowercasing.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
