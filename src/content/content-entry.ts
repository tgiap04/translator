// Diem lap rap cua content script. Chay o ISOLATED world, tren MOI frame.
// Spike phase 01 da xac minh Translator co mat o day:
//   reports/spike-01-translator-context-decision.md
import { getConfig, onConfigChanged } from '../shared/config-store.js';
import { DEFAULT_CONFIG, type AppConfig } from '../shared/config-schema.js';
import { isTrustedSender, isTranslateSelection, type FrameAck } from '../shared/messages.js';
import { installHotkeyListener } from './hotkey-listener.js';
import { createRequestHandler } from './request-handler.js';
import { createNoopTooltip, createNoopProvider } from './noop-adapters.js';

// Content script song theo vong doi trang -> giu state trong bien module la duoc
// (khac service worker, von bi terminate bat cu luc nao).
let cfg: AppConfig = structuredClone(DEFAULT_CONFIG);

const tooltip = createNoopTooltip();
// PHASE 07 DOI DUNG DONG NAY: createNoopProvider() -> createTranslateProvider()
const provider = createNoopProvider();

const handler = createRequestHandler({
  tooltip,
  provider,
  maxChars: () => cfg.max,
});

installHotkeyListener(
  () => cfg,
  (n) => tooltip.owns(n),
  (pair) => void handler.handle({ source: pair.s, target: pair.t, origin: 'hotkey' }),
);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Bat buoc: khong kiem sender.id thi extension khac goi vao duoc.
  if (!isTrustedSender(sender) || !isTranslateSelection(msg)) return false;

  // Service worker gui toi MOI frame. Chi frame dang focus duoc xu ly,
  // neu khong se hien nhieu tooltip cung luc.
  if (!document.hasFocus()) {
    sendResponse({ handled: false, reason: 'NO_FOCUS' } satisfies FrameAck);
    return false;
  }

  void handler.handle({
    source: msg.sourceLanguage,
    target: msg.targetLanguage,
    origin: 'command',
  });
  sendResponse({ handled: true } satisfies FrameAck);
  return false;
});

void (async () => {
  cfg = await getConfig();
  onConfigChanged((next) => {
    cfg = next;
  });
  const frame = window.top === window ? 'top' : 'iframe';
  console.log(`[HT] content script ready (${frame}) — Translator:`, typeof Translator);
})();
