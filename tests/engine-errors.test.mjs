import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, fromAvailability, pairLabel } from '../src/engine/errors.ts';

test('pairLabel hien thi cho nguoi doc', () => {
  assert.equal(pairLabel('vi', 'en'), 'VI → EN');
});

test('4 gia tri availability KHONG bi gop thanh 2', () => {
  assert.equal(fromAvailability('ready', 'vi', 'en'), null);
  const kinds = ['no-api', 'needs-download', 'downloading', 'unsupported']
    .map((s) => fromAvailability(s, 'vi', 'en').kind);
  assert.deepEqual(kinds, ['NO_API', 'NEEDS_DOWNLOAD', 'DOWNLOADING', 'UNSUPPORTED']);
  // Moi loai phai co thong diep RIENG — gop lai la vut di thong tin user can.
  assert.equal(new Set(kinds).size, 4);
});

test('chua tai pack va khong ho tro la HAI thong diep khac nhau', () => {
  const dl = fromAvailability('needs-download', 'vi', 'en');
  const un = fromAvailability('unsupported', 'vi', 'km');
  assert.notEqual(dl.message, un.message);
  assert.equal(dl.openOptions, true, 'chua tai -> phai co nut mo cai dat');
  assert.notEqual(un.openOptions, true, 'khong ho tro -> mo cai dat vo ich');
  assert.match(dl.message, /VI → EN/);
  assert.match(un.message, /VI → KM/);
});

test('huy -> ABORTED, tang tren im lang', () => {
  const d = classify({ name: 'AbortError', message: 'aborted' }, 'translate');
  assert.equal(d.kind, 'ABORTED');
  assert.equal(d.message, '');
});

test('NotAllowedError (thieu user gesture) -> chi duong sang options', () => {
  // Day la loi THAT quan sat duoc o spike phase 01.
  const d = classify({ name: 'NotAllowedError', message: 'Requires a user gesture' }, 'create');
  assert.equal(d.kind, 'NEEDS_DOWNLOAD');
  assert.equal(d.openOptions, true);
});

test('quota nhan dien qua ca ten loi lan noi dung', () => {
  assert.equal(classify({ name: 'QuotaExceededError' }, 'translate').kind, 'QUOTA');
  assert.equal(classify({ name: 'Error', message: 'input too large' }, 'translate').kind, 'QUOTA');
});

test('loi la phan biet theo giai doan create/translate', () => {
  assert.equal(classify({ name: 'Weird' }, 'create').kind, 'CREATE_FAILED');
  assert.equal(classify({ name: 'Weird' }, 'translate').kind, 'UNKNOWN');
});

test('dau vao rac khong lam no nem', () => {
  for (const bad of [null, undefined, 'chuoi', 42, {}])
    assert.ok(classify(bad, 'translate').kind, `phai xu ly duoc: ${String(bad)}`);
});

test('moi mo ta co dung MOT goi y hanh dong (tru ABORTED)', () => {
  const ds = [
    fromAvailability('no-api', 'vi', 'en'), fromAvailability('needs-download', 'vi', 'en'),
    fromAvailability('unsupported', 'vi', 'en'), classify({ name: 'X' }, 'create'),
  ];
  for (const d of ds) assert.ok(d.action && d.action.length > 0, `thieu action: ${d.kind}`);
});
