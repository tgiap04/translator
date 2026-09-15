// Ham THUAN — KHONG import runtime nao (chi import type, bi xoa luc chay).
// Nho vay test duoc bang `node --test` khong can Chrome, khong can build.
// classify() tra MO TA loi; translate-provider moi dung no thanh TranslateError.
import type { TranslateErrorKind } from '../shared/translate-contract.js';

export type ErrorDescriptor = {
  kind: TranslateErrorKind;
  message: string;
  /** Dung MOT goi y hanh dong. Nhieu hon la nguoi dung khong doc. */
  action?: string;
  /** Tooltip hien nut mo options (phase 06 doc co nay). */
  openOptions?: boolean;
};

export type AvailabilityState = 'ready' | 'needs-download' | 'downloading' | 'unsupported' | 'no-api';

/** Nhan ngon ngu cho thong diep: 'vi','en' -> 'VI → EN'. */
export function pairLabel(source: string, target: string): string {
  return `${source.toUpperCase()} → ${target.toUpperCase()}`;
}

export function fromAvailability(state: AvailabilityState, source: string, target: string): ErrorDescriptor | null {
  const p = pairLabel(source, target);
  switch (state) {
    case 'ready':
      return null;
    case 'no-api':
      return {
        kind: 'NO_API',
        message: 'Trình duyệt chưa hỗ trợ dịch on-device.',
        action: 'Cần Chrome 138 trở lên trên máy tính.',
      };
    case 'needs-download':
      return {
        kind: 'NEEDS_DOWNLOAD',
        message: `Chưa tải gói ngôn ngữ ${p}.`,
        action: 'Mở cài đặt để tải',
        openOptions: true,
      };
    case 'downloading':
      return {
        kind: 'DOWNLOADING',
        message: `Đang tải gói ngôn ngữ ${p}, thử lại sau ít phút.`,
      };
    case 'unsupported':
      return {
        kind: 'UNSUPPORTED',
        message: `Chrome không hỗ trợ dịch ${p}.`,
        action: 'Chọn cặp ngôn ngữ khác.',
      };
  }
}

/** Loi tho tu API -> mo ta. KHONG parse chuoi loi cung nhac: hinh dang doi giua cac ban Chrome. */
export function classify(raw: unknown, phase: 'create' | 'translate'): ErrorDescriptor {
  const e = raw as { name?: string; message?: string } | null;
  const name = e?.name ?? '';
  const msg = e?.message ?? '';

  if (name === 'AbortError') return { kind: 'ABORTED', message: '' };

  if (name === 'NotAllowedError') {
    // Gap khi pack chua tai va khong co user gesture — dung o content script.
    return {
      kind: 'NEEDS_DOWNLOAD',
      message: 'Chưa tải gói ngôn ngữ cho cặp này.',
      action: 'Mở cài đặt để tải',
      openOptions: true,
    };
  }

  if (name === 'NotSupportedError') {
    return { kind: 'UNSUPPORTED', message: 'Chrome không hỗ trợ cặp ngôn ngữ này.', action: 'Chọn cặp khác.' };
  }

  if (name === 'QuotaExceededError' || /quota|too large|input.*limit/i.test(msg)) {
    return { kind: 'QUOTA', message: 'Đoạn văn vượt giới hạn của bộ dịch.', action: 'Bôi đen đoạn ngắn hơn.' };
  }

  if (phase === 'create') {
    return {
      kind: 'CREATE_FAILED',
      message: 'Không khởi tạo được bộ dịch.',
      action: 'Thử lại, hoặc khởi động lại trình duyệt.',
    };
  }

  return { kind: 'UNKNOWN', message: 'Dịch thất bại.', action: 'Thử lại.' };
}
