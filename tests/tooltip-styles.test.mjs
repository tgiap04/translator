// Khoa mot luat CSS ma neu mat di thi tooltip KHONG BAO GIO tat duoc.
// Da tung xay ra that: all:initial ghi de luat cua trinh duyet
//   [popover]:not(:popover-open) { display: none }
// -> hidePopover() dong popover ve mat logic nhung no van hien tren man hinh,
// che mat trang, va cu click tiep theo roi vao tooltip thay vi vao trang.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOOLTIP_STYLES as CSS } from '../src/content/tooltip/tooltip-styles.ts';

test('all:initial phai di kem luat an popover — neu khong tooltip khong tat duoc', () => {
  assert.ok(/all:\s*initial/.test(CSS), 'can all:initial de cat thuoc tinh ke thua tu trang');
  assert.ok(
    /:host\(:not\(:popover-open\)\)\s*\{[^}]*display:\s*none/.test(CSS),
    'MAT LUAT NAY = tooltip khong bao gio tat duoc',
  );
});

test('khai lai color-scheme de scrollbar va form control theo theme', () => {
  assert.ok(/color-scheme:\s*light dark/.test(CSS), 'all:initial dat color-scheme ve normal');
});

test('co du bang mau cho ca hai theme', () => {
  assert.ok(/@media \(prefers-color-scheme: dark\)/.test(CSS), 'thieu nhanh dark');
  for (const v of ['--bg', '--fg', '--border', '--muted']) {
    const hits = CSS.split(v).length - 1;
    assert.ok(hits >= 2, `${v} phai duoc dinh nghia o ca light lan dark (thay ${hits})`);
  }
});

test('khong tai font/anh ngoai — cam ket zero mang', () => {
  assert.ok(!/@import|url\(\s*['"]?https?:/.test(CSS), 'tai tai nguyen ngoai la vi pham zero-network');
});
