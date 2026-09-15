// Du lieu tinh: ma BCP-47 + ten hien thi cho Translator API. KHONG luu vao storage —
// options page tra ten tu day moi lan render, config chi giu ma ('vi', 'en'...).

export type LanguageEntry = { code: string; name: string };

export const LANGUAGES: readonly LanguageEntry[] = [
  { code: 'en', name: 'Tiếng Anh' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'ja', name: 'Tiếng Nhật' },
  { code: 'ko', name: 'Tiếng Hàn' },
  { code: 'zh', name: 'Tiếng Trung (Giản thể)' },
  { code: 'zh-Hant', name: 'Tiếng Trung (Phồn thể)' },
  { code: 'fr', name: 'Tiếng Pháp' },
  { code: 'de', name: 'Tiếng Đức' },
  { code: 'es', name: 'Tiếng Tây Ban Nha' },
  { code: 'pt', name: 'Tiếng Bồ Đào Nha' },
  { code: 'ru', name: 'Tiếng Nga' },
  { code: 'it', name: 'Tiếng Ý' },
  { code: 'nl', name: 'Tiếng Hà Lan' },
  { code: 'pl', name: 'Tiếng Ba Lan' },
  { code: 'tr', name: 'Tiếng Thổ Nhĩ Kỳ' },
  { code: 'th', name: 'Tiếng Thái' },
  { code: 'id', name: 'Tiếng Indonesia' },
  { code: 'ms', name: 'Tiếng Mã Lai' },
  { code: 'hi', name: 'Tiếng Hindi' },
  { code: 'ar', name: 'Tiếng Ả Rập' },
  { code: 'bn', name: 'Tiếng Bengal' },
  { code: 'ur', name: 'Tiếng Urdu' },
  { code: 'fa', name: 'Tiếng Ba Tư' },
  { code: 'he', name: 'Tiếng Do Thái' },
  { code: 'el', name: 'Tiếng Hy Lạp' },
  { code: 'cs', name: 'Tiếng Séc' },
  { code: 'sk', name: 'Tiếng Slovakia' },
  { code: 'hu', name: 'Tiếng Hungary' },
  { code: 'ro', name: 'Tiếng Romania' },
  { code: 'bg', name: 'Tiếng Bulgaria' },
  { code: 'uk', name: 'Tiếng Ukraina' },
  { code: 'sv', name: 'Tiếng Thụy Điển' },
  { code: 'da', name: 'Tiếng Đan Mạch' },
  { code: 'fi', name: 'Tiếng Phần Lan' },
  { code: 'no', name: 'Tiếng Na Uy' },
  { code: 'sr', name: 'Tiếng Serbia' },
  { code: 'hr', name: 'Tiếng Croatia' },
  { code: 'sl', name: 'Tiếng Slovenia' },
  { code: 'lt', name: 'Tiếng Litva' },
  { code: 'lv', name: 'Tiếng Latvia' },
  { code: 'et', name: 'Tiếng Estonia' },
  { code: 'km', name: 'Tiếng Khmer' },
  { code: 'lo', name: 'Tiếng Lào' },
  { code: 'my', name: 'Tiếng Myanmar' },
  { code: 'tl', name: 'Tiếng Philippines' },
];

/** Tra ten hien thi tu ma BCP-47. Ma la khong nhan dien -> tra chinh ma do (fail-safe). */
export function languageName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}
