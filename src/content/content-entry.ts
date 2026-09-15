// Ban toi thieu phase 02 — phase 05 tiep quan (keydown + selection).
// Chay o ISOLATED world. Spike phase 01 da xac minh Translator co mat o day:
// reports/spike-01-translator-context-decision.md
import { isTrustedSender, isExtMessage } from '../shared/messages.js';

const FRAME = window.top === window ? 'top' : 'iframe';
console.log(`[HT] content script ready (${FRAME}) — Translator:`, typeof Translator);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Bat buoc: khong kiem sender.id = extension khac goi vao duoc.
  if (!isTrustedSender(sender) || !isExtMessage(msg)) return false;
  console.log('[HT] message:', msg.type, `(${FRAME})`);
  sendResponse({ handled: false, reason: 'NO_SELECTION' });
  return false;
});
