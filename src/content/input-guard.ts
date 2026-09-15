// Ham THUAN — khong dung window/document. Test duoc bang object gia.
// Day la lop chan rui ro "Cao" nhat cua phase: cuop phim cua Gmail/Docs/Notion.

/** type cua <input> KHONG phai o nhap van ban -> khong coi la editable. */
const NON_TEXT_INPUT = new Set([
  'checkbox', 'radio', 'range', 'color', 'file', 'button', 'submit', 'reset', 'image',
]);

type ElementLike = {
  tagName?: string;
  getAttribute?(name: string): string | null;
  closest?(sel: string): unknown;
} | null;

export function isEditable(el: ElementLike): boolean {
  if (!el || typeof el.tagName !== 'string') return false;
  const tag = el.tagName.toUpperCase();
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') {
    const type = (el.getAttribute?.('type') ?? 'text').toLowerCase();
    return !NON_TEXT_INPUT.has(type);
  }
  return !!el.closest?.('[contenteditable=""],[contenteditable="true"]');
}

type KeyLike = {
  ctrlKey: boolean; altKey: boolean; shiftKey: boolean; metaKey: boolean;
  repeat?: boolean; isComposing?: boolean; keyCode?: number; code?: string;
};

export function modifierCount(e: KeyLike): number {
  return [e.ctrlKey, e.altKey, e.shiftKey, e.metaKey].filter(Boolean).length;
}

export type IgnoreReason = 'REPEAT' | 'COMPOSING' | 'OWN_TOOLTIP' | 'EDITABLE_WEAK_COMBO';

/**
 * Quyet dinh bo qua su kien hay khong, theo bang "Quy tac bao ve" cua phase 05.
 * null = khong bo qua (di tiep sang buoc khop hotkey).
 */
export function shouldIgnore(
  e: KeyLike,
  activeEl: ElementLike,
  insideOwnTooltip: boolean,
): IgnoreReason | null {
  // Giu phim khong duoc ban nhieu lan dich.
  if (e.repeat) return 'REPEAT';
  // Bo go tieng Viet/Nhat dang soan — xu ly la sinh hanh vi ngau nhien.
  if (e.isComposing || e.keyCode === 229) return 'COMPOSING';
  if (insideOwnTooltip) return 'OWN_TOOLTIP';
  // Trong o nhap lieu, to hop 1 modifier qua de dung phim cua trang.
  if (isEditable(activeEl) && modifierCount(e) < 2) return 'EDITABLE_WEAK_COMBO';
  return null;
}
