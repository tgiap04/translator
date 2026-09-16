import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync } from 'node:fs';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', ignoreDefaultArgs:['--enable-automation'], args:['--no-first-run','--force-device-scale-factor=1'] });
// 16px dung ban rut gon, 48/128 dung ban day du
const JOBS = [[16,'assets/icon-16.svg'], [48,'assets/icon.svg'], [128,'assets/icon.svg']];
for (const [size, src] of JOBS) {
  const p = await b.newPage();
  await p.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  const svg = readFileSync(src, 'utf8').replace(/width="128" height="128"/, `width="${size}" height="${size}"`);
  await p.setContent(`<!doctype html><style>*{margin:0;padding:0}html,body{width:${size}px;height:${size}px;overflow:hidden}</style>${svg}`);
  await new Promise(r=>setTimeout(r,120));
  const buf = await p.screenshot({ omitBackground: true, clip:{x:0,y:0,width:size,height:size} });
  writeFileSync(`public/icons/icon-${size}.png`, buf);
  console.log(`icon-${size}.png  ${buf.length} bytes  (tu ${src})`);
  await p.close();
}
await b.close();
