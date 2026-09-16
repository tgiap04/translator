// Harness mo phong DUNG day noi cua content-entry.ts, de bat loi o cho ghep.
import { createTooltipController } from '../src/content/tooltip/tooltip-controller.ts';
import { createRequestHandler } from '../src/content/request-handler.ts';
import type { TranslateProvider } from '../src/shared/translate-contract.ts';

const LANGS = [{ code: 'en', label: 'English' }, { code: 'vi', label: 'Tieng Viet' }];

const fakeProvider: TranslateProvider = {
  async translate(text, _s, _t, signal, onPartial) {
    await new Promise((r) => setTimeout(r, 120));
    if (signal.aborted) throw Object.assign(new Error(''), { kind: 'ABORTED' });
    onPartial?.('dang dich...');
    await new Promise((r) => setTimeout(r, 120));
    return `[dich] ${text}`;
  },
};

const LOG: string[] = [];
(window as unknown as Record<string, unknown>).__log = LOG;
window.addEventListener('unhandledrejection', (e) => LOG.push('UNHANDLED: ' + String((e as PromiseRejectionEvent).reason)));
window.addEventListener('error', (e) => LOG.push('ERROR: ' + String((e as ErrorEvent).message)));

const tooltip = createTooltipController(
  {
    onRetryWithPair: (s, t, txt) => handler.retryLast(s, t, txt),
    onHide: () => { LOG.push('onHide'); handler.cancel(); },
    onOpenOptions: () => console.log('open options'),
  },
  () => LANGS,
);

const handler = createRequestHandler({
  tooltip,
  provider: fakeProvider,
  maxChars: () => 2000,
});

// Phoi bay ra window de puppeteer lai duoc
(window as unknown as Record<string, unknown>).__harness = {
  translate: () => { LOG.push('--- translate() goi ---'); return handler.handle({ source: 'en', target: 'vi', origin: 'command' }).catch((e) => LOG.push('handle REJECT: ' + String(e))); },
  hide: () => tooltip.hide(),
};
console.log('[wiring-harness] san sang');
