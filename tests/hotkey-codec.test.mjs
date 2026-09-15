// Contract dong bang — 4 phase song song (03/04/05/07) deu phu thuoc.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fromEvent, reject, parse, format, modifierCount, isForbidden, fromCommandShortcut,
} from '../src/shared/hotkey-codec.ts';

const ev = (code, mods = {}) => ({
  code, ctrlKey: !!mods.ctrl, altKey: !!mods.alt, shiftKey: !!mods.shift, metaKey: !!mods.meta,
});

test('fromEvent giu dung thu tu modifier Ctrl->Alt->Shift->Meta', () => {
  assert.equal(fromEvent(ev('KeyT', { meta: true, shift: true, ctrl: true, alt: true })),
    'Ctrl+Alt+Shift+Meta+KeyT');
  assert.equal(fromEvent(ev('KeyE', { ctrl: true, shift: true })), 'Ctrl+Shift+KeyE');
});

test('fromEvent tra null khi chi bam modifier', () => {
  assert.equal(fromEvent(ev('ShiftLeft', { shift: true })), null);
  assert.equal(fromEvent(ev('ControlRight', { ctrl: true })), null);
});

test('modifierCount — phase 05 dung nguong >=2 trong o nhap lieu', () => {
  assert.equal(modifierCount(ev('KeyE')), 0);
  assert.equal(modifierCount(ev('KeyE', { ctrl: true })), 1);
  assert.equal(modifierCount(ev('KeyE', { ctrl: true, shift: true })), 2);
});

test('reject chan phim tran va Shift-don (go chu la dung ngay)', () => {
  assert.equal(reject(ev('KeyE')), 'NO_MODIFIER');
  assert.equal(reject(ev('KeyE', { shift: true })), 'SHIFT_ONLY');
  assert.equal(reject(ev('ShiftLeft', { shift: true })), 'MODIFIER_ONLY');
});

test('reject chan phim danh cho dismiss tooltip', () => {
  assert.equal(reject(ev('Escape', { ctrl: true })), 'RESERVED');
  assert.equal(reject(ev('Enter', { ctrl: true, alt: true })), 'RESERVED');
});

test('reject chan to hop cua trinh duyet va OS', () => {
  for (const c of ['Ctrl+KeyT', 'Meta+KeyW', 'Ctrl+KeyA', 'Meta+KeyQ', 'Ctrl+Shift+KeyI', 'Ctrl+Digit1'])
    assert.ok(isForbidden(c), `phai cam: ${c}`);
  assert.equal(reject(ev('KeyT', { ctrl: true })), 'FORBIDDEN');
  assert.equal(reject(ev('KeyI', { ctrl: true, shift: true })), 'FORBIDDEN');
});

test('reject cho qua to hop 2 modifier an toan', () => {
  assert.equal(reject(ev('KeyE', { ctrl: true, shift: true })), null);
  assert.equal(reject(ev('Digit1', { alt: true, shift: true })), null);
});

test('parse doi xung voi fromEvent', () => {
  const c = fromEvent(ev('KeyE', { ctrl: true, shift: true }));
  assert.deepEqual(parse(c), { mods: ['Ctrl', 'Shift'], code: 'KeyE' });
  assert.equal(parse('Bogus+KeyE'), null);
  assert.equal(parse(''), null);
});

test('format bo tien to Key/Digit cho nguoi doc', () => {
  assert.match(format('Ctrl+Shift+KeyE'), /E$/);
  assert.match(format('Alt+Shift+Digit1'), /1$/);
  assert.equal(format('rac-khong-parse-duoc'), 'rac-khong-parse-duoc');
});

test('fromCommandShortcut chuan hoa output cua chrome.commands.getAll', () => {
  // Khong chuan hoa la bo sot xung dot giua lenh tinh va hotkey dong.
  assert.equal(fromCommandShortcut('Alt+Shift+1'), 'Alt+Shift+Digit1');
  assert.equal(fromCommandShortcut('Ctrl+Shift+E'), 'Ctrl+Shift+KeyE');
  assert.equal(fromCommandShortcut('Command+Shift+E'), 'Shift+Meta+KeyE');
  assert.equal(fromCommandShortcut('Bogus+E'), null);
});

test('lenh tinh mac dinh KHONG roi vao danh sach cam', () => {
  for (const s of ['Alt+Shift+1', 'Alt+Shift+2', 'Alt+Shift+0'])
    assert.equal(isForbidden(fromCommandShortcut(s)), false, `${s} khong duoc cam`);
});
