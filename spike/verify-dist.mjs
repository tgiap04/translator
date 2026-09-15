// Kiem dist/ load duoc va content script chay that.
// Chrome 152 chan --load-extension trong automation -> dung profile that + CDP.
import puppeteer from 'puppeteer-core';
import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';

const DIST = '/Users/tgiap.dev/devs/translator/dist';
const b = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: false, userDataDir: mkdtempSync(join(tmpdir(), 'vdist-')),
  ignoreDefaultArgs: ['--enable-automation'],
  args: ['--no-first-run', '--no-default-browser-check',
         `--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`,
         '--enable-unsafe-extension-debugging'],
});
const cdp = await b.target().createCDPSession();
try { console.log('loadUnpacked ->', JSON.stringify(await cdp.send('Extensions.loadUnpacked', { path: DIST }))); }
catch (e) { console.log('loadUnpacked loi:', e.message.slice(0, 120)); }

const p = await b.newPage();
const logs = [];
p.on('console', (m) => { if (m.text().includes('[HT]')) logs.push(m.text()); });
await p.goto('https://example.com', { waitUntil: 'domcontentloaded' });
await new Promise(s => setTimeout(s, 5000));

const targets = await b.targets();
console.log('extension targets:', targets.filter(t => t.url().startsWith('chrome-extension://'))
  .map(t => `${t.type()} ${t.url().split('/').pop()}`));
console.log('console [HT]:', logs.length ? logs : '(khong co)');
await b.close();
