// Badge dat THEO TAB de khong day sang tab khac.
import { BADGE, BADGE_TTL_MS, STRINGS } from './background-strings.ts';

type BadgeKind = keyof typeof BADGE;

const TITLE: Record<BadgeKind, string> = {
  noContentScript: STRINGS.badgeNoContentScript,
  missingPair: STRINGS.badgeMissingPair,
};

export async function showBadge(kind: BadgeKind, tabId?: number): Promise<void> {
  const spec = BADGE[kind];
  const scope = typeof tabId === 'number' ? { tabId } : {};
  try {
    await chrome.action.setBadgeText({ ...scope, text: spec.text });
    await chrome.action.setBadgeBackgroundColor({ ...scope, color: spec.color });
    await chrome.action.setTitle({ ...scope, title: TITLE[kind] });
  } catch {
    // Tab da dong giua chung — khong co gi de bao.
    return;
  }
  // Vong doi MV3: worker co the chet truoc khi timeout chay.
  // Do la ly do tabs.onUpdated cung xoa badge — hai duong, khong dua vao mot.
  setTimeout(() => void clearBadge(tabId), BADGE_TTL_MS);
}

export async function clearBadge(tabId?: number): Promise<void> {
  const scope = typeof tabId === 'number' ? { tabId } : {};
  try {
    await chrome.action.setBadgeText({ ...scope, text: '' });
    await chrome.action.setTitle({ ...scope, title: STRINGS.extensionName });
  } catch {
    return;
  }
}
