// Bat keydown o CAPTURE phase.
//
// Vi sao capture: Gmail, Google Docs, Notion deu gan listener o bubble phase va
// preventDefault rat nhieu phim. Lang o capture la cach duy nhat thay su kien truoc trang.
//
// Con dao hai luoi: chi preventDefault SAU KHI da khop mot hotkey da cau hinh.
// Khong khop thi im lang tuyet doi — cuop phim cua trang la loi te nhat lop nay gay ra.
import type { AppConfig, LangPair } from '../shared/config-schema.ts';
import { fromEvent } from '../shared/hotkey-codec.ts';
import { shouldIgnore } from './input-guard.ts';

export type HotkeyHit = (pair: LangPair) => void;

export function installHotkeyListener(
  getCfg: () => AppConfig,
  ownsNode: (n: EventTarget | null) => boolean,
  onHit: HotkeyHit,
): () => void {
  const handler = (e: KeyboardEvent): void => {
    // Thoat som truoc khi cham config — handler nay chay moi lan go phim.
    if (shouldIgnore(e, document.activeElement, ownsNode(e.target))) return;

    const canonical = fromEvent(e);
    if (!canonical) return;

    const pair = getCfg().pairs.find((p) => p.k === canonical);
    if (!pair) return; // Khong phai phim cua ta -> tra lai nguyen ven cho trang.

    e.preventDefault();
    e.stopPropagation();
    onHit(pair);
  };

  window.addEventListener('keydown', handler, { capture: true });
  return () => window.removeEventListener('keydown', handler, { capture: true });
}
