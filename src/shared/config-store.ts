// CONTRACT — dong bang sau phase 02. Boc chrome.storage.sync.
import { STORAGE_KEY, DEFAULT_CONFIG, normalizeConfig, type AppConfig } from './config-schema.js';

export async function getConfig(): Promise<AppConfig> {
  try {
    const got = await chrome.storage.sync.get(STORAGE_KEY);
    return normalizeConfig(got?.[STORAGE_KEY]);
  } catch {
    // Storage hong (quota, profile loi) — chay tiep voi mac dinh con hon chet.
    return structuredClone(DEFAULT_CONFIG);
  }
}

export async function setConfig(cfg: AppConfig): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: cfg });
}

/** Tra ve ham huy dang ky. */
export function onConfigChanged(cb: (cfg: AppConfig) => void): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ): void => {
    if (area !== 'sync' || !(STORAGE_KEY in changes)) return;
    cb(normalizeConfig(changes[STORAGE_KEY]?.newValue));
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
