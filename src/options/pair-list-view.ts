// Render danh sach cap ngon ngu tu <template id="pair-row-template">.
import type { AppConfig, LangPair } from '../shared/config-schema.ts';
import { fromCommandShortcut, toChips } from '../shared/hotkey-codec.ts';
import { languageName } from '../shared/language-catalog.ts';
import {
  checkAvailability,
  downloadErrorMessage,
  downloadPack,
  mapDownloadError,
} from './pack-download-progress.ts';
import { S } from './options-strings.ts';

/** Cap co `c` (khoa vao lenh tinh) map sang ten lenh trong manifest.json. */
const COMMAND_NAME_BY_SLOT: Record<1 | 2, string> = {
  1: 'translate-vi-en',
  2: 'translate-en-vi',
};

/**
 * Ve mot to hop phim thanh cac chip <kbd>. textContent, khong innerHTML.
 * Dau vao la chuoi canonical ('Ctrl+Shift+KeyE').
 */
export function appendKbd(target: HTMLElement, canonical: string): void {
  toChips(canonical).forEach((chip, i) => {
    if (i > 0) {
      const sep = document.createElement('span');
      sep.className = 'hotkey-sep';
      sep.textContent = '+';
      target.appendChild(sep);
    }
    const k = document.createElement('kbd');
    k.textContent = chip;
    target.appendChild(k);
  });
}

function appendPlain(target: HTMLElement, text: string, cls?: string): void {
  const el = document.createElement('span');
  if (cls) el.className = cls;
  el.textContent = text;
  target.appendChild(el);
}

export type PairListCallbacks = {
  onEdit(pair: LangPair): void;
  onDelete(id: string): void;
};

export function renderPairList(
  listEl: HTMLElement,
  template: HTMLTemplateElement,
  config: AppConfig,
  commands: readonly chrome.commands.Command[],
  callbacks: PairListCallbacks,
): void {
  listEl.textContent = '';
  for (const pair of config.pairs) {
    listEl.appendChild(buildRow(pair, template, commands, callbacks));
  }
}

function buildRow(
  pair: LangPair,
  template: HTMLTemplateElement,
  commands: readonly chrome.commands.Command[],
  callbacks: PairListCallbacks,
): HTMLElement {
  const root = template.content.firstElementChild;
  if (!root) throw new Error('pair-row-template rong');
  const node = root.cloneNode(true) as HTMLElement;

  const label = node.querySelector('.pair-label') as HTMLElement;
  const hotkeyEl = node.querySelector('.pair-hotkey') as HTMLElement;
  const badgeEl = node.querySelector('.pair-badge') as HTMLElement;
  const progressEl = node.querySelector('.pair-progress') as HTMLProgressElement;
  const downloadBtn = node.querySelector('.btn-download') as HTMLButtonElement;
  const cancelBtn = node.querySelector('.btn-cancel-download') as HTMLButtonElement;
  const editBtn = node.querySelector('.btn-edit') as HTMLButtonElement;
  const deleteBtn = node.querySelector('.btn-delete') as HTMLButtonElement;

  label.textContent = `${languageName(pair.s)} → ${languageName(pair.t)}`;

  // Nut icon chua <svg> san trong template -> KHONG dat textContent (se xoa mat icon).
  editBtn.title = S.editButton;
  editBtn.setAttribute('aria-label', S.editButton);
  deleteBtn.title = S.deleteButton;
  deleteBtn.setAttribute('aria-label', S.deleteButton);
  hotkeyEl.textContent = '';

  if (pair.c) {
    // Cap gan slot lenh: hien CA phim co dinh cua Chrome LAN phim rieng (neu co).
    // Hai duong dinh tuyen doc lap nhau nen ca hai cung dung duoc.
    const cmd = commands.find((c) => c.name === COMMAND_NAME_BY_SLOT[pair.c as 1 | 2]);
    // Chuan hoa qua CUNG mot bo dinh dang, neu khong se hien lan lon
    // 'Alt+Shift+1' canh '^⇧E' — hai kieu ky hieu khac nhau tren cung mot hang.
    const canonical = cmd?.shortcut ? fromCommandShortcut(cmd.shortcut) : null;
    if (canonical) appendKbd(hotkeyEl, canonical);
    else appendPlain(hotkeyEl, S.captureLocked, 'hotkey-none');
    // Gan nhan: hai to hop khac nhau tren cung mot hang, khong nhan thi kho phan biet.
    appendPlain(hotkeyEl, S.hotkeyTagFixed, 'hotkey-tag');

    if (pair.k) {
      appendKbd(hotkeyEl, pair.k);
      appendPlain(hotkeyEl, S.hotkeyTagCustom, 'hotkey-tag');
    } else {
      appendPlain(hotkeyEl, S.extraHotkeyNone, 'hotkey-none');
    }

    // Sua ĐUOC: doi ngon ngu, va gan them mot to hop rieng.
    editBtn.addEventListener('click', () => callbacks.onEdit(pair));
    // Xoa thi KHONG: xoa la bo slot lenh mo coi, khong tao lai duoc tu trong extension.
    deleteBtn.hidden = true;
  } else {
    if (pair.k) appendKbd(hotkeyEl, pair.k);
    else appendPlain(hotkeyEl, S.captureIdle, 'hotkey-none');

    editBtn.addEventListener('click', () => callbacks.onEdit(pair));
    deleteBtn.addEventListener('click', () => {
      if (window.confirm(S.confirmDelete(`${pair.s} → ${pair.t}`))) callbacks.onDelete(pair.id);
    });
  }

  downloadBtn.textContent = S.downloadButton;
  cancelBtn.textContent = S.cancelDownloadButton;
  badgeEl.textContent = S.badgeLoading;
  void refreshBadge(pair, badgeEl, downloadBtn);
  wireDownload(pair, downloadBtn, cancelBtn, progressEl, badgeEl);

  return node;
}

function wireDownload(
  pair: LangPair,
  downloadBtn: HTMLButtonElement,
  cancelBtn: HTMLButtonElement,
  progressEl: HTMLProgressElement,
  badgeEl: HTMLElement,
): void {
  let controller: AbortController | null = null;

  downloadBtn.addEventListener('click', () => {
    controller = new AbortController();
    downloadBtn.hidden = true;
    cancelBtn.hidden = false;
    progressEl.hidden = false;
    progressEl.value = 0;

    downloadPack(pair.s, pair.t, (pct) => { progressEl.value = pct; }, controller.signal)
      .then(() => refreshBadge(pair, badgeEl, downloadBtn))
      .catch((err: unknown) => {
        badgeEl.textContent = downloadErrorMessage(mapDownloadError(err));
        badgeEl.className = 'pair-badge badge-error';
      })
      .finally(() => {
        downloadBtn.hidden = false;
        cancelBtn.hidden = true;
        progressEl.hidden = true;
        controller = null;
      });
  });

  cancelBtn.addEventListener('click', () => controller?.abort());
}

async function refreshBadge(
  pair: LangPair,
  badgeEl: HTMLElement,
  downloadBtn?: HTMLButtonElement,
): Promise<void> {
  const availability = await checkAvailability(pair.s, pair.t);
  badgeEl.textContent = badgeLabel(availability);
  badgeEl.className = `pair-badge badge-${availability}`;
  // Moi tai lai thu da co, hoac tai thu Chrome khong ho tro, deu la gay roi.
  if (downloadBtn) downloadBtn.hidden = availability === 'available' || availability === 'unavailable';
}

function badgeLabel(a: TranslatorAvailabilityValue): string {
  switch (a) {
    case 'available':
      return S.badgeAvailable;
    case 'downloadable':
      return S.badgeDownloadable;
    case 'downloading':
      return S.badgeDownloading;
    case 'unavailable':
      return S.badgeUnavailable;
  }
}
