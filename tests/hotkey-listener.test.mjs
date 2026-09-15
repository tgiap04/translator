// Khoa bat bien TE NHAT san pham nay co the vi pham: cuop phim cua trang.
// Neu mot refactor sau nay doi preventDefault len truoc buoc khop, test nay phai do.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installHotkeyListener } from '../src/content/hotkey-listener.ts';

function harness(pairs) {
  const listeners = [];
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  globalThis.window = {
    addEventListener: (t, h, o) => listeners.push({ t, h, o }),
    removeEventListener: (t, h) => {
      const i = listeners.findIndex((l) => l.t === t && l.h === h);
      if (i >= 0) listeners.splice(i, 1);
    },
  };
  globalThis.document = { activeElement: null };
  const hits = [];
  const off = installHotkeyListener(
    () => ({ v: 1, max: 2000, pairs }),
    () => false,
    (pair) => hits.push(pair),
  );
  const entry = listeners.find((l) => l.t === 'keydown');
  return {
    entry, hits, off, listeners,
    restore: () => { globalThis.window = originalWindow; globalThis.document = originalDocument; },
  };
}

const key = (code, m = {}) => {
  let prevented = 0, stopped = 0;
  return {
    code, ctrlKey: !!m.ctrl, altKey: !!m.alt, shiftKey: !!m.shift, metaKey: !!m.meta,
    repeat: !!m.repeat, isComposing: !!m.composing, keyCode: 0, target: null,
    preventDefault() { prevented++; }, stopPropagation() { stopped++; },
    get prevented() { return prevented; }, get stopped() { return stopped; },
  };
};

const PAIRS = [{ id: 'a', s: 'vi', t: 'en', k: 'Ctrl+Shift+KeyE' }];

test('dang ky listener o CAPTURE phase', () => {
  const h = harness(PAIRS);
  assert.equal(h.entry.t, 'keydown');
  assert.equal(h.entry.o?.capture, true, 'bubble phase la thay su kien sau trang -> vo dung');
  h.restore();
});

test('KHONG preventDefault khi phim khong khop — bat bien quan trong nhat', () => {
  const h = harness(PAIRS);
  for (const e of [
    key('KeyB', { ctrl: true }),            // Ctrl+B cua Google Docs
    key('KeyK', { ctrl: true, shift: true }),
    key('KeyE'),                             // go chu thuong
    key('Enter'),
    key('KeyE', { ctrl: true }),             // dung phim, thieu modifier
  ]) {
    h.entry.h(e);
    assert.equal(e.prevented, 0, `da cuop phim: ${e.code}`);
    assert.equal(e.stopped, 0, `da chan lan truyen: ${e.code}`);
  }
  assert.equal(h.hits.length, 0);
  h.restore();
});

test('CO preventDefault khi phim khop', () => {
  const h = harness(PAIRS);
  const e = key('KeyE', { ctrl: true, shift: true });
  h.entry.h(e);
  assert.equal(e.prevented, 1);
  assert.equal(e.stopped, 1);
  assert.equal(h.hits.length, 1);
  assert.equal(h.hits[0].s, 'vi');
  h.restore();
});

test('guard chan truoc khi khop: repeat / IME khong duoc cuop phim', () => {
  const h = harness(PAIRS);
  for (const e of [
    key('KeyE', { ctrl: true, shift: true, repeat: true }),
    key('KeyE', { ctrl: true, shift: true, composing: true }),
  ]) {
    h.entry.h(e);
    assert.equal(e.prevented, 0);
  }
  assert.equal(h.hits.length, 0);
  h.restore();
});

test('config rong -> khong phim nao bi cuop', () => {
  const h = harness([]);
  const e = key('KeyE', { ctrl: true, shift: true });
  h.entry.h(e);
  assert.equal(e.prevented, 0);
  h.restore();
});

test('cap khong co hotkey (k=null, di duong commands) khong khop keydown', () => {
  const h = harness([{ id: 'a', s: 'vi', t: 'en', k: null, c: 1 }]);
  h.entry.h(key('KeyE', { ctrl: true, shift: true }));
  assert.equal(h.hits.length, 0);
  h.restore();
});

test('go doi config -> khop theo config MOI, khong phai ban chup luc cai dat', () => {
  const listeners = [];
  const ow = globalThis.window, od = globalThis.document;
  globalThis.window = { addEventListener: (t, h, o) => listeners.push({ t, h, o }), removeEventListener() {} };
  globalThis.document = { activeElement: null };
  let cfg = { v: 1, max: 2000, pairs: [] };
  const hits = [];
  installHotkeyListener(() => cfg, () => false, (p) => hits.push(p));
  const handler = listeners[0].h;
  handler(key('KeyE', { ctrl: true, shift: true }));
  assert.equal(hits.length, 0);
  cfg = { v: 1, max: 2000, pairs: PAIRS };
  handler(key('KeyE', { ctrl: true, shift: true }));
  assert.equal(hits.length, 1, 'phai doc config moi lan, khong cache');
  globalThis.window = ow; globalThis.document = od;
});

test('ham huy dang ky go listener that', () => {
  const h = harness(PAIRS);
  assert.equal(h.listeners.length, 1);
  h.off();
  assert.equal(h.listeners.length, 0, 'ro listener tren SPA song lau');
  h.restore();
});
