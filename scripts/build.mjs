import * as esbuild from 'esbuild';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function build() {
  fs.mkdirSync(path.join(rootDir, 'dist/main'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'dist/preload'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'dist/renderer'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'dist/dashboard'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'dist/sticky'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'dist/assets'), { recursive: true });

  // Copy renderer index.html
  fs.copyFileSync(
    path.join(rootDir, 'src/renderer/index.html'),
    path.join(rootDir, 'dist/renderer/index.html')
  );

  // Copy dashboard index.html
  fs.copyFileSync(
    path.join(rootDir, 'src/dashboard/index.html'),
    path.join(rootDir, 'dist/dashboard/index.html')
  );

  // Copy sticky index.html
  fs.copyFileSync(
    path.join(rootDir, 'src/sticky/index.html'),
    path.join(rootDir, 'dist/sticky/index.html')
  );

  // Copy PNG and MP3 assets
  const assetFiles = fs.readdirSync(path.join(rootDir, 'assets'));
  for (const file of assetFiles) {
    if (file.endsWith('.png') || file.endsWith('.mp3')) {
      fs.copyFileSync(path.join(rootDir, 'assets', file), path.join(rootDir, 'dist/assets', file));
    }
  }

  // Bundle main
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'src/main/index.ts')],
    outfile: path.join(rootDir, 'dist/main/index.js'),
    bundle: true,
    platform: 'node',
    target: 'node20',
    external: ['electron'],
    format: 'cjs',
    sourcemap: true,
  });

  // Bundle preload
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'src/preload/index.ts')],
    outfile: path.join(rootDir, 'dist/preload/index.js'),
    bundle: true,
    platform: 'node',
    target: 'node20',
    external: ['electron'],
    format: 'cjs',
    sourcemap: true,
  });

  // Bundle renderer app
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'src/renderer/app.ts')],
    outfile: path.join(rootDir, 'dist/renderer/app.js'),
    bundle: true,
    platform: 'browser',
    target: 'es2022',
    format: 'esm',
    sourcemap: true,
  });

  // Bundle dashboard app
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'src/dashboard/dashboard.ts')],
    outfile: path.join(rootDir, 'dist/dashboard/dashboard.js'),
    bundle: true,
    platform: 'browser',
    target: 'es2022',
    format: 'esm',
    sourcemap: true,
  });

  // Bundle sticky note app
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'src/sticky/sticky.ts')],
    outfile: path.join(rootDir, 'dist/sticky/sticky.js'),
    bundle: true,
    platform: 'browser',
    target: 'es2022',
    format: 'esm',
    sourcemap: true,
  });

  console.log('Build completed successfully.');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
