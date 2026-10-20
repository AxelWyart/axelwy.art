import { copyFile, mkdir } from 'node:fs/promises';

// Commit these assets so the static site works without a runtime CDN or bundler.
const source = new URL('../node_modules/@blossom-carousel/core/', import.meta.url);
const destination = new URL('../vendor/blossom-carousel/', import.meta.url);
await mkdir(destination, { recursive: true });

for (const file of ['blossom-carousel-core.css']) {
  await copyFile(new URL(`dist/${file}`, source), new URL(file, destination));
}
await copyFile(
  new URL('dist/blossom-carousel-core.umd.cjs', source),
  new URL('blossom-carousel-core.umd.js', destination),
);
await copyFile(new URL('LICENSE', source), new URL('LICENSE', destination));
await copyFile(
  new URL('../node_modules/@bramus/style-observer/LICENSE', import.meta.url),
  new URL('style-observer-LICENSE', destination),
);
