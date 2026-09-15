// Chuoi hien thi cua service worker. Tach san cho i18n.
export const STRINGS = {
  badgeNoContentScript: 'Extension không chạy được trên trang này',
  badgeMissingPair: 'Chưa gán cặp ngôn ngữ cho phím này',
  extensionName: 'Hotkey Translator',
} as const;

export const BADGE = {
  noContentScript: { text: '×', color: '#c0392b' },
  missingPair: { text: '!', color: '#d68910' },
} as const;

/** Badge tu xoa sau 4s. */
export const BADGE_TTL_MS = 4000;
