// Tai language pack qua Translator.create(). Boc trong click handler o lop goi (khong await
// truoc do) de giu user activation that — Translator.create() nem NotAllowedError neu khong.
import { S } from './options-strings.js';

export type PackDownloadError =
  | 'NOT_SUPPORTED'
  | 'NOT_ALLOWED'
  | 'ABORTED'
  | 'NOT_READABLE'
  | 'UNKNOWN';

export function mapDownloadError(err: unknown): PackDownloadError {
  const name = err instanceof Error ? err.name : '';
  switch (name) {
    case 'NotSupportedError':
      return 'NOT_SUPPORTED';
    case 'NotAllowedError':
      return 'NOT_ALLOWED';
    case 'AbortError':
      return 'ABORTED';
    case 'NotReadableError':
      return 'NOT_READABLE';
    default:
      return 'UNKNOWN';
  }
}

export function downloadErrorMessage(code: PackDownloadError): string {
  switch (code) {
    case 'NOT_SUPPORTED':
      return S.errPackNotSupported;
    case 'NOT_ALLOWED':
      return S.errPackNotAllowed;
    case 'ABORTED':
      return S.errPackAborted;
    case 'NOT_READABLE':
      return S.errPackNotReadable;
    case 'UNKNOWN':
      return S.errPackUnknown;
  }
}

/** Tai pack cho mot cap ngon ngu; dong session ngay khi xong — chi can pack, khong giu session. */
export async function downloadPack(
  sourceLanguage: string,
  targetLanguage: string,
  onProgress: (pct: number) => void,
  signal: AbortSignal,
): Promise<void> {
  const session = await Translator.create({
    sourceLanguage,
    targetLanguage,
    signal,
    monitor(m) {
      m.addEventListener('downloadprogress', (e) => {
        if (e.total > 0) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    },
  });
  session.destroy();
}

/** Trang thai pack la cap MAY NAY — khong sync duoc, hoi lai moi lan mo trang. */
export async function checkAvailability(
  sourceLanguage: string,
  targetLanguage: string,
): Promise<TranslatorAvailabilityValue> {
  try {
    return await Translator.availability({ sourceLanguage, targetLanguage });
  } catch {
    return 'unavailable';
  }
}
