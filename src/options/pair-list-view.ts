// Render danh sach cap ngon ngu tu <template id="pair-row-template">.
import type { AppConfig, LangPair } from '../shared/config-schema.js';
import { format } from '../shared/hotkey-codec.js';
import { languageName } from './language-catalog.js';
import {
  checkAvailability,
  downloadErrorMessage,
  downloadPack,
  mapDownloadError,
} from './pack-download-progress.js';
import { S } from './options-strings.js';

/** Cap co `c` (khoa vao lenh tinh) map sang ten lenh trong manifest.json. */
const COMMAND_NAME_BY_SLOT: Record<1 | 2, string> = {
  1: 'translate-vi-en',
  2: 'translate-en-vi',
};

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

  if (pair.c) {
    const cmd = commands.find((c) => c.name === COMMAND_NAME_BY_SLOT[pair.c as 1 | 2]);
    hotkeyEl.textContent = cmd?.shortcut || S.captureLocked;
    editBtn.hidden = true;
    deleteBtn.hidden = true;
  } else {
    hotkeyEl.textContent = pair.k ? format(pair.k) : S.captureIdle;
    editBtn.textContent = S.editButton;
    deleteBtn.textContent = S.deleteButton;
    editBtn.addEventListener('click', () => callbacks.onEdit(pair));
    deleteBtn.addEventListener('click', () => {
      if (window.confirm(S.confirmDelete(`${pair.s} → ${pair.t}`))) callbacks.onDelete(pair.id);
    });
  }

  downloadBtn.textContent = S.downloadButton;
  cancelBtn.textContent = S.cancelDownloadButton;
  badgeEl.textContent = S.badgeLoading;
  void refreshBadge(pair, badgeEl);
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
      .then(() => refreshBadge(pair, badgeEl))
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

async function refreshBadge(pair: LangPair, badgeEl: HTMLElement): Promise<void> {
  const availability = await checkAvailability(pair.s, pair.t);
  badgeEl.textContent = badgeLabel(availability);
  badgeEl.className = `pair-badge badge-${availability}`;
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
