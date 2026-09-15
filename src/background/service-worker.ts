// Service worker: CHI DINH TUYEN.
//
// CANH BAO: Translator API KHONG ton tai trong service worker — chi o top-level
// window va same-origin iframe (xac minh: reports/spike-01-translator-context-decision.md).
// Moi loi goi Translator o day nem ReferenceError. Viec dich nam o content script (phase 07).
//
// Vong doi MV3: worker bi terminate bat cu luc nao. KHONG giu state trong bien
// toan cuc — doc lai config moi lan can. Listener phai dang ky DONG BO o top-level.
import { getConfig, setConfig } from '../shared/config-store.ts';
import { DEFAULT_CONFIG } from '../shared/config-schema.ts';
import type { TranslateSelectionMsg } from '../shared/messages.ts';
import { isTrustedSender, isExtMessage } from '../shared/messages.ts';
import { routeCommand } from './command-router.ts';
import { showBadge, clearBadge } from './badge-notifier.ts';

chrome.runtime.onInstalled.addListener((details) => {
  void (async () => {
    if (details.reason !== 'install') return;
    const existing = await chrome.storage.sync.get('cfg');
    if (existing?.['cfg']) return;
    await setConfig(structuredClone(DEFAULT_CONFIG));
  })();
});

chrome.commands.onCommand.addListener((command) => {
  void handleCommand(command);
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// Dieu huong tab -> badge cu khong con y nghia.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) void clearBadge(tabId);
});

// Content script xin mo options (nut "Mo cai dat de tai" trong tooltip):
// content script KHONG tu mo tab duoc.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!isTrustedSender(sender) || !isExtMessage(msg)) return false;
  if (msg.type === 'OPEN_OPTIONS') chrome.runtime.openOptionsPage();
  return false;
});

async function handleCommand(command: string): Promise<void> {
  const cfg = await getConfig();
  const decision = routeCommand(command, cfg);

  if (decision.action === 'options') {
    chrome.runtime.openOptionsPage();
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

  if (decision.action === 'badge') {
    await showBadge(decision.kind, tab?.id);
    chrome.runtime.openOptionsPage();
    return;
  }

  if (typeof tab?.id !== 'number') {
    await showBadge('noContentScript');
    return;
  }

  const payload: TranslateSelectionMsg = {
    type: 'TRANSLATE_SELECTION',
    pairId: decision.pairId,
    sourceLanguage: decision.sourceLanguage,
    targetLanguage: decision.targetLanguage,
    requestId: crypto.randomUUID(),
  };

  try {
    // Gui toi MOI frame cua tab; frame nao dang focus va co selection thi xu ly.
    await chrome.tabs.sendMessage(tab.id, payload);
  } catch {
    // Khong co content script: chrome://, PDF viewer, Web Store.
    await showBadge('noContentScript', tab.id);
  }
}
