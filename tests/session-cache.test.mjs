import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionCache, MAX_SESSIONS } from '../src/engine/session-cache.ts';

const fake = () => {
  const destroyed = [];
  let made = 0;
  const create = async (s, t) => {
    made++;
    return { id: `${s}->${t}`, async translate() { return 'x'; }, destroy() { destroyed.push(`${s}->${t}`); } };
  };
  return { create, destroyed, made: () => made };
};

test('tai dung session cho cung cap — khong tao lai', async () => {
  const f = fake();
  const c = createSessionCache(f.create);
  await c.get('vi', 'en');
  await c.get('vi', 'en');
  await c.get('vi', 'en');
  assert.equal(f.made(), 1, 'tao lai moi lan la tra lai chi phi khoi tao moi lan');
});

test('cap khac nhau -> session khac nhau', async () => {
  const f = fake();
  const c = createSessionCache(f.create);
  const a = await c.get('vi', 'en');
  const b = await c.get('en', 'vi');
  assert.notEqual(a.id, b.id);
  assert.equal(c.size, 2);
});

test('TRAN 3 — cap thu 4 day cap cu nhat ra va destroy no', async () => {
  const f = fake();
  const c = createSessionCache(f.create);
  for (const [s, t] of [['vi','en'],['en','vi'],['ja','vi'],['ko','vi']]) await c.get(s, t);
  assert.equal(c.size, MAX_SESSIONS);
  assert.deepEqual(f.destroyed, ['vi->en'], 'phai destroy, khong chi bo tham chieu — model an RAM');
});

test('LRU that: cham vao cap cu day no len cuoi', async () => {
  const f = fake();
  const c = createSessionCache(f.create);
  await c.get('vi', 'en');
  await c.get('en', 'vi');
  await c.get('ja', 'vi');
  await c.get('vi', 'en');   // cham lai cap dau
  await c.get('ko', 'vi');   // day ra cai cu nhat = en->vi
  assert.deepEqual(f.destroyed, ['en->vi']);
});

test('bam phim don dap cung cap -> chi tao MOT session', async () => {
  const f = fake();
  const c = createSessionCache(f.create);
  const [a, b, d] = await Promise.all([c.get('vi','en'), c.get('vi','en'), c.get('vi','en')]);
  assert.equal(f.made(), 1);
  assert.equal(a, b); assert.equal(b, d);
});

test('destroyAll giai phong tat ca — goi khi roi trang', async () => {
  const f = fake();
  const c = createSessionCache(f.create);
  await c.get('vi', 'en');
  await c.get('en', 'vi');
  c.destroyAll();
  assert.equal(c.size, 0);
  assert.equal(f.destroyed.length, 2);
});

test('destroy nem loi khong lam hong cache', async () => {
  const c = createSessionCache(async () => ({
    async translate() { return 'x'; },
    destroy() { throw new Error('session da chet'); },
  }), 1);
  await c.get('vi', 'en');
  await c.get('en', 'vi');
  assert.equal(c.size, 1);
  assert.doesNotThrow(() => c.destroyAll());
});

test('create that bai khong de lai pending ket', async () => {
  let n = 0;
  const c = createSessionCache(async () => {
    n++;
    if (n === 1) throw new Error('loi tam thoi');
    return { async translate() { return 'x'; }, destroy() {} };
  });
  await assert.rejects(() => c.get('vi', 'en'));
  await c.get('vi', 'en');   // lan hai phai thu lai duoc
  assert.equal(c.size, 1);
});
