// Ham THUAN: quyet dinh lam gi voi mot command, khong gay tac dung phu.
// Tach quyet dinh khoi tac dung phu -> test duoc khong can Chrome.
import type { AppConfig } from '../shared/config-schema.js';

export type RouteDecision =
  | { action: 'options'; anchor?: string }
  | { action: 'send'; pairId: string; sourceLanguage: string; targetLanguage: string }
  | { action: 'badge'; kind: 'missingPair' };

/** Ten command trong manifest -> command slot. Chi 2 slot dich duoc khai bao. */
const SLOT_BY_COMMAND: Record<string, 1 | 2> = {
  'translate-vi-en': 1,
  'translate-en-vi': 2,
};

export function routeCommand(commandName: string, cfg: AppConfig): RouteDecision {
  if (commandName === 'open-options') return { action: 'options' };

  const slot = SLOT_BY_COMMAND[commandName];
  if (!slot) return { action: 'options' };

  const pair = cfg.pairs.find((p) => p.c === slot);
  // User co the da xoa cap gan voi slot nay o options page.
  if (!pair) return { action: 'badge', kind: 'missingPair' };

  return {
    action: 'send',
    pairId: pair.id,
    sourceLanguage: pair.s,
    targetLanguage: pair.t,
  };
}
