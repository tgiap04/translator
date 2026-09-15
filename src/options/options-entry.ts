// Lap rap options page — cua DUY NHAT duoc tai language pack: chi o day moi co user gesture
// hop le. Xac minh thuc nghiem (phase 01): Translator.create() nem
//   NotAllowedError: Requires a user gesture when availability is "downloadable".
import { getConfig, setConfig, onConfigChanged } from '../shared/config-store.js';
import type { AppConfig, LangPair } from '../shared/config-schema.js';
import { renderPairList } from './pair-list-view.js';
import { renderPairEditor } from './pair-editor-view.js';
import type { CommandEntry } from './hotkey-conflict-validator.js';
import { S } from './options-strings.js';

const SAVE_DEBOUNCE_MS = 400;

let currentConfig: AppConfig | null = null;
let rawCommands: chrome.commands.Command[] = [];
let commands: CommandEntry[] = [];
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`thieu phan tu #${id} trong options.html`);
  return found as T;
}

function showUnsupportedBanner(): void {
  const banner = el<HTMLElement>('unsupported-banner');
  const app = el<HTMLElement>('app');
  app.hidden = true;
  banner.hidden = false;
  banner.textContent = `${S.unsupportedTitle} — ${S.unsupportedBody}`;
}

function setStaticStrings(): void {
  el<HTMLElement>('page-title').textContent = S.pageTitle;
  el<HTMLElement>('pairs-heading').textContent = S.pairsHeading;
  el<HTMLElement>('add-pair-btn').textContent = S.addPairButton;
  el<HTMLElement>('commands-heading').textContent = S.commandsHeading;
  el<HTMLElement>('commands-col-name').textContent = S.commandsColName;
  el<HTMLElement>('commands-col-shortcut').textContent = S.commandsColShortcut;

  const intro = el<HTMLElement>('commands-intro');
  intro.textContent = S.commandsIntroBefore;
  const link = document.createElement('a');
  link.href = 'chrome://extensions/shortcuts';
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = S.commandsIntroLinkText;
  intro.appendChild(link);
}

function renderCommandsTable(): void {
  const tbody = el<HTMLElement>('commands-tbody');
  tbody.textContent = '';
  for (const cmd of rawCommands) {
    const tr = document.createElement('tr');
    const nameTd = document.createElement('td');
    nameTd.textContent = cmd.description || cmd.name || '';
    const shortcutTd = document.createElement('td');
    shortcutTd.textContent = cmd.shortcut || S.commandsUnset;
    tr.append(nameTd, shortcutTd);
    tbody.appendChild(tr);
  }
}

function renderPairs(): void {
  if (!currentConfig) return;
  renderPairList(
    el<HTMLElement>('pair-list'),
    el<HTMLTemplateElement>('pair-row-template'),
    currentConfig,
    rawCommands,
    { onEdit: openEditor, onDelete: deletePair },
  );
}

function closeEditor(): void {
  el<HTMLElement>('pair-editor').textContent = '';
}

function openEditor(pair: LangPair | null): void {
  if (!currentConfig) return;
  renderPairEditor(el<HTMLElement>('pair-editor'), currentConfig, commands, pair, {
    onSave: savePair,
    onCancel: closeEditor,
  });
}

function mutateConfig(next: AppConfig): void {
  currentConfig = next;
  closeEditor();
  renderPairs();
  scheduleSave(next);
}

function savePair(pair: LangPair): void {
  if (!currentConfig) return;
  const exists = currentConfig.pairs.some((p) => p.id === pair.id);
  const pairs = exists
    ? currentConfig.pairs.map((p) => (p.id === pair.id ? pair : p))
    : [...currentConfig.pairs, pair];
  mutateConfig({ ...currentConfig, pairs });
}

function deletePair(id: string): void {
  if (!currentConfig) return;
  mutateConfig({ ...currentConfig, pairs: currentConfig.pairs.filter((p) => p.id !== id) });
}

function scheduleSave(cfg: AppConfig): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    setConfig(cfg).catch(() => {
      el<HTMLElement>('boot').textContent = S.errSaveFailed;
    });
  }, SAVE_DEBOUNCE_MS);
}

async function boot(): Promise<void> {
  if (typeof Translator === 'undefined') {
    showUnsupportedBanner();
    return;
  }

  setStaticStrings();
  el<HTMLElement>('boot').textContent = S.bootLoading;

  rawCommands = await chrome.commands.getAll();
  commands = rawCommands.map((c) => ({
    name: c.name ?? '',
    shortcut: c.shortcut ?? '',
    description: c.description ?? '',
  }));
  renderCommandsTable();

  currentConfig = await getConfig();
  el<HTMLElement>('boot').textContent = '';
  renderPairs();

  el<HTMLButtonElement>('add-pair-btn').addEventListener('click', () => openEditor(null));

  onConfigChanged((cfg) => {
    currentConfig = cfg;
    renderPairs();
  });
}

void boot();
