// Diem lap rap cua content script. Chay o ISOLATED world, tren MOI frame.
// Spike phase 01 da xac minh Translator co mat o day:
//   reports/spike-01-translator-context-decision.md
import { getConfig, onConfigChanged } from '../shared/config-store.js';
import { DEFAULT_CONFIG, type AppConfig } from '../shared/config-schema.js';
import { languageName } from '../shared/language-catalog.js';
import { isTrustedSender, isTranslateSelection, type FrameAck } from '../shared/messages.js';
import { installHotkeyListener } from './hotkey-listener.js';
import { createRequestHandler } from './request-handler.js';
import { createTooltipController } from './tooltip/tooltip-controller.js';
import { createTranslateProvider } from '../engine/translate-provider.js';

// Content script song theo vong doi trang -> giu state trong bien module la duoc
// (khac service worker, von bi terminate bat cu luc nao).
let cfg: AppConfig = structuredClone(DEFAULT_CONFIG);

/**
 * Ngon ngu dich cho dropdown PHAI den tu cau hinh cua nguoi dung:
 * doi sang mot cap ho chua tai pack la dan ho vao loi.
 */
function targetLangs(): ReadonlyArray<{ code: string; label: string }> {
  const seen = new Map<string, string>();
  for (const p of cfg.pairs) if (!seen.has(p.t)) seen.set(p.t, languageName(p.t));
  return [...seen].map(([code, label]) => ({ code, label }));
}

const tooltip = createTooltipController(
  {
    onRetryWithPair: (source, target, sourceText) => {
      handler.retryLast(source, target, sourceText);
    },
    onOpenOptions: () => {
      // Content script khong tu mo tab duoc — phai nho service worker.
      void chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
    },
  },
  targetLangs,
);

const provider = createTranslateProvider();

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
