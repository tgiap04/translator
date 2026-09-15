// Phu cong thuc dinh vi tooltip: du cho duoi, chat duoi -> lat len, chat ca hai
// -> kep, tran trai, tran phai, selection rong hon tooltip, selection rong hon viewport.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { place } from '../src/content/tooltip/tooltip-position.ts';

const VIEWPORT = { width: 1280, height: 800 };
const NO_SCROLL = { x: 0, y: 0 };
const SIZE = { width: 320, height: 200 };
const MARGIN = 8;

function rect({ top, left, width = 100, height = 20 }) {
  return { top, left, width, height, bottom: top + height };
}

test('du cho duoi selection -> dat ngay duoi selection, khong lat', () => {
  const r = rect({ top: 100, left: 500 });
  const pos = place(r, SIZE, VIEWPORT, NO_SCROLL, MARGIN);
  assert.equal(pos.top, r.bottom + MARGIN);
});

test('chat duoi nhung du tren -> lat len tren selection', () => {
  // spaceBelow = 800 - 750 = 50 < 200+8 -> lat len
  const r = rect({ top: 700, left: 500, height: 50 });
  const pos = place(r, SIZE, VIEWPORT, NO_SCROLL, MARGIN);
  assert.equal(pos.top, r.top - SIZE.height - MARGIN);
  assert.ok(pos.top < r.top, 'phai nam tren selection');
});

test('chat ca hai phia -> kep trong viewport, uu tien phia duoi', () => {
  // viewport that thap: 250px, tooltip cao 200 -> khong ben nao du 200+8
  const shortViewport = { width: 1280, height: 250 };
  const r = rect({ top: 100, left: 500, height: 20 });
  const pos = place(r, SIZE, shortViewport, NO_SCROLL, MARGIN);
  assert.ok(pos.top >= MARGIN, 'khong duoc tran len tren mep');
  assert.ok(pos.top <= shortViewport.height - SIZE.height - MARGIN + 0.001, 'khong duoc tran xuong duoi mep');
});

test('selection sat mep trai -> tooltip kep vao trong, khong am', () => {
  const r = rect({ top: 100, left: 0, width: 20 });
  const pos = place(r, SIZE, VIEWPORT, NO_SCROLL, MARGIN);
  assert.equal(pos.left, MARGIN);
});

test('selection sat mep phai -> tooltip kep vao trong, khong tran ngang', () => {
  const r = rect({ top: 100, left: 1260, width: 20 });
  const pos = place(r, SIZE, VIEWPORT, NO_SCROLL, MARGIN);
  assert.equal(pos.left, VIEWPORT.width - SIZE.width - MARGIN);
  assert.ok(pos.left + SIZE.width <= VIEWPORT.width - MARGIN + 0.001);
});

test('selection rong hon tooltip -> van can giua theo selection roi kep', () => {
  const r = rect({ top: 100, left: 400, width: 600 });
  const pos = place(r, SIZE, VIEWPORT, NO_SCROLL, MARGIN);
  const expectedCenter = clamp(
    r.left + r.width / 2 - SIZE.width / 2,
    MARGIN,
    VIEWPORT.width - SIZE.width - MARGIN,
  );
  assert.equal(pos.left, expectedCenter);
});

test('selection rong hon viewport, tam nam lech trai -> kep ve mep trai (margin)', () => {
  // selection trai dai -2000..2000 (rong 4000, hon han viewport 1280), tam ~0
  // -> tam tru nua tooltip la am -> phai kep ve margin, khong duoc am
  const wideRect = rect({ top: 100, left: -2000, width: 4000 });
  const pos = place(wideRect, SIZE, VIEWPORT, NO_SCROLL, MARGIN);
  assert.equal(pos.left, MARGIN);
  assert.ok(Number.isFinite(pos.left));
});

test('cong scrollX/scrollY vao ket qua de tooltip troi theo scroll trang', () => {
  const r = rect({ top: 100, left: 500 });
  const scroll = { x: 30, y: 1200 };
  const pos = place(r, SIZE, VIEWPORT, scroll, MARGIN);
  const posNoScroll = place(r, SIZE, VIEWPORT, NO_SCROLL, MARGIN);
  assert.equal(pos.top, posNoScroll.top + scroll.y);
  assert.equal(pos.left, posNoScroll.left + scroll.x);
});

test('tooltip rong hon viewport (ca hai mep cham) -> khong throw, tra ve min', () => {
  const hugeSize = { width: 2000, height: 200 };
  const r = rect({ top: 100, left: 500 });
  const pos = place(r, hugeSize, VIEWPORT, NO_SCROLL, MARGIN);
  assert.equal(pos.left, MARGIN);
});

function clamp(v, min, max) {
  if (max < min) return min;
  return Math.min(Math.max(v, min), max);
}
