// Form them/sua mot cap ngon ngu dong (khong ap dung cho cap khoa vao chrome.commands).
import { MAX_PAIRS, type AppConfig, type LangPair } from '../shared/config-schema.ts';
import { format, fromCommandShortcut, isForbidden, type HotkeyReject } from '../shared/hotkey-codec.ts';
import { LANGUAGES } from '../shared/language-catalog.ts';
import { check, type CommandEntry, type ConflictResult } from './hotkey-conflict-validator.ts';
import { HotkeyCaptureWidget } from './hotkey-capture-widget.ts';
import { S } from './options-strings.ts';

export type PairEditorCallbacks = {
  onSave(pair: LangPair): void;
  onCancel(): void;
};

/** Tiem tu hotkey-codec.ts (CONTRACT) vao ham thuan hotkey-conflict-validator.check. */
const CODEC = { isForbidden, fromCommandShortcut };

function conflictMessage(result: Exclude<ConflictResult, { ok: true }>): string {
  switch (result.code) {
    case 'FORBIDDEN':
      return S.errForbidden;
    case 'DUP_PAIR':
      return S.errDupPair(result.pairLabel);
    case 'DUP_COMMAND':
      return S.errDupCommand(result.commandLabel);
  }
}

/** Ve form vao `container`. `editing` = null nghia la them moi. */
export function renderPairEditor(
  container: HTMLElement,
  config: AppConfig,
  commands: readonly CommandEntry[],
  editing: LangPair | null,
  callbacks: PairEditorCallbacks,
): void {
  container.textContent = '';

  if (!editing && config.pairs.length >= MAX_PAIRS) {
    const p = document.createElement('p');
    p.className = 'editor-error';
    p.textContent = S.pairMaxReached(MAX_PAIRS);
    container.appendChild(p);
    return;
  }

  const form = document.createElement('form');
  form.className = 'pair-editor';

  const sourceSelect = buildLanguageSelect(editing?.s ?? LANGUAGES[0]!.code);
  const targetSelect = buildLanguageSelect(editing?.t ?? LANGUAGES[1]!.code);

  const errorEl = document.createElement('p');
  errorEl.className = 'editor-error';

  let currentHotkey: string | null = editing?.k ?? null;
  const hotkeyBtn = document.createElement('button');
  hotkeyBtn.type = 'button';
  hotkeyBtn.textContent = currentHotkey ? format(currentHotkey) : S.captureIdle;

  const widget = new HotkeyCaptureWidget({
    onCapture(canonical) {
      const result = check(canonical, config, editing?.id ?? null, commands, CODEC);
      if (!result.ok) {
        errorEl.textContent = conflictMessage(result);
        hotkeyBtn.textContent = currentHotkey ? format(currentHotkey) : S.captureIdle;
        return;
      }
      currentHotkey = canonical;
      errorEl.textContent = '';
      hotkeyBtn.textContent = format(canonical);
    },
    onReject(reason) {
      errorEl.textContent = rejectMessage(reason);
    },
    onCancel() {
      hotkeyBtn.textContent = currentHotkey ? format(currentHotkey) : S.captureIdle;
    },
  });

  hotkeyBtn.addEventListener('click', () => {
    errorEl.textContent = '';
    hotkeyBtn.textContent = S.captureListening;
    widget.start();
  });

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.textContent = S.saveButton;

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = S.cancelButton;
  cancelBtn.addEventListener('click', () => {
    widget.stop();
    callbacks.onCancel();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const s = sourceSelect.value;
    const t = targetSelect.value;
    if (s === t) {
      errorEl.textContent = S.pairSameLanguageError;
      return;
    }
    if (!currentHotkey) {
      errorEl.textContent = S.errNoModifier;
      return;
    }
    const finalCheck = check(currentHotkey, config, editing?.id ?? null, commands, CODEC);
    if (!finalCheck.ok) {
      errorEl.textContent = conflictMessage(finalCheck);
      return;
    }
    widget.stop();
    callbacks.onSave({ id: editing?.id ?? crypto.randomUUID().slice(0, 6), s, t, k: currentHotkey });
  });

  appendLabeled(form, S.pairSourceLabel, sourceSelect);
  appendLabeled(form, S.pairTargetLabel, targetSelect);
  appendLabeled(form, S.pairHotkeyLabel, hotkeyBtn);
  form.appendChild(errorEl);
  form.appendChild(saveBtn);
  form.appendChild(cancelBtn);
  container.appendChild(form);
}

function buildLanguageSelect(selected: string): HTMLSelectElement {
  const select = document.createElement('select');
  for (const lang of LANGUAGES) {
    const opt = document.createElement('option');
    opt.value = lang.code;
    opt.textContent = `${lang.name} (${lang.code})`;
    opt.selected = lang.code === selected;
    select.appendChild(opt);
  }
  return select;
}

function appendLabeled(form: HTMLFormElement, labelText: string, field: HTMLElement): void {
  const label = document.createElement('label');
  label.textContent = labelText;
  label.appendChild(field);
  form.appendChild(label);
}

function rejectMessage(reason: HotkeyReject): string {
  switch (reason) {
    case 'NO_MODIFIER':
      return S.errNoModifier;
    case 'SHIFT_ONLY':
      return S.errShiftOnly;
    case 'RESERVED':
      return S.errReserved;
    case 'FORBIDDEN':
      return S.errForbidden;
    case 'MODIFIER_ONLY':
      return '';
  }
}
