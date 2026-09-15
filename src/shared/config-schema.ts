// CONTRACT — dong bang sau phase 02. Doi hinh dang = breaking change, phai bao.
// Nguon: phase-03 § Architecture "Schema chrome.storage.sync".

/** Mot cap ngon ngu gan voi mot to hop phim. Ten field viet tat co chu dich (quota storage.sync). */
export type LangPair = {
  /** 6 ky tu, crypto.randomUUID().slice(0,6) */
  id: string;
  /** sourceLanguage, BCP-47 */
  s: string;
  /** targetLanguage, BCP-47 */
  t: string;
  /** hotkey canonical ('Ctrl+Shift+KeyE'); null = di qua chrome.commands */
  k: string | null;
  /** rang buoc vao command slot 1|2; vang mat = cap dong */
  c?: 1 | 2;
};

export type AppConfig = {
  /** version schema, cho migrate */
  v: 1;
  /** tran mem 20 cap */
  pairs: LangPair[];
  /** nguong ky tu toi da (phase 05) */
  max: number;
};

export const STORAGE_KEY = 'cfg';

/** Tran mem — options page chan them khi vuot. */
export const MAX_PAIRS = 20;

export const DEFAULT_CONFIG: AppConfig = {
  v: 1,
  max: 2000,
  pairs: [
    { id: 'vi2en0', s: 'vi', t: 'en', k: null, c: 1 },
    { id: 'en2vi0', s: 'en', t: 'vi', k: null, c: 2 },
  ],
};

/** Ep du lieu doc tu storage ve dung hinh dang. Storage co the chua rac tu ban cu. */
export function normalizeConfig(raw: unknown): AppConfig {
  if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_CONFIG);
  const o = raw as Partial<AppConfig>;
  const pairs = Array.isArray(o.pairs)
    ? o.pairs.filter(
        (p): p is LangPair =>
          !!p && typeof p.id === 'string' && typeof p.s === 'string' && typeof p.t === 'string',
      )
    : structuredClone(DEFAULT_CONFIG.pairs);
  const max = typeof o.max === 'number' && o.max > 0 ? o.max : DEFAULT_CONFIG.max;
  return { v: 1, pairs, max };
}
