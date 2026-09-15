// Khoa bat bien: request moi phai thang request cu, ke ca khi ket qua ve dao thu tu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequestHandler } from '../src/content/request-handler.ts';

const RECT = { left: 10, top: 20, width: 100, height: 14, bottom: 34, right: 110 };

/** Cho microtask chay het — handle() la async, chua toi provider.translate ngay. */
const tick = () => new Promise((r) => setTimeout(r, 0));

function setupDom(text) {
  const ow = globalThis.window, od = globalThis.document;
  const sel = () => (text === null ? null : {
    isCollapsed: false, rangeCount: 1,
    getRangeAt: () => ({ toString: () => text, getBoundingClientRect: () => RECT, getClientRects: () => [RECT] }),
  });
  // selection-reader.ts doc qua window.getSelection(), khong phai document.
  globalThis.window = { innerWidth: 1200, innerHeight: 800, getSelection: sel };
  globalThis.DOMRect = class { constructor(x, y, w = 0, h = 0) { Object.assign(this, { x, y, width: w, height: h, left: x, top: y }); } };
  globalThis.document = { activeElement: null };
  return {
    restore: () => { globalThis.window = ow; globalThis.document = od; },
    clearSelection: () => { globalThis.window.getSelection = () => null; },
  };
}

function fakeTooltip() {
  const calls = [];
  return {
    calls,
    show: (_r, state) => calls.push(['show', state]),
    update: (state) => calls.push(['update', state]),
    hide: () => calls.push(['hide']),
    owns: () => false,
  };
}
const lastUpdate = (t) => [...t.calls].reverse().find(([k]) => k === 'update')?.[1];

test('REQUEST MOI THANG REQUEST CU du ket qua ve dao thu tu', async () => {
  const dom = setupDom('xin chao');
  const tooltip = fakeTooltip();
  const resolvers = [];
  const provider = { translate: (_t, _s, _g, signal) => new Promise((res, rej) => {
    resolvers.push({ res, rej, signal });
  }) };
  const h = createRequestHandler({ tooltip, provider, maxChars: () => 2000 });

  const p1 = h.handle({ source: 'vi', target: 'en', origin: 'hotkey' });
  await tick();
  const p2 = h.handle({ source: 'vi', target: 'ja', origin: 'hotkey' });
  await tick();

  assert.equal(resolvers[0].signal.aborted, true, 'request cu phai bi abort ngay khi co request moi');

  resolvers[1].res('KET QUA MOI');
  resolvers[0].res('KET QUA CU');   // cu ve SAU
  await Promise.all([p1, p2]);

  assert.equal(lastUpdate(tooltip).translated, 'KET QUA MOI', 'ket qua cu da de len ket qua moi');
  dom.restore();
});

test('cancel() huy viec dang chay — nut dong tooltip', async () => {
  const dom = setupDom('xin chao');
  const tooltip = fakeTooltip();
  let captured;
  const provider = { translate: (_t, _s, _g, signal) => new Promise((res) => { captured = { res, signal }; }) };
  const h = createRequestHandler({ tooltip, provider, maxChars: () => 2000 });
  const p = h.handle({ source: 'vi', target: 'en', origin: 'hotkey' });
  await tick();
  assert.equal(captured.signal.aborted, false);
  h.cancel();
  assert.equal(captured.signal.aborted, true);
  captured.res('ket qua khong ai xem');
  await p;
  assert.equal(lastUpdate(tooltip), undefined, 'da huy thi khong duoc cap nhat tooltip');
  dom.restore();
});

test('vuot nguong -> canh bao voi SO THAT, khong dich, khong am tham cat', async () => {
  const dom = setupDom('x'.repeat(5240));
  const tooltip = fakeTooltip();
  let called = 0;
  const h = createRequestHandler({
    tooltip, maxChars: () => 2000,
    provider: { translate: async () => { called++; return 'k'; } },
  });
  await h.handle({ source: 'vi', target: 'en', origin: 'hotkey' });
  const [, state] = tooltip.calls.find(([k]) => k === 'show');
  assert.equal(state.kind, 'TOO_LONG');
  assert.equal(state.length, 5240, 'phai neu so ky tu THAT');
  assert.equal(state.max, 2000);
  assert.equal(called, 0, 'khong duoc goi dich khi da vuot nguong');
  dom.restore();
});

test('khong boi den: duong hotkey IM LANG, duong command co bao', async () => {
  const dom = setupDom(null);
  const t1 = fakeTooltip();
  const h1 = createRequestHandler({ tooltip: t1, provider: { translate: async () => 'x' }, maxChars: () => 2000 });
  await h1.handle({ source: 'vi', target: 'en', origin: 'hotkey' });
  assert.equal(t1.calls.length, 0, 'bao moi lan go trung phim la gay nhieu');

  const t2 = fakeTooltip();
  const h2 = createRequestHandler({ tooltip: t2, provider: { translate: async () => 'x' }, maxChars: () => 2000 });
  await h2.handle({ source: 'vi', target: 'en', origin: 'command' });
  assert.equal(t2.calls[0][1].kind, 'NO_SELECTION', 'user chu dong bam -> im lang la bo roi ho');
  dom.restore();
});

test('loi engine -> tooltip ERROR, NEEDS_DOWNLOAD kem nut mo cai dat', async () => {
  const dom = setupDom('xin chao');
  const tooltip = fakeTooltip();
  const err = Object.assign(new Error('Chua tai goi'), { kind: 'NEEDS_DOWNLOAD', action: 'Mở cài đặt để tải' });
  const h = createRequestHandler({
    tooltip, maxChars: () => 2000,
    provider: { translate: async () => { throw err; } },
  });
  await h.handle({ source: 'vi', target: 'en', origin: 'hotkey' });
  const s = lastUpdate(tooltip);
  assert.equal(s.kind, 'ERROR');
  assert.equal(s.actionKind, 'OPEN_OPTIONS');
  dom.restore();
});

test('loi ABORTED -> im lang tuyet doi', async () => {
  const dom = setupDom('xin chao');
  const tooltip = fakeTooltip();
  const h = createRequestHandler({
    tooltip, maxChars: () => 2000,
    provider: { translate: async () => { throw Object.assign(new Error(''), { kind: 'ABORTED' }); } },
  });
  await h.handle({ source: 'vi', target: 'en', origin: 'hotkey' });
  assert.equal(lastUpdate(tooltip), undefined);
  dom.restore();
});

test('retryLast dung sourceText da giu — KHONG doc lai Selection', async () => {
  const dom = setupDom('van ban goc');
  const tooltip = fakeTooltip();
  const seen = [];
  const h = createRequestHandler({
    tooltip, maxChars: () => 2000,
    provider: { translate: async (text) => { seen.push(text); return 'ok'; } },
  });
  await h.handle({ source: 'vi', target: 'en', origin: 'hotkey' });
  // Selection bien mat (user bam nut -> mat boi den)
  dom.clearSelection();
  h.retryLast('en', 'vi', 'van ban goc');
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(seen, ['van ban goc', 'van ban goc'], 'retry phai dung text da giu');
  dom.restore();
});

test('chunk streaming cap nhat dan, chunk cua request da huy bi bo', async () => {
  const dom = setupDom('xin chao');
  const tooltip = fakeTooltip();
  let emit;
  const provider = { translate: (_t, _s, _g, signal, onPartial) => new Promise((res) => {
    emit = (c) => onPartial?.(c);
    setTimeout(() => res('xong'), 5);
    void signal;
  }) };
  const h = createRequestHandler({ tooltip, provider, maxChars: () => 2000 });
  const p = h.handle({ source: 'vi', target: 'en', origin: 'hotkey' });
  await tick();
  emit('xi');
  emit('xin ch');
  await p;
  const updates = tooltip.calls.filter(([k]) => k === 'update').map(([, s]) => s.translated);
  assert.deepEqual(updates, ['xi', 'xin ch', 'xong']);
  dom.restore();
});
