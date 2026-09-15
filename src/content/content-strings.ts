// Chuoi hien thi cua content script. Tach san cho i18n.
export const STRINGS = {
  noSelection: 'Chưa bôi đen đoạn nào.',
  tooLong: (len: number, max: number): string =>
    `Đoạn dài ${len.toLocaleString('vi-VN')} ký tự, vượt mức ${max.toLocaleString('vi-VN')}. Hãy bôi đen đoạn ngắn hơn.`,
} as const;
