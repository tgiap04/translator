import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isEditable, modifierCount, shouldIgnore } from '../src/content/input-guard.ts';

const el = (tagName, attrs = {}) => ({
  tagName,
  getAttribute: (n) => attrs[n] ?? null,
  closest: (sel) => (attrs.__ce && sel.includes('contenteditable') ? {} : null),
});
const ev = (m = {}) => ({
  ctrlKey: !!m.ctrl, altKey: !!m.alt, shiftKey: !!m.shift, metaKey: !!m.meta,
  repeat: !!m.repeat, isComposing: !!m.composing, keyCode: m.keyCode ?? 0, code: m.code ?? 'KeyE',
});

test('isEditable nhan dung o nhap van ban', () => {
  assert.equal(isEditable(el('TEXTAREA')), true);
  assert.equal(isEditable(el('INPUT')), true);
  assert.equal(isEditable(el('INPUT', { type: 'text' })), true);
  assert.equal(isEditable(el('INPUT', { type: 'search' })), true);
  assert.equal(isEditable(el('DIV', { __ce: true })), true);
});

test('isEditable loai <input> khong phai o nhap van ban', () => {
  for (const type of ['checkbox', 'radio', 'range', 'color', 'file', 'submit'])
    assert.equal(isEditable(el('INPUT', { type })), false, `input[type=${type}]`);
});

test('isEditable khong nham the thuong va null', () => {
  assert.equal(isEditable(el('DIV')), false);
  assert.equal(isEditable(el('P')), false);
  assert.equal(isEditable(null), false);
});

test('giu phim khong ban nhieu lan dich', () => {
  assert.equal(shouldIgnore(ev({ ctrl: true, shift: true, repeat: true }), null, false), 'REPEAT');
});

test('IME tieng Viet dang soan -> bo qua (ca hai tin hieu)', () => {
  assert.equal(shouldIgnore(ev({ ctrl: true, shift: true, composing: true }), null, false), 'COMPOSING');
  assert.equal(shouldIgnore(ev({ ctrl: true, shift: true, keyCode: 229 }), null, false), 'COMPOSING');
});

test('su kien phat tu trong tooltip cua chinh minh -> bo qua', () => {
  assert.equal(shouldIgnore(ev({ ctrl: true, shift: true }), null, true), 'OWN_TOOLTIP');
});

test('NGUONG >=2 MODIFIER trong o nhap lieu — chan cuop phim Gmail/Docs/Notion', () => {
  const ta = el('TEXTAREA');
  assert.equal(shouldIgnore(ev({ ctrl: true }), ta, false), 'EDITABLE_WEAK_COMBO');
  assert.equal(shouldIgnore(ev({ shift: true }), ta, false), 'EDITABLE_WEAK_COMBO');
  assert.equal(shouldIgnore(ev({ ctrl: true, shift: true }), ta, false), null);
  assert.equal(shouldIgnore(ev({ ctrl: true, alt: true }), ta, false), null);
});

test('ngoai o nhap lieu, 1 modifier van duoc di tiep', () => {
  assert.equal(shouldIgnore(ev({ ctrl: true }), el('DIV'), false), null);
});

test('thu tu uu tien guard: repeat truoc composing truoc editable', () => {
  const ta = el('TEXTAREA');
  assert.equal(shouldIgnore(ev({ ctrl: true, repeat: true, composing: true }), ta, true), 'REPEAT');
  assert.equal(shouldIgnore(ev({ ctrl: true, composing: true }), ta, true), 'COMPOSING');
});

test('modifierCount dem dung', () => {
  assert.equal(modifierCount(ev()), 0);
  assert.equal(modifierCount(ev({ ctrl: true, alt: true, shift: true, meta: true })), 4);
});
