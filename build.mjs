// Build MV3: 3 entry -> dist/*.js (IIFE) + copy public/ -> dist/
// IIFE cho ca ba entry: content script MV3 khong nap duoc ES module.
import { build, context } from 'esbuild';
import { cp, rm, mkdir } from 'node:fs/promises';

const watch = process.argv.includes('--watch');
const dev = watch || process.argv.includes('--dev');

const OPTS = {
  entryPoints: {
    'service-worker': 'src/background/service-worker.ts',
    'content-entry': 'src/content/content-entry.ts',
    'options-entry': 'src/options/options-entry.ts',
  },
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  target: 'chrome138',
  platform: 'browser',
  minify: !dev,
  sourcemap: dev ? 'inline' : false,
  legalComments: 'none',
  logLevel: 'info',
};

async function copyPublic() {
  await cp('public', 'dist', { recursive: true });
}

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

if (watch) {
  const ctx = await context({
    ...OPTS,
    plugins: [{
      name: 'copy-public',
      setup(b) { b.onEnd(() => copyPublic()); },
    }],
  });
  await ctx.watch();
  console.log('watching...');
} else {
  const t = Date.now();
  await build(OPTS);
  await copyPublic();
  console.log(`built in ${Date.now() - t}ms`);
}
