// Ban toi thieu phase 02 — phase 04 tiep quan (router + chrome.commands).
// CANH BAO cho phase 04: Translator API KHONG ton tai trong service worker.
// Worker chi dinh tuyen. Moi loi goi Translator o day se nem ReferenceError.
import { getConfig } from '../shared/config-store.js';

chrome.runtime.onInstalled.addListener(async (details) => {
  const cfg = await getConfig();
  console.log('[HT] installed:', details.reason, '| pairs:', cfg.pairs.length, '| max:', cfg.max);
});

// Vong doi MV3: worker bi terminate bat cu luc nao.
// KHONG giu state trong bien toan cuc — doc lai config moi lan can.
chrome.commands.onCommand.addListener((command) => {
  console.log('[HT] command:', command);
});
