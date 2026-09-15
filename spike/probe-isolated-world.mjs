// [SPIKE] Do THANG cau hoi cot loi: Translator co ton tai trong ISOLATED WORLD khong?
// Dung CDP Page.createIsolatedWorld — cung khai niem JS realm ma content script chay trong do.
import puppeteer from 'puppeteer-core';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SPIKE_DIR = dirname(fileURLToPath(import.meta.url));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: false,
  userDataDir: mkdtempSync(join(tmpdir(), 'spike-iso-')),
  ignoreDefaultArgs: ['--enable-automation'],
  args: ['--no-first-run', '--no-default-browser-check', '--enable-unsafe-extension-debugging'],
});

// Chan doan extension
const cdpB = await browser.target().createCDPSession();
try {
  const r = await cdpB.send('Extensions.loadUnpacked', { path: SPIKE_DIR });
  console.log('extension loaded id =', r.id);
} catch (e) { console.log('loadUnpacked loi:', e.message.slice(0, 120)); }

const PAGES = [
  ['1. Trang tinh thuong',   'https://example.com'],
  ['2. CSP nghiem ngat',     'https://github.com/nodejs/node'],
  ['3. SPA nang',            'https://www.notion.so'],
  ['4. Iframe cross-origin', 'https://www.w3schools.com/html/html_iframe.asp'],
];

const PROBE = `(async () => {
  const r = { typeofTranslator: typeof Translator, typeofLanguageDetector: typeof LanguageDetector,
              isTop: window.top === window, secure: isSecureContext, origin: location.origin };
  try { r.availability = await Translator.availability({sourceLanguage:'vi',targetLanguage:'en'}); }
  catch (e) { r.availability = 'ERR ' + e.name + ': ' + e.message; }
  try { const s = await Translator.create({sourceLanguage:'vi',targetLanguage:'en'});
        r.create = 'OK'; r.translate = await s.translate('Xin chao the gioi'); }
  catch (e) { r.create = 'ERR ' + e.name + ': ' + e.message; }
  return JSON.stringify(r);
})()`;

const out = [];
for (const [label, url] of PAGES) {
  const page = await browser.newPage();
  const cdp = await page.createCDPSession();
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2500));

  const { frameTree } = await cdp.send('Page.getFrameTree');
  const frames = [frameTree, ...(frameTree.childFrames ?? [])];
  const perFrame = [];
  for (const f of frames) {
    const fid = f.frame.id;
    try {
      const { executionContextId } = await cdp.send('Page.createIsolatedWorld',
        { frameId: fid, worldName: 'spike_probe', grantUniveralAccess: false });
      const ev = await cdp.send('Runtime.evaluate',
        { expression: PROBE, contextId: executionContextId, awaitPromise: true, returnByValue: true });
      perFrame.push({ frameUrl: (f.frame.url || '').slice(0, 55), isolated: ev.result.value });
    } catch (e) { perFrame.push({ frameUrl: (f.frame.url || '').slice(0, 55), err: e.message.slice(0, 90) }); }
  }
  const mainWorld = await page.evaluate(() => typeof Translator);
  const csRan = await page.evaluate(() => document.documentElement.getAttribute('data-spike-isolated'));
  out.push({ label, mainWorld, contentScriptRan: csRan, perFrame });
  console.log(`\n===== ${label} =====`);
  console.log('  MAIN world typeof Translator :', mainWorld);
  console.log('  content script chay?         :', csRan ? 'CO' : 'KHONG');
  for (const p of perFrame) console.log('  [ISOLATED]', p.frameUrl, '->', p.isolated ?? p.err);
  await page.close();
}
console.log('\n===== JSON =====\n' + JSON.stringify(out, null, 1));
await browser.close();
