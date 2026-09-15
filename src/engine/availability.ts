// Bon gia tri cua Translator.availability(), KHONG gop thanh hai:
// 'downloadable' co cach sua (vao options tai), 'unavailable' thi khong.
import type { AvailabilityState } from './errors.js';

export function hasTranslatorApi(): boolean {
  return typeof Translator !== 'undefined';
}

export async function checkAvailability(source: string, target: string): Promise<AvailabilityState> {
  if (!hasTranslatorApi()) return 'no-api';
  try {
    const a = await Translator.availability({ sourceLanguage: source, targetLanguage: target });
    switch (a) {
      case 'available': return 'ready';
      case 'downloadable': return 'needs-download';
      case 'downloading': return 'downloading';
      default: return 'unsupported';
    }
  } catch {
    return 'unsupported';
  }
}
