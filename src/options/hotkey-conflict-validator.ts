// Ham thuan — kiem xung dot phim theo "Ma tran xung dot phim" (phase-03 § Architecture).
//
// LEAF MODULE CO CHU DICH: khong import gia tri nao (chi "import type", bi xoa het luc
// strip-types) de `node --test` nap thang file .ts nay ma khong can build/bundle truoc.
// Node native type-stripping KHONG resolve duoc specifier '*.js' ve file '*.ts' cung ten
// (da xac minh thuc nghiem) — do la ly do cac module thuan khac trong repo (command-router.ts,
// hotkey-codec.ts) cung khong co import gia tri xuyen file. isForbidden/fromCommandShortcut
// cua hotkey-codec.ts (CONTRACT dong bang) duoc TIEM VAO qua tham so `codec` thay vi import
// truc tiep — tranh trung lap logic (DRY) ma van giu module nay test duoc thang.
// Noi goi that (pair-editor-view.ts) duoc esbuild bundle nen khong gap gioi han nay.
import type { AppConfig } from '../shared/config-schema.js';

export type ConflictCode = 'FORBIDDEN' | 'DUP_PAIR' | 'DUP_COMMAND';

export type ConflictResult =
  | { ok: true }
  | { ok: false; code: 'FORBIDDEN' }
  | { ok: false; code: 'DUP_PAIR'; pairLabel: string }
  | { ok: false; code: 'DUP_COMMAND'; commandLabel: string };

/** Hinh dang toi gian cua chrome.commands.Command can cho validator. */
export type CommandEntry = { name: string; shortcut: string; description: string };

/** Cac ham thuan cua hotkey-codec.ts ma validator can — tiem vao tu noi goi that. */
export type HotkeyCodecDeps = {
  isForbidden(canonical: string): boolean;
  fromCommandShortcut(shortcut: string): string | null;
};

/**
 * Kiem to hop `canonical` co duoc phep gan cho cap `editingId` (null = cap moi) khong.
 * Kiem theo dung thu tu uu tien: cam tuyet doi -> trung cap dong khac -> trung lenh tinh.
 */
export function check(
  canonical: string,
  config: Pick<AppConfig, 'pairs'>,
  editingId: string | null,
  commands: readonly CommandEntry[],
  codec: HotkeyCodecDeps,
): ConflictResult {
  if (codec.isForbidden(canonical)) {
    return { ok: false, code: 'FORBIDDEN' };
  }

  const dupPair = config.pairs.find((p) => p.id !== editingId && p.k === canonical);
  if (dupPair) {
    return { ok: false, code: 'DUP_PAIR', pairLabel: `${dupPair.s} → ${dupPair.t}` };
  }

  for (const cmd of commands) {
    if (!cmd.shortcut) continue; // lenh chua duoc nguoi dung gan phim
    const normalized = codec.fromCommandShortcut(cmd.shortcut);
    // Khong chuan hoa duoc ve canonical -> fail-safe, coi la xung dot de khong bo sot.
    if (normalized === null || normalized === canonical) {
      return { ok: false, code: 'DUP_COMMAND', commandLabel: cmd.description };
    }
  }

  return { ok: true };
}
