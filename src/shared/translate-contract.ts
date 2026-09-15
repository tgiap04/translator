// CONTRACT — dong bang sau phase 02. Ranh gioi giua tooltip (06) va engine (07).

export type TranslateErrorKind =
  | 'NO_API'          // Chrome < 138 hoac khong co Translator
  | 'NEEDS_DOWNLOAD'  // availability = 'downloadable' -> chi duong sang options
  | 'DOWNLOADING'     // availability = 'downloading'
  | 'UNSUPPORTED'     // availability = 'unavailable'
  | 'CREATE_FAILED'
  | 'QUOTA'           // doan vuot gioi han cua bo dich
  | 'ABORTED'         // bi huy — tang tren PHAI im lang
  | 'UNKNOWN';

export class TranslateError extends Error {
  readonly kind: TranslateErrorKind;
  /** Mot goi y hanh dong duy nhat, tieng Viet, hien duoi thong diep. */
  readonly action?: string;

  constructor(kind: TranslateErrorKind, message: string, action?: string) {
    super(message);
    this.name = 'TranslateError';
    this.kind = kind;
    this.action = action;
  }
}

export interface TranslateProvider {
  /** Throw TranslateError. onPartial nhan tung chunk khi streaming kha dung. */
  translate(
    text: string,
    source: string,
    target: string,
    signal: AbortSignal,
    onPartial?: (chunk: string) => void,
  ): Promise<string>;
}

export type TooltipState =
  | { kind: 'PENDING' }
  | { kind: 'OK'; translated: string }
  | { kind: 'ERROR'; message: string; action?: string; actionKind?: 'OPEN_OPTIONS' }
  | { kind: 'TOO_LONG'; length: number; max: number }
  | { kind: 'NO_SELECTION' };

export type TooltipCallbacks = {
  /** User bam doi chieu / doi ngon ngu dich. sourceText giu trong state, KHONG doc lai Selection. */
  onRetryWithPair: (source: string, target: string, sourceText: string) => void;
  onOpenOptions: () => void;
};

export interface TooltipController {
  show(rect: DOMRect, state: TooltipState, meta: { source: string; target: string; sourceText: string }): void;
  update(state: TooltipState): void;
  hide(): void;
  /** True neu node nam trong shadow tree cua tooltip — dung de bo qua keydown cua chinh minh. */
  owns(node: EventTarget | null): boolean;
}
