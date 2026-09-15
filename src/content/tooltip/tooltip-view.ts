// Dung DOM cua tooltip trong mot shadow root closed.
// TUYET DOI khong dung innerHTML o day hay o tooltip-render.ts: text hien thi
// (nguon: trang web bat ky, hoac engine dich) chi duoc gan bang textContent —
// mot lan innerHTML o day la mot lo XSS trong chinh extension.

import { TOOLTIP_STYLES } from './tooltip-styles.ts';
import { STRINGS } from './tooltip-strings.ts';

export interface TooltipElements {
  readonly host: HTMLElement;
  readonly card: HTMLDivElement;
  readonly pairLabel: HTMLSpanElement;
  readonly swapBtn: HTMLButtonElement;
  readonly targetSelect: HTMLSelectElement;
  readonly closeBtn: HTMLButtonElement;
  readonly sourceEl: HTMLDivElement;
  readonly bodyEl: HTMLDivElement;
  readonly copyBtn: HTMLButtonElement;
}

/**
 * Tien to ten the ngau nhien theo phien: trang khong the doan truoc de nham
 * CSS selector / global style vao host (vd `tkm-translate-host { display:none }`).
 */
function randomTagName(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `tkm-${rand}-tooltip`;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function buildHeader(): {
  header: HTMLDivElement;
  pairLabel: HTMLSpanElement;
  swapBtn: HTMLButtonElement;
  targetSelect: HTMLSelectElement;
  closeBtn: HTMLButtonElement;
} {
  const header = el('div', 'header');

  const pairLabel = el('span', 'pair-label');

  const swapBtn = el('button', 'swap-btn');
  swapBtn.type = 'button';
  swapBtn.setAttribute('aria-label', STRINGS.swapAriaLabel);
  swapBtn.textContent = '⇄';

  const targetSelect = el('select', 'target-select');
  targetSelect.setAttribute('aria-label', STRINGS.targetSelectAriaLabel);

  const closeBtn = el('button', 'close-btn');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', STRINGS.closeAriaLabel);
  closeBtn.textContent = '×';

  header.append(pairLabel, swapBtn, targetSelect, closeBtn);
  return { header, pairLabel, swapBtn, targetSelect, closeBtn };
}

function buildFooter(): { footer: HTMLDivElement; copyBtn: HTMLButtonElement } {
  const footer = el('div', 'footer');
  const copyBtn = el('button', 'copy-btn');
  copyBtn.type = 'button';
  copyBtn.setAttribute('aria-label', STRINGS.copyAriaLabel);
  copyBtn.textContent = STRINGS.copyLabel;
  footer.append(copyBtn);
  return { footer, copyBtn };
}

export function createTooltipView(): TooltipElements {
  const host = document.createElement(randomTagName());
  host.setAttribute('popover', 'manual');
  // host chi lam khung dinh vi — moi thi giac that nam trong .card ben trong shadow.
  host.style.position = 'absolute';
  host.style.margin = '0';
  host.style.padding = '0';
  host.style.border = 'none';
  host.style.background = 'transparent';
  host.style.inset = 'auto';

  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = TOOLTIP_STYLES;
  shadow.appendChild(style);

  const card = el('div', 'card');

  const { header, pairLabel, swapBtn, targetSelect, closeBtn } = buildHeader();

  const sourceEl = el('div', 'source');
  sourceEl.setAttribute('aria-label', STRINGS.sourceAriaLabel);

  const bodyEl = el('div', 'body');
  bodyEl.setAttribute('aria-live', 'polite');
  bodyEl.setAttribute('aria-label', STRINGS.resultAriaLabel);

  const { footer, copyBtn } = buildFooter();

  card.append(header, sourceEl, bodyEl, footer);
  shadow.appendChild(card);
  document.body.appendChild(host);

  return { host, card, pairLabel, swapBtn, targetSelect, closeBtn, sourceEl, bodyEl, copyBtn };
}

export function measureSize(card: HTMLElement): { width: number; height: number } {
  const r = card.getBoundingClientRect();
  return { width: r.width, height: r.height };
}

export function setPosition(host: HTMLElement, top: number, left: number): void {
  host.style.top = `${top}px`;
  host.style.left = `${left}px`;
}
