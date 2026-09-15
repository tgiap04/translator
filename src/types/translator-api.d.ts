// Khai bao ambient cho Chrome built-in Translator API (Chrome 138+).
// TypeScript chua co kieu san cho API nay.
// Xac minh thuc nghiem: reports/spike-01-translator-context-decision.md

export {};

/** 4 gia tri — gop lai thanh "loi" la vut di thong tin nguoi dung can. */
type TranslatorAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

interface TranslatorLanguageOptions {
  sourceLanguage: string; // BCP-47
  targetLanguage: string; // BCP-47
}

interface DownloadProgressEvent extends Event {
  readonly loaded: number;
  readonly total: number;
}

interface CreateMonitor extends EventTarget {
  addEventListener(
    type: 'downloadprogress',
    listener: (ev: DownloadProgressEvent) => void,
    options?: AddEventListenerOptions | boolean,
  ): void;
}

interface TranslatorCreateOptions extends TranslatorLanguageOptions {
  /** Chay khi can tai language pack. Doi user gesture neu availability != 'available'. */
  monitor?: (m: CreateMonitor) => void;
  signal?: AbortSignal;
}

interface TranslatorSession {
  translate(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  translateStreaming(input: string, options?: { signal?: AbortSignal }): ReadableStream<string>;
  destroy(): void;
}

interface LanguageDetectorSession {
  detect(input: string): Promise<Array<{ detectedLanguage: string; confidence: number }>>;
  destroy(): void;
}

declare global {
  const Translator: {
    availability(options: TranslatorLanguageOptions): Promise<TranslatorAvailability>;
    create(options: TranslatorCreateOptions): Promise<TranslatorSession>;
  };

  /** Co mat tu Chrome 138+. Chua dung o v1 — danh cho auto-detect o v2. */
  const LanguageDetector: {
    availability(options: { expectedInputLanguages?: string[] }): Promise<TranslatorAvailability>;
    create(options?: { monitor?: (m: CreateMonitor) => void }): Promise<LanguageDetectorSession>;
  };

  type TranslatorAvailabilityValue = TranslatorAvailability;
  type TranslatorSessionHandle = TranslatorSession;
  type TranslatorDownloadProgress = DownloadProgressEvent;
}
