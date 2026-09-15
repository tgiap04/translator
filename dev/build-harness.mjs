// Build dev/tooltip-harness-entry.ts -> dev/tooltip-harness.bundle.js (IIFE)
// de dev/tooltip-harness.html mo truc tiep bang trinh duyet, khong can server.
// Chay lai sau khi sua bat ky file nao trong src/content/tooltip/**:
//   node dev/build-harness.mjs
import { build } from 'esbuild';

await build({
  entryPoints: ['dev/tooltip-harness-entry.ts'],
  bundle: true,
  format: 'iife',
  target: 'chrome138',
  platform: 'browser',
  outfile: 'dev/tooltip-harness.bundle.js',
  sourcemap: 'inline',
  legalComments: 'none',
  logLevel: 'info',
});

console.log('built dev/tooltip-harness.bundle.js');
