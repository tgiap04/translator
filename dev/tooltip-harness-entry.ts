// Entry rieng cho dev harness — dung THAT createTooltipController tu
// src/content/tooltip, khong reimplement lai. Bien-doi hoa thanh
// dev/tooltip-harness.bundle.js boi dev/build-harness.mjs.
import { createTooltipController } from '../src/content/tooltip/tooltip-controller.ts';
import type { TooltipCallbacks, TooltipState } from '../src/shared/translate-contract.ts';

function log(msg: string): void {
  const out = document.getElementById('log');
  if (!out) return;
  const time = new Date().toLocaleTimeString('vi-VN');
  out.textContent = `${time} — ${msg}\n${out.textContent ?? ''}`;
}

const callbacks: TooltipCallbacks = {
  onRetryWithPair(source, target, sourceText) {
    log(`onRetryWithPair(source=${source}, target=${target}, sourceText="${sourceText.slice(0, 40)}…")`);
    // gia lap do tre mang cua engine that (phase 07) roi tra ve OK
    setTimeout(() => {
      controller.update({ kind: 'OK', translated: `[gia lap ${source}→${target}] ${sourceText}` });
    }, 600);
  },
  onOpenOptions() {
    log('onOpenOptions() duoc goi');
  },
};

// Harness dung danh sach co dinh — ban that lay tu cau hinh nguoi dung.
const HARNESS_LANGS = [
  { code: 'vi', label: 'Tieng Viet' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: 'Nihongo' },
];
const controller = createTooltipController(callbacks, () => HARNESS_LANGS);

const SAMPLE_SOURCE =
  'Đây là đoạn văn bản gốc mẫu dùng để demo tooltip dịch trực tiếp trên trang, ' +
  'đủ dài để kiểm tra việc rút gọn hiển thị phần nguồn phía trên bản dịch.';

const STATE_BUILDERS: Record<string, () => TooltipState> = {
  PENDING: () => ({ kind: 'PENDING' }),
  OK: () => ({ kind: 'OK', translated: 'Xin chào, đây là bản dịch giả cho công cụ demo harness.' }),
  ERROR: () => ({
    kind: 'ERROR',
    message: 'Không tạo được bộ dịch trên máy này.',
    action: 'Mở Cài đặt để tải mô hình dịch.',
    actionKind: 'OPEN_OPTIONS',
  }),
  TOO_LONG: () => ({ kind: 'TOO_LONG', length: 5240, max: 2000 }),
  NO_SELECTION: () => ({ kind: 'NO_SELECTION' }),
};

function readInput(id: string): number {
  const input = document.getElementById(id) as HTMLInputElement | null;
  return input ? Number(input.value) || 0 : 0;
}

function currentRect(): DOMRect {
  const top = readInput('rect-top');
  const left = readInput('rect-left');
  const width = readInput('rect-width');
  const height = readInput('rect-height');
  return {
    top, left, width, height,
    bottom: top + height,
    right: left + width,
    x: left,
    y: top,
    toJSON() { return this; },
  } as DOMRect;
}

for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-state]')) {
  btn.addEventListener('click', () => {
    const key = btn.dataset.state ?? '';
    const build = STATE_BUILDERS[key];
    if (!build) return;
    controller.show(currentRect(), build(), { source: 'vi', target: 'en', sourceText: SAMPLE_SOURCE });
    log(`show(${key})`);
  });
}

document.getElementById('hide-btn')?.addEventListener('click', () => {
  controller.hide();
  log('hide()');
});

document.getElementById('reposition-btn')?.addEventListener('click', () => {
  controller.show(currentRect(), STATE_BUILDERS.OK!(), { source: 'vi', target: 'en', sourceText: SAMPLE_SOURCE });
  log('show(OK) voi rect moi — kiem dinh vi');
});

log('Harness san sang.');
