// CONTRACT — dong bang sau phase 02.
// Chuoi canonical: 'Ctrl+Alt+Shift+Meta+KeyT' — modifier THU TU CO DINH, ket thuc bang event.code.
// Dung event.code chu KHONG dung event.key: key doi theo layout ban phim va theo IME
// (go tieng Viet Telex lam key ra ky tu la). code gan voi vi tri phim vat ly, on dinh.

/** Thu tu modifier co dinh — doi thu tu la hong so sanh chuoi. */
const ORDER = ['Ctrl', 'Alt', 'Shift', 'Meta'] as const;

const MODIFIER_CODES = new Set([
  'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight',
  'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight',
]);

/** Phim don / phim chuc nang tro — cam ke ca khi co modifier don. */
const RESERVED_BARE = new Set(['Escape', 'Enter', 'NumpadEnter', 'Space', 'Tab']);

const DIGITS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'];

/**
 * To hop cam. Nguon: phase-03 § "Danh sach to hop cam".
 * Ctrl va Meta coi nhu tuong duong (mac dung Meta, win/linux dung Ctrl).
 */
export const FORBIDDEN: readonly string[] = [
  // Tab trinh duyet
  ...['KeyT', 'KeyW', 'KeyN', ...DIGITS, 'Tab'].flatMap((c) => [`Ctrl+${c}`, `Meta+${c}`]),
  // Dieu huong
  ...['KeyL', 'KeyR', 'KeyD', 'KeyH', 'KeyJ'].flatMap((c) => [`Ctrl+${c}`, `Meta+${c}`]),
  // Sua van ban
  ...['KeyC', 'KeyV', 'KeyX', 'KeyZ', 'KeyY', 'KeyA', 'KeyS', 'KeyP', 'KeyF'].flatMap((c) => [
    `Ctrl+${c}`, `Meta+${c}`,
  ]),
  // DevTools
  'F12', 'Ctrl+Shift+KeyI', 'Ctrl+Shift+KeyJ', 'Ctrl+Shift+KeyC',
  'Meta+Alt+KeyI', 'Meta+Alt+KeyJ', 'Meta+Alt+KeyC',
  // He dieu hanh nuot truoc, extension khong bao gio thay
  'Meta+KeyQ', 'Meta+Space', 'Meta+Tab', 'Alt+Tab', 'Alt+F4',
];

const FORBIDDEN_SET = new Set(FORBIDDEN);

export type HotkeyReject =
  | 'MODIFIER_ONLY'   // moi bam modifier, chua thanh to hop
  | 'NO_MODIFIER'     // phim tran — go chu la dung ngay
  | 'SHIFT_ONLY'      // Shift+X van la go chu hoa
  | 'RESERVED'        // Escape/Enter/Space/Tab
  | 'FORBIDDEN';      // thuoc ve trinh duyet / OS

/** Dem so modifier dang giu. Phase 05 dung: trong o nhap lieu can >= 2. */
export function modifierCount(e: Pick<KeyboardEvent, 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'>): number {
  return [e.ctrlKey, e.altKey, e.shiftKey, e.metaKey].filter(Boolean).length;
}

type KeyLike = Pick<KeyboardEvent, 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey' | 'code'>;

/** Chuyen KeyboardEvent -> chuoi canonical. Khong ban ve tinh hop le, chi chuan hoa. */
export function fromEvent(e: KeyLike): string | null {
  if (!e.code || MODIFIER_CODES.has(e.code)) return null;
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (e.metaKey) parts.push('Meta');
  parts.push(e.code);
  return parts.join('+');
}

/** Kiem to hop co duoc phep gan khong. null = hop le. */
export function reject(e: KeyLike): HotkeyReject | null {
  if (!e.code || MODIFIER_CODES.has(e.code)) return 'MODIFIER_ONLY';
  const mods = modifierCount(e);
  if (mods === 0) return 'NO_MODIFIER';
  if (mods === 1 && e.shiftKey) return 'SHIFT_ONLY';
  if (RESERVED_BARE.has(e.code)) return 'RESERVED';
  const canonical = fromEvent(e);
  if (canonical && FORBIDDEN_SET.has(canonical)) return 'FORBIDDEN';
  return null;
}

export function isForbidden(canonical: string): boolean {
  return FORBIDDEN_SET.has(canonical);
}

/** Tach chuoi canonical -> cac phan. Tra null neu sai dinh dang. */
export function parse(canonical: string): { mods: string[]; code: string } | null {
  if (!canonical) return null;
  const parts = canonical.split('+');
  const code = parts.pop();
  if (!code) return null;
  for (const m of parts) if (!ORDER.includes(m as (typeof ORDER)[number])) return null;
  return { mods: parts, code };
}

const CODE_LABEL: Record<string, string> = {
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Space: 'Space', Comma: ',', Period: '.', Slash: '/', Semicolon: ';',
  Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\',
  Minus: '-', Equal: '=', Backquote: '`',
};

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? '');

/** Hien thi cho nguoi doc: 'Ctrl+Shift+KeyE' -> '⌃⇧E' (mac) hoac 'Ctrl+Shift+E'. */
export function format(canonical: string): string {
  const p = parse(canonical);
  if (!p) return canonical;
  const sym: Record<string, string> = IS_MAC
    ? { Ctrl: '⌃', Alt: '⌥', Shift: '⇧', Meta: '⌘' }
    : { Ctrl: 'Ctrl', Alt: 'Alt', Shift: 'Shift', Meta: 'Win' };
  const mods = p.mods.map((m) => sym[m] ?? m);
  let key = CODE_LABEL[p.code] ?? p.code;
  if (key.startsWith('Key')) key = key.slice(3);
  else if (key.startsWith('Digit')) key = key.slice(5);
  return IS_MAC ? [...mods, key].join('') : [...mods, key].join('+');
}

/**
 * Chuan hoa chuoi cua chrome.commands.getAll() ('Alt+Shift+1') ve canonical ('Alt+Shift+Digit1').
 * Bat buoc truoc khi so sanh voi hotkey dong — neu khong se bo sot xung dot.
 */
export function fromCommandShortcut(shortcut: string): string | null {
  if (!shortcut) return null;
  const raw = shortcut.split('+').map((s) => s.trim()).filter(Boolean);
  const key = raw.pop();
  if (!key) return null;
  const mods = new Set<string>();
  for (const m of raw) {
    if (m === 'Ctrl' || m === 'Control') mods.add('Ctrl');
    else if (m === 'Alt' || m === 'Option') mods.add('Alt');
    else if (m === 'Shift') mods.add('Shift');
    else if (m === 'Command' || m === 'MacCtrl' || m === 'Meta') mods.add('Meta');
    else return null;
  }
  let code = key;
  if (/^[0-9]$/.test(key)) code = `Digit${key}`;
  else if (/^[A-Za-z]$/.test(key)) code = `Key${key.toUpperCase()}`;
  return [...ORDER.filter((m) => mods.has(m)), code].join('+');
}
