// Khoa hanh vi: cap gan slot lenh phai SUA duoc, va KHONG duoc mat truong c.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, DEFAULT_CONFIG, MAX_PAIRS } from '../src/shared/config-schema.ts';
import { routeCommand } from '../src/background/command-router.ts';

test('cap mac dinh mang ca slot lenh lan phim rieng -> CA HAI duong deu chay', () => {
  // Hai duong dinh tuyen doc lap: router tim theo c, keydown tim theo k.
  const pair = { id: 'vi2en0', s: 'vi', t: 'en', k: 'Ctrl+Shift+KeyE', c: 1 };
  const cfg = { v: 1, max: 2000, pairs: [pair] };

  // Duong lenh co dinh van hoat dong du da co phim rieng
  assert.deepEqual(routeCommand('translate-vi-en', cfg), {
    action: 'send', pairId: 'vi2en0', sourceLanguage: 'vi', targetLanguage: 'en',
  });
  // Duong keydown tim thay cung cap do
  assert.equal(cfg.pairs.find((p) => p.k === 'Ctrl+Shift+KeyE')?.id, 'vi2en0');
});

test('doi ngon ngu cua cap gan slot -> lenh co dinh dich theo ngon ngu moi', () => {
  const cfg = { v: 1, max: 2000, pairs: [{ id: 'vi2en0', s: 'ja', t: 'vi', k: null, c: 1 }] };
  assert.deepEqual(routeCommand('translate-vi-en', cfg), {
    action: 'send', pairId: 'vi2en0', sourceLanguage: 'ja', targetLanguage: 'vi',
  });
});

test('LAM ROI truong c la phim co dinh thanh vo tac dung', () => {
  // Day chinh la loi ma ban sua editor phai chan.
  const stripped = { v: 1, max: 2000, pairs: [{ id: 'vi2en0', s: 'vi', t: 'en', k: 'Ctrl+Shift+KeyE' }] };
  assert.deepEqual(routeCommand('translate-vi-en', stripped), { action: 'badge', kind: 'missingPair' });
});

test('phim rieng la TUY CHON voi cap gan slot — k=null van route duoc', () => {
  const cfg = { v: 1, max: 2000, pairs: [{ id: 'vi2en0', s: 'vi', t: 'en', k: null, c: 1 }] };
  assert.equal(routeCommand('translate-vi-en', cfg).action, 'send');
});

test('normalizeConfig giu nguyen c qua mot vong doc/ghi storage', () => {
  const round = normalizeConfig(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
  assert.deepEqual(round.pairs.map((p) => p.c), [1, 2]);
});

test('normalizeConfig chan tran va loai k sai kieu', () => {
  const junk = { v: 1, max: 2000, pairs: [
    ...Array.from({ length: 25 }, (_, i) => ({ id: `p${i}`, s: 'vi', t: 'en', k: null })),
    { id: 'bad', s: 'vi', t: 'en', k: { rac: true } },
  ] };
  const out = normalizeConfig(junk);
  assert.equal(out.pairs.length, MAX_PAIRS);
  assert.ok(out.pairs.every((p) => p.k === null || typeof p.k === 'string'));
});
