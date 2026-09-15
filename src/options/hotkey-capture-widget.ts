// Widget bat to hop phim that: capture keydown tren window, preventDefault + stopPropagation
// MOI phim khi dang o che do bat, de options page khong phan ung voi phim nguoi dung go.
import { fromEvent, modifierCount, reject, type HotkeyReject } from '../shared/hotkey-codec.ts';

export type HotkeyCaptureCallbacks = {
  /** To hop hop le theo reject() — widget thoat che do bat, lop goi tu validate xung dot tiep. */
  onCapture(canonical: string): void;
  /** Bi tu choi ngay tai widget (khong phai modifier don) — van o che do bat, cho bam lai. */
  onReject(reason: HotkeyReject): void;
  /** Nguoi dung bam Escape tran (khong modifier) de huy bat. */
  onCancel(): void;
};

export class HotkeyCaptureWidget {
  private active = false;

  private readonly handleKeydown = (e: KeyboardEvent): void => {
    if (!this.active) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.code === 'Escape' && modifierCount(e) === 0) {
      this.stop();
      this.callbacks.onCancel();
      return;
    }

    const reason = reject(e);
    if (reason === 'MODIFIER_ONLY') return; // chua thanh to hop, cho bam tiep
    if (reason) {
      this.callbacks.onReject(reason);
      return;
    }

    const canonical = fromEvent(e);
    if (!canonical) return; // phong thu: reject() == null nen ly thuyet khong toi day
    this.stop();
    this.callbacks.onCapture(canonical);
  };

  constructor(private readonly callbacks: HotkeyCaptureCallbacks) {}

  start(): void {
    if (this.active) return;
    this.active = true;
    window.addEventListener('keydown', this.handleKeydown, true);
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    window.removeEventListener('keydown', this.handleKeydown, true);
  }
}
