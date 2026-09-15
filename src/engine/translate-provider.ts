// Diem vao cua engine. Route A (xac minh phase 01): Translator co san trong
// isolated world cua content script — khong can cau MAIN world.
//
// TUYET DOI khong goi mang. Khong fetch, khong fallback cloud, khong mo tab ngoai.
// Day la rang buoc cung, khong phai muc tieu.
import type { TranslateProvider } from '../shared/translate-contract.ts';
import { TranslateError } from '../shared/translate-contract.ts';
import { checkAvailability } from './availability.ts';
import { classify, fromAvailability, type ErrorDescriptor } from './errors.ts';
import { createSessionCache, type SessionLike } from './session-cache.ts';

function toError(d: ErrorDescriptor): TranslateError {
  return new TranslateError(d.kind, d.message, d.action);
}

async function createSession(
  source: string,
  target: string,
  signal?: AbortSignal,
): Promise<SessionLike> {
  // Truyen signal de huy that su DUNG viec nen, khong chi dung viec hien thi.
  return Translator.create({ sourceLanguage: source, targetLanguage: target, signal });
}

export function createTranslateProvider(): TranslateProvider {
  const cache = createSessionCache(createSession);
  // Roi trang -> giai phong model. Khong lam la ro RAM tren SPA song lau.
  window.addEventListener('pagehide', () => cache.destroyAll());

  async function translate(
    text: string,
    source: string,
    target: string,
    signal: AbortSignal,
    onPartial?: (chunk: string) => void,
  ): Promise<string> {
    if (signal.aborted) throw new TranslateError('ABORTED', '');

    let session: SessionLike;
    try {
      // Chi hoi availability khi chua co session. Co roi la da chac chan kha dung.
      const state = await checkAvailability(source, target, signal);
      const problem = fromAvailability(state, source, target);
      if (problem) throw toError(problem);
      session = await cache.get(source, target, signal);
    } catch (err) {
      if (err instanceof TranslateError) throw err;
      throw toError(classify(err, 'create'));
    }

    if (signal.aborted) throw new TranslateError('ABORTED', '');

    try {
      // Streaming mua duoc cam giac nhanh: chu dau tien toi som hon han ban dich day du.
      if (onPartial && typeof session.translateStreaming === 'function') {
        return await readStream(session, text, signal, onPartial);
      }
      return await session.translate(text, { signal });
    } catch (err) {
      if (signal.aborted) throw new TranslateError('ABORTED', '');
      if (err instanceof TranslateError) throw err;
      throw toError(classify(err, 'translate'));
    }
  }

  return { translate };
}

async function readStream(
  session: SessionLike,
  text: string,
  signal: AbortSignal,
  onPartial: (chunk: string) => void,
): Promise<string> {
  const stream = session.translateStreaming!(text, { signal });
  const reader = stream.getReader();
  let acc = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      // Kiem abort MOI vong: khong kiem la ket qua cu ve sau de len ket qua moi.
      if (signal.aborted) throw new TranslateError('ABORTED', '');
      acc += value ?? '';
      onPartial(acc);
    }
  } finally {
    reader.releaseLock();
  }
  return acc;
}
