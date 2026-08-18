/**
 * Builds the offline-first shell that ships INSIDE the iOS/Android binary.
 *
 * The website is server-rendered, so `dist/client` has no index.html. Capacitor
 * needs one real local entry file, otherwise it must load a remote URL — and a
 * remote URL cannot start without internet.
 *
 * This script:
 *   1. copies dist/client -> dist/native
 *   2. reads the Vite manifest to find the hashed client entry (+ its CSS)
 *   3. writes dist/native/index.html that boots the app client-side
 *
 * Run: bun run build && bun run build:native && npx cap sync
 */
import { cp, mkdir, readFile, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const clientDir = resolve(root, "dist/client");
const outDir = resolve(root, "dist/native");

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function readManifest() {
  for (const p of [".vite/manifest.json", "manifest.json"]) {
    const full = resolve(clientDir, p);
    if (await exists(full)) return JSON.parse(await readFile(full, "utf8"));
  }
  throw new Error("Vite client manifest not found — run `bun run build` first.");
}

const manifest = await readManifest();
const entry = Object.values(manifest).find((e) => e.isEntry) ?? Object.values(manifest)[0];
if (!entry) throw new Error("No client entry found in the Vite manifest.");

const css = new Set(entry.css ?? []);
for (const key of entry.imports ?? []) {
  for (const file of manifest[key]?.css ?? []) css.add(file);
}

await mkdir(outDir, { recursive: true });
await cp(clientDir, outDir, { recursive: true });

const html = `<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="theme-color" content="#000000" />
    <title>Smarty Workout</title>
    <link rel="icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
${[...css].map((f) => `    <link rel="stylesheet" href="/${f}" />`).join("\n")}
    <style>
      html, body { margin: 0; background: #000; color: #fff; overscroll-behavior-y: contain; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/${entry.file}"></script>
  </body>
</html>
`;

await writeFile(resolve(outDir, "index.html"), html, "utf8");
console.log(`Native shell ready: dist/native (entry ${entry.file}, ${css.size} css file(s))`);
