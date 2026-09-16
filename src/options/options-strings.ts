// Gom moi chuoi hien thi cua options page — chuan bi san cho _locales/ o v2.
// Chuoi co tham so dung ham, khong dung template literal rai rac trong view.

export const S = {
  pageTitle: 'Hotkey Translator',
  bootLoading: 'Đang tải…',
  errSaveFailed: 'Lưu cấu hình thất bại. Kiểm tra dung lượng đồng bộ hoặc thử lại.',

  unsupportedTitle: 'Trình duyệt chưa hỗ trợ',
  unsupportedBody:
    'Translator API cần Chrome 138 trở lên. Cập nhật Chrome rồi mở lại trang này.',

  pairsHeading: 'Cặp ngôn ngữ',
  addPairButton: 'Thêm cặp ngôn ngữ',
  pairMaxReached: (max: number): string =>
    `Đã đạt trần ${max} cặp. Xoá bớt cặp cũ trước khi thêm mới.`,
  pairSourceLabel: 'Ngôn ngữ nguồn',
  pairTargetLabel: 'Ngôn ngữ đích',
  pairHotkeyLabel: 'Tổ hợp phím',
  pairSameLanguageError: 'Ngôn ngữ nguồn và đích không được trùng nhau.',

  saveButton: 'Lưu',
  cancelButton: 'Huỷ',
  editButton: 'Sửa',
  deleteButton: 'Xoá',
  confirmDelete: (pairLabel: string): string => `Xoá cặp ${pairLabel}?`,

  captureIdle: 'Bấm để ghi tổ hợp phím',
  captureListening: 'Đang chờ bạn bấm phím… (Esc để huỷ)',
  captureLocked: 'Đặt tại chrome://extensions/shortcuts',
  extraHotkeyNone: 'chưa có phím riêng',
  hotkeyTagFixed: 'cố định',
  hotkeyTagCustom: 'riêng',
  editorLockedNote:
    'Cặp này gắn với một phím cố định của Chrome. Phím đó đổi ở trang đổi phím của Chrome, '
    + 'nhưng bạn có thể gán thêm một tổ hợp riêng ở đây — cả hai đều dùng được.',

  errNoModifier: 'Cần ít nhất một phím Ctrl/Alt/Shift/Meta — gõ chữ trần sẽ đụng ngay.',
  errShiftOnly: 'Chỉ Shift vẫn là gõ chữ hoa, chọn tổ hợp khác.',
  errReserved: 'Phím này dành cho thao tác hệ thống (Esc/Enter/Space/Tab).',
  errForbidden: 'Tổ hợp này thuộc về trình duyệt/hệ điều hành.',
  errDupPair: (pairLabel: string): string => `Tổ hợp này đang dùng cho ${pairLabel}.`,
  errDupCommand: (commandLabel: string): string =>
    `Trùng lệnh "${commandLabel}". Đổi tại chrome://extensions/shortcuts.`,

  downloadButton: 'Tải gói ngôn ngữ',
  cancelDownloadButton: 'Huỷ tải',
  badgeLoading: '…',
  badgeAvailable: 'Đã sẵn sàng',
  badgeDownloadable: 'Chưa tải',
  badgeDownloading: 'Đang tải',
  badgeUnavailable: 'Không hỗ trợ',

  errPackNotSupported: 'Cặp ngôn ngữ này không được hỗ trợ.',
  errPackNotAllowed: 'Thiếu thao tác người dùng thật — bấm lại nút Tải gói.',
  errPackAborted: 'Đã huỷ tải.',
  errPackNotReadable: 'Tải hỏng, thử lại.',
  errPackUnknown: 'Lỗi không xác định khi tải gói ngôn ngữ.',

  commandsHeading: 'Phím tắt cố định',
  commandsIntroBefore:
    'Ba tổ hợp phím cố định dưới đây do Chrome quản lý — phần mở rộng không được phép tự đổi. '
    + 'Dùng nút bên phải để mở trang đổi phím của Chrome.',
  commandsOpenShortcutsButton: 'Mở trang đổi phím của Chrome',
  commandsOpenFailed: 'Không mở được. Hãy tự dán vào thanh địa chỉ: chrome://extensions/shortcuts',
  commandsColName: 'Lệnh',
  commandsColShortcut: 'Tổ hợp phím',
  commandsUnset: 'Chưa gán',
};
