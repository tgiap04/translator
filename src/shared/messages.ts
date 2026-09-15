// CONTRACT — dong bang sau phase 02. Message service worker <-> content script.

export type TranslateSelectionMsg = {
  type: 'TRANSLATE_SELECTION';
  pairId: string;
  sourceLanguage: string; // BCP-47
  targetLanguage: string;
  requestId: string;
};

export type OpenOptionsMsg = { type: 'OPEN_OPTIONS' };
export type PingMsg = { type: 'PING' };

export type ExtMessage = TranslateSelectionMsg | OpenOptionsMsg | PingMsg;

export type FrameAck = {
  handled: boolean;
  reason?: 'NO_SELECTION' | 'NO_FOCUS' | 'TOO_LONG';
};

export function isExtMessage(m: unknown): m is ExtMessage {
  return !!m && typeof m === 'object' && typeof (m as { type?: unknown }).type === 'string';
}

export function isTranslateSelection(m: unknown): m is TranslateSelectionMsg {
  return isExtMessage(m) && m.type === 'TRANSLATE_SELECTION';
}

/**
 * Moi onMessage listener PHAI goi ham nay truoc.
 * Khong kiem sender.id = extension khac goi vao duoc.
 */
export function isTrustedSender(sender: chrome.runtime.MessageSender): boolean {
  return sender.id === chrome.runtime.id;
}
