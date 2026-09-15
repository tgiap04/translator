// Doc doan text dang boi den + hinh chu nhat de neo tooltip.
// Ba nguon, theo thu tu: o nhap lieu dang focus -> Range -> khong co.

export type SelectionRead =
  | { ok: true; text: string; rect: DOMRect }
  | { ok: false; reason: 'NO_SELECTION' };

const NO_SELECTION = { ok: false, reason: 'NO_SELECTION' } as const;

function isTextInput(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag !== 'INPUT') return false;
  const type = (el.getAttribute('type') ?? 'text').toLowerCase();
  return !['checkbox', 'radio', 'range', 'color', 'file', 'button', 'submit', 'reset', 'image']
    .includes(type);
}

/** Rect rong hay gap khi selection nam trong phan tu an — lui ve getClientRects(). */
function usableRect(range: Range): DOMRect | null {
  const r = range.getBoundingClientRect();
  if (r.width > 0 || r.height > 0) return r;
  const first = range.getClientRects()[0];
  return first ?? null;
}

export function readSelection(): SelectionRead {
  const active = document.activeElement;

  // window.getSelection() KHONG tra text dang boi den trong input/textarea.
  if (isTextInput(active)) {
    const { selectionStart: s, selectionEnd: e } = active;
    if (typeof s === 'number' && typeof e === 'number' && s !== e) {
      const text = active.value.slice(s, e).trim();
      // Khong co Range cho noi dung input -> neo vao chinh o nhap lieu.
      if (text) return { ok: true, text, rect: active.getBoundingClientRect() };
    }
    return NO_SELECTION;
  }

  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return NO_SELECTION;

  const range = sel.getRangeAt(0);
  const text = range.toString().trim();
  if (!text) return NO_SELECTION;

  const rect = usableRect(range);
  if (!rect) return NO_SELECTION;

  return { ok: true, text, rect };
}
