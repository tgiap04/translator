// Chuoi tieng Viet hien thi tren tooltip - gom mot cho de de i18n sau nay.
// Khong rai literal trong tooltip-view.ts / tooltip-controller.ts.

export const STRINGS = {
  pendingBody: 'Đang dịch…',
  noSelectionBody: 'Chưa bôi đen đoạn nào.',
  tooLongBody: (length: number, max: number): string =>
    `Đoạn dài ${length.toLocaleString('vi-VN')} ký tự, vượt mức ${max.toLocaleString('vi-VN')}. ` +
    'Hãy bôi đen đoạn ngắn hơn.',
  errorFallback: 'Có lỗi khi dịch. Thử lại sau.',
  swapAriaLabel: 'Đổi chiều dịch',
  targetSelectAriaLabel: 'Chọn ngôn ngữ đích',
  closeAriaLabel: 'Đóng tooltip dịch',
  copyLabel: 'Copy',
  copyAriaLabel: 'Sao chép bản dịch',
  copiedLabel: 'Đã copy',
  copyFailedLabel: 'Không copy được',
  sourceAriaLabel: 'Đoạn văn gốc',
  resultAriaLabel: 'Kết quả dịch',
} as const;

/**
 * Danh sach ngon ngu dich - DU LIEU GIA cho phase 06 (build song song, khong
 * phu thuoc engine/config that). Contract TooltipController.show/update chua
 * truyen danh sach cap ngon ngu da cau hinh; khi noi voi phase 03/04 (config
 * that), day la noi duy nhat can thay danh sach nay.
 */
export const FAKE_TARGET_LANGS: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
  { code: 'fr', label: 'Français' },
];
