// [SPIKE] Runner v3 — nap extension qua CDP Extensions.loadUnpacked (Chrome 152 bo --load-extension).
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SPIKE_DIR = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = mkdtempSync(join(tmpdir(), 'spike-prof-'));

const PAGES = [
  ['1. Trang tinh thuong',   'https://example.com'],
  ['2. CSP nghiem ngat',     'https://github.com/nodejs/node'],
  ['3. SPA nang',            'https://www.notion.so'],
  ['4. Iframe cross-origin', 'https://www.w3schools.com/html/html_iframe.asp'],
  ['5. Trang han che',       'https://chromewebstore.google.com/'],
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  userDataDir: PROFILE,
  ignoreDefaultArgs: ['--enable-automation'],
  args: ['--no-first-run', '--no-default-browser-check', '--enable-unsafe-extension-debugging'],
});

const cdp = await browser.target().createCDPSession();
let loaded = null;
try {
  loaded = await cdp.send('Extensions.loadUnpacked', { path: SPIKE_DIR });
  console.log('Extensions.loadUnpacked ->', JSON.stringify(loaded));
} catch (e) {
  console.log('Extensions.loadUnpacked THAT BAI:', e.message.slice(0, 200));
}

const out = [];
for (const [label, url] of PAGES) {
  const page = await browser.newPage();
  let rec = { label, url };
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 9000));
    rec = { ...rec, ...await page.evaluate(() => ({
      pageSeesTranslator: typeof Translator,
      isolated: document.documentElement.getAttribute('data-spike-isolated'),
      main: document.documentElement.getAttribute('data-spike-main'),
    })) };
  } catch (e) {
    rec.navError = `${e.name}: ${e.message.slice(0, 120)}`;
  }
  out.push(rec);
  console.log(`\n===== ${label} =====`);
  console.log('  page thay Translator :', rec.pageSeesTranslator ?? '(loi)');
  console.log('  ISOLATED world       :', rec.isolated ?? '(KHONG CHAY)');
  console.log('  MAIN world           :', rec.main ?? '(KHONG CHAY)');
  await page.close();
}
console.log('\n===== JSON =====\n' + JSON.stringify({ extensionId: loaded?.id ?? null, results: out }, null, 1));
await browser.close();
