// Ban toi thieu phase 02 — phase 03 tiep quan (CRUD cap ngon ngu + tai pack).
// Day la cua DUY NHAT duoc tai language pack: chi o day moi co user gesture hop le.
// Xac minh thuc nghiem (phase 01): Translator.create() nem
//   NotAllowedError: Requires a user gesture when availability is "downloadable".
import { getConfig } from '../shared/config-store.js';
import { format } from '../shared/hotkey-codec.js';

async function boot(): Promise<void> {
  const cfg = await getConfig();
  const boot = document.getElementById('boot');
  if (!boot) return;
  const lines = cfg.pairs.map(
    (p) => `${p.s} → ${p.t} · ${p.k ? format(p.k) : `lệnh cố định #${p.c ?? '-'}`}`,
  );
  boot.textContent = `Đã nạp ${cfg.pairs.length} cặp: ${lines.join(' | ')}`;
}

void boot();
