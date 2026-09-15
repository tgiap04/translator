// Vong doi + dismiss cua tooltip. sourceText giu trong state la nguon su that
// cho retry — KHONG doc lai Selection (user bam nut la selection co the da mat).

import type { TooltipCallbacks, TooltipController, TooltipState } from '../../shared/translate-contract.js';
import { place } from './tooltip-position.js';
import { createTooltipView, measureSize, setPosition } from './tooltip-view.js';
import type { TooltipElements } from './tooltip-view.js';
import { renderState } from './tooltip-render.js';
import { STRINGS } from './tooltip-strings.js';

const MARGIN = 8;
const SELECTIONCHANGE_DEBOUNCE_MS = 100;
const NO_SELECTION_AUTOHIDE_MS = 2000;
const COPY_RESET_MS = 1500;

interface Meta {
  source: string;
  target: string;
  sourceText: string;
}

export type TargetLang = { code: string; label: string };

/**
 * getTargetLangs duoc tiem tu ngoai: danh sach ngon ngu dich phai den TU CAU HINH
 * cua nguoi dung, khong phai danh sach cung. Doi sang cap chua tai pack la vo nghia.
 */
export function createTooltipController(
  callbacks: TooltipCallbacks,
  getTargetLangs: () => readonly TargetLang[],
): TooltipController {
  let els: TooltipElements | null = null;
  let meta: Meta | null = null;
  let currentState: TooltipState = { kind: 'NO_SELECTION' };
  let lastRect: DOMRect | null = null;
  let visible = false;

  let selectionDebounceId: ReturnType<typeof setTimeout> | undefined;
  let noSelectionTimerId: ReturnType<typeof setTimeout> | undefined;
  let copyResetId: ReturnType<typeof setTimeout> | undefined;

  function requestRetry(source: string, target: string, sourceText: string): void {
    meta = { source, target, sourceText };
    currentState = { kind: 'PENDING' };
    renderCurrent();
    callbacks.onRetryWithPair(source, target, sourceText);
  }

  async function handleCopy(view: TooltipElements): Promise<void> {
    if (currentState.kind !== 'OK') return;
    const { translated } = currentState;
    try {
      await navigator.clipboard.writeText(translated);
      view.copyBtn.textContent = STRINGS.copiedLabel;
    } catch {
      view.copyBtn.textContent = STRINGS.copyFailedLabel;
    }
    clearTimeout(copyResetId);
    copyResetId = setTimeout(() => {
      view.copyBtn.textContent = STRINGS.copyLabel;
    }, COPY_RESET_MS);
  }

  function wireStaticListeners(view: TooltipElements): void {
    // giu selection cua trang khong bi mat khi user bam nut trong tooltip
    view.card.addEventListener('mousedown', (e) => e.preventDefault());
    view.closeBtn.addEventListener('click', () => hide());
    view.copyBtn.addEventListener('click', () => void handleCopy(view));
    view.swapBtn.addEventListener('click', () => {
      if (!meta) return;
      requestRetry(meta.target, meta.source, meta.sourceText);
    });
    view.targetSelect.addEventListener('change', () => {
      if (!meta) return;
      requestRetry(meta.source, view.targetSelect.value, meta.sourceText);
    });
  }

  function ensureView(): TooltipElements {
    if (!els) {
      els = createTooltipView();
      wireStaticListeners(els);
    }
    return els;
  }

  function reposition(): void {
    if (!els || !lastRect) return;
    const host = els.host;
    // do khung dau visibility hidden de tranh nhay hinh — do truoc khi gan
    // noi dung se ra 0 (xem phase-06 § Toan dinh vi).
    host.style.visibility = 'hidden';
    const size = measureSize(els.card);
    const pos = place(
      lastRect,
      size,
      { width: window.innerWidth, height: window.innerHeight },
      { x: window.scrollX, y: window.scrollY },
      MARGIN,
    );
    setPosition(host, pos.top, pos.left);
    host.style.visibility = '';
  }

  function renderCurrent(): void {
    if (!els || !meta) return;
    renderState(els, currentState, meta, getTargetLangs());
    reposition();
  }

  function armNoSelectionAutohide(): void {
    clearTimeout(noSelectionTimerId);
    noSelectionTimerId = setTimeout(() => hide(), NO_SELECTION_AUTOHIDE_MS);
  }

  function onSelectionChange(): void {
    clearTimeout(selectionDebounceId);
    selectionDebounceId = setTimeout(() => {
      const sel = document.getSelection();
      if (sel && sel.isCollapsed) hide();
    }, SELECTIONCHANGE_DEBOUNCE_MS);
  }

  function onPointerDown(e: PointerEvent): void {
    if (!els) return;
    if (!e.composedPath().includes(els.host)) hide();
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') hide();
  }

  function attachDismissListeners(): void {
    document.addEventListener('selectionchange', onSelectionChange);
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
  }

  function detachDismissListeners(): void {
    document.removeEventListener('selectionchange', onSelectionChange);
    window.removeEventListener('pointerdown', onPointerDown, true);
    window.removeEventListener('keydown', onKeyDown, true);
    clearTimeout(selectionDebounceId);
    clearTimeout(noSelectionTimerId);
    clearTimeout(copyResetId);
  }

  function show(rect: DOMRect, state: TooltipState, initMeta: Meta): void {
    const view = ensureView();
    meta = initMeta;
    currentState = state;
    lastRect = rect;
    visible = true;
    view.host.showPopover();
    renderCurrent();
    attachDismissListeners();
    if (state.kind === 'NO_SELECTION') armNoSelectionAutohide();
  }

  function update(state: TooltipState): void {
    if (!visible) return;
    currentState = state;
    renderCurrent();
    if (state.kind === 'NO_SELECTION') armNoSelectionAutohide();
  }

  function hide(): void {
    if (!visible) return;
    visible = false;
    detachDismissListeners();
    els?.host.hidePopover();
  }

  function owns(node: EventTarget | null): boolean {
    if (!els || !(node instanceof Node)) return false;
    return els.host === node || els.host.contains(node);
  }

  return { show, update, hide, owns };
}
