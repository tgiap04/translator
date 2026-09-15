// Phu du 3 huong xung dot cua hotkey-conflict-validator.check + truong hop sua chinh no.
// check() la leaf module (khong import gia tri) nen isForbidden/fromCommandShortcut cua
// hotkey-codec.ts (CONTRACT) duoc tiem vao truc tiep o day — giong cach pair-editor-view.ts
// lam o runtime that.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../src/options/hotkey-conflict-validator.ts';
import { isForbidden, fromCommandShortcut } from '../src/shared/hotkey-codec.ts';

const CODEC = { isForbidden, fromCommandShortcut };

const config = {
  pairs: [
    { id: 'aaa001', s: 'vi', t: 'en', k: 'Ctrl+Shift+KeyE' },
    { id: 'bbb002', s: 'en', t: 'ja', k: 'Ctrl+Shift+KeyJ' },
  ],
};

const commands = [
  { name: 'translate-vi-en', shortcut: 'Alt+Shift+1', description: 'Dịch Việt → Anh' },
  { name: 'translate-en-vi', shortcut: 'Alt+Shift+2', description: 'Dịch Anh → Việt' },
  { name: 'open-options', shortcut: '', description: 'Mở cài đặt' },
];

test('OK khi to hop moi khong dung ai', () => {
  const result = check('Ctrl+Shift+KeyF', config, null, commands, CODEC);
  assert.deepEqual(result, { ok: true });
});

test('FORBIDDEN chan to hop thuoc trinh duyet/OS', () => {
  const result = check('Ctrl+KeyC', config, null, commands, CODEC);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'FORBIDDEN');
});

test('DUP_PAIR chan trung cap dong khac va chi dich danh cap do', () => {
  const result = check('Ctrl+Shift+KeyE', config, null, commands, CODEC);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'DUP_PAIR');
  assert.equal(result.pairLabel, 'vi → en');
});

test('DUP_PAIR bo qua chinh cap dang sua (editingId)', () => {
  const result = check('Ctrl+Shift+KeyE', config, 'aaa001', commands, CODEC);
  assert.deepEqual(result, { ok: true });
});

test('DUP_COMMAND chan trung chrome.commands sau khi chuan hoa Alt+Shift+1 -> Digit1', () => {
  const result = check('Alt+Shift+Digit1', config, null, commands, CODEC);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'DUP_COMMAND');
  assert.equal(result.commandLabel, 'Dịch Việt → Anh');
});

test('lenh chua gan phim (shortcut rong) khong gay xung dot', () => {
  const result = check('Ctrl+Shift+KeyQ', config, null, commands, CODEC);
  assert.deepEqual(result, { ok: true });
});

test('fail-safe: shortcut khong chuan hoa duoc bi coi la xung dot', () => {
  const withBogus = [...commands, { name: 'weird', shortcut: 'Bogus+E', description: 'La' }];
  const result = check('Ctrl+Shift+KeyF', config, null, withBogus, CODEC);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'DUP_COMMAND');
});
