// Render TooltipState vao DOM da dung san boi tooltip-view.ts.
// Chi dung textContent — xem canh bao XSS o dau tooltip-view.ts.

import type { TooltipState } from '../../shared/translate-contract.js';
import { STRINGS } from './tooltip-strings.js';
import type { TooltipElements } from './tooltip-view.js';

const SOURCE_TRUNCATE_LEN = 120;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

function fillTargetOptions(
  select: HTMLSelectElement,
  options: readonly { code: string; label: string }[],
  current: string,
): void {
  if (select.dataset.filled === 'yes' && select.dataset.current === current) return;
  select.replaceChildren();
  for (const opt of options) {
    const optionEl = document.createElement('option');
    optionEl.value = opt.code;
    optionEl.textContent = opt.label;
    select.appendChild(optionEl);
  }
  select.value = current;
  if (select.value !== current) {
    // cap hien tai khong nam trong danh sach gia -> them option rieng de dropdown dung su that
    const extra = document.createElement('option');
    extra.value = current;
    extra.textContent = current.toUpperCase();
    select.appendChild(extra);
    select.value = current;
  }
  select.dataset.filled = 'yes';
  select.dataset.current = current;
}

function setActionsVisible(els: TooltipElements, visible: boolean): void {
  els.swapBtn.hidden = !visible;
  els.targetSelect.hidden = !visible;
}

function setCopyVisible(els: TooltipElements, visible: boolean): void {
  els.copyBtn.hidden = !visible;
  if (visible) els.copyBtn.textContent = STRINGS.copyLabel;
}

function renderBody(els: TooltipElements, state: TooltipState): void {
  els.bodyEl.classList.remove('error');
  els.bodyEl.replaceChildren();

  switch (state.kind) {
    case 'PENDING': {
      const row = document.createElement('span');
      row.className = 'pending-row';
      const spinner = document.createElement('span');
      spinner.className = 'spinner';
      spinner.setAttribute('aria-hidden', 'true');
      row.append(spinner, document.createTextNode(STRINGS.pendingBody));
      els.bodyEl.appendChild(row);
      setActionsVisible(els, true);
      setCopyVisible(els, false);
      break;
    }
    case 'OK': {
      els.bodyEl.textContent = state.translated;
      setActionsVisible(els, true);
      setCopyVisible(els, true);
      break;
    }
    case 'ERROR': {
      els.bodyEl.classList.add('error');
      els.bodyEl.textContent = state.message || STRINGS.errorFallback;
      if (state.action) {
        const hint = document.createElement('span');
        hint.className = 'hint';
        hint.textContent = state.action;
        els.bodyEl.appendChild(hint);
      }
      setActionsVisible(els, true);
      setCopyVisible(els, false);
      break;
    }
    case 'TOO_LONG': {
      els.bodyEl.textContent = STRINGS.tooLongBody(state.length, state.max);
      setActionsVisible(els, false);
      setCopyVisible(els, false);
      break;
    }
    case 'NO_SELECTION': {
      els.bodyEl.textContent = STRINGS.noSelectionBody;
      setActionsVisible(els, false);
      setCopyVisible(els, false);
      break;
    }
  }
}

export function renderState(
  els: TooltipElements,
  state: TooltipState,
  meta: { source: string; target: string; sourceText: string },
  targetOptions: readonly { code: string; label: string }[],
): void {
  els.pairLabel.textContent = `${meta.source.toUpperCase()} → ${meta.target.toUpperCase()}`;
  els.sourceEl.textContent = truncate(meta.sourceText, SOURCE_TRUNCATE_LEN);
  fillTargetOptions(els.targetSelect, targetOptions, meta.target);
  renderBody(els, state);
}
