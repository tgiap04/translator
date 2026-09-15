import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeCommand } from '../src/background/command-router.ts';
import { DEFAULT_CONFIG } from '../src/shared/config-schema.ts';

const cfg = (pairs) => ({ v: 1, max: 2000, pairs });

test('open-options di thang toi options page', () => {
  assert.deepEqual(routeCommand('open-options', DEFAULT_CONFIG), { action: 'options' });
});

test('cau hinh mac dinh: slot 1 -> vi->en, slot 2 -> en->vi', () => {
  assert.deepEqual(routeCommand('translate-vi-en', DEFAULT_CONFIG),
    { action: 'send', pairId: 'vi2en0', sourceLanguage: 'vi', targetLanguage: 'en' });
  assert.deepEqual(routeCommand('translate-en-vi', DEFAULT_CONFIG),
    { action: 'send', pairId: 'en2vi0', sourceLanguage: 'en', targetLanguage: 'vi' });
});

test('user xoa cap gan voi slot -> badge missingPair, khong crash', () => {
  const only2 = cfg([{ id: 'x', s: 'en', t: 'vi', k: null, c: 2 }]);
  assert.deepEqual(routeCommand('translate-vi-en', only2), { action: 'badge', kind: 'missingPair' });
  assert.equal(routeCommand('translate-en-vi', only2).action, 'send');
});

test('config rong -> badge, khong nem loi', () => {
  assert.deepEqual(routeCommand('translate-vi-en', cfg([])), { action: 'badge', kind: 'missingPair' });
});

test('cap dong (khong co c) KHONG duoc route qua command', () => {
  // Cap dong di duong keydown cua phase 05, khong qua service worker.
  const dynamicOnly = cfg([{ id: 'd1', s: 'ja', t: 'vi', k: 'Ctrl+Shift+KeyJ' }]);
  assert.deepEqual(routeCommand('translate-vi-en', dynamicOnly), { action: 'badge', kind: 'missingPair' });
});

test('user doi slot sang cap khac -> route theo c, khong theo id', () => {
  const remapped = cfg([{ id: 'ja2vi', s: 'ja', t: 'vi', k: null, c: 1 }]);
  assert.deepEqual(routeCommand('translate-vi-en', remapped),
    { action: 'send', pairId: 'ja2vi', sourceLanguage: 'ja', targetLanguage: 'vi' });
});

test('command la (khong co trong manifest) -> options, khong nem', () => {
  assert.deepEqual(routeCommand('khong-ton-tai', DEFAULT_CONFIG), { action: 'options' });
});

test('routeCommand thuan — khong doi cfg dau vao', () => {
  const snapshot = JSON.stringify(DEFAULT_CONFIG);
  routeCommand('translate-vi-en', DEFAULT_CONFIG);
  assert.equal(JSON.stringify(DEFAULT_CONFIG), snapshot);
});
