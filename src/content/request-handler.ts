// Hop nhat HAI duong vao (message tu service worker + keydown dong) ve mot cho.
import type { TooltipController, TranslateProvider } from '../shared/translate-contract.ts';
import { readSelection } from './selection-reader.ts';
import { STRINGS } from './content-strings.ts';

export type RequestOrigin = 'command' | 'hotkey';

export type HandleArgs = {
  source: string;
  target: string;
  origin: RequestOrigin;
};

export type HandlerDeps = {
  tooltip: TooltipController;
  provider: TranslateProvider;
  maxChars: () => number;
};

export function createRequestHandler(deps: HandlerDeps) {
  // Request moi huy request cu — tranh ket qua cu ve sau de len ket qua moi.
  let inflight: AbortController | null = null;
  // Nut doi chieu hien tai cho cu -> giu lai rect de khong phai doc lai Selection.
  let lastRect: DOMRect | null = null;

  async function handle({ source, target, origin }: HandleArgs): Promise<void> {
    const sel = readSelection();

    if (!sel.ok) {
      // Duong lenh tinh: user chu dong bam, im lang la bo roi ho.
      // Duong keydown: bao moi lan go trung phim la gay nhieu.
      if (origin === 'command') {
        const r = new DOMRect(window.innerWidth / 2, window.innerHeight / 3, 0, 0);
        deps.tooltip.show(r, { kind: 'NO_SELECTION' }, { source, target, sourceText: '' });
      }
      return;
    }

    const max = deps.maxChars();
    if (sel.text.length > max) {
      // Canh bao voi SO THAT, khong am tham cat: cat giua cau sinh ban dich sai
      // ma nguoi dung khong biet.
      deps.tooltip.show(
        sel.rect,
        { kind: 'TOO_LONG', length: sel.text.length, max },
        { source, target, sourceText: sel.text },
      );
      return;
    }

    await run(sel.text, sel.rect, source, target);
  }

  async function run(text: string, rect: DOMRect, source: string, target: string): Promise<void> {
    inflight?.abort();
    lastRect = rect;
    const ctrl = new AbortController();
    inflight = ctrl;

    deps.tooltip.show(rect, { kind: 'PENDING' }, { source, target, sourceText: text });

    try {
      const out = await deps.provider.translate(text, source, target, ctrl.signal, (chunk) => {
        if (!ctrl.signal.aborted) deps.tooltip.update({ kind: 'OK', translated: chunk });
      });
      if (ctrl.signal.aborted) return;
      deps.tooltip.update({ kind: 'OK', translated: out });
    } catch (err) {
      if (ctrl.signal.aborted) return; // Bi huy -> im lang, dung ke.
      const e = err as { kind?: string; message?: string; action?: string };
      if (e.kind === 'ABORTED') return;
      deps.tooltip.update({
        kind: 'ERROR',
        message: e.message ?? 'Dịch thất bại.',
        action: e.action,
        actionKind: e.kind === 'NEEDS_DOWNLOAD' ? 'OPEN_OPTIONS' : undefined,
      });
    } finally {
      if (inflight === ctrl) inflight = null;
    }
  }

  /**
   * Nut doi chieu / doi ngon ngu dich: dung sourceText va rect da giu.
   * KHONG doc lai Selection — user bam nut la selection co the da mat.
   */
  function retryLast(source: string, target: string, sourceText: string): void {
    const rect = lastRect ?? new DOMRect(window.innerWidth / 2, window.innerHeight / 3, 0, 0);
    void run(sourceText, rect, source, target);
  }

  /** Tooltip dong -> dung viec dich nen. Goi qua callback onHide. */
  function cancel(): void {
    inflight?.abort();
    inflight = null;
  }

  return { handle, retryLast, cancel, strings: STRINGS };
}
