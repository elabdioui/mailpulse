// Builds the Chrome extension into extension/dist (load it unpacked from
// chrome://extensions). `--watch` rebuilds on change.
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

import * as esbuild from "esbuild";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");
const watch = process.argv.includes("--watch");

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, "icons"), { recursive: true });
await cp(path.join(root, "static"), dist, { recursive: true });

// --- Icons: drawn here so the repo needs no binary assets or image tooling.
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel((x + 0.5) / size, (y + 0.5) / size);
      raw.set([r, g, b, a], y * (size * 4 + 1) + 1 + x * 4);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
// Same motif as src/app/icon.svg: dark rounded tile, white envelope, green pulse dot.
function iconPixel(u, v) {
  const r = 0.25;
  const dx = Math.max(r - u, 0, u - (1 - r));
  const dy = Math.max(r - v, 0, v - (1 - r));
  if (dx * dx + dy * dy > r * r) return [0, 0, 0, 0];
  const t = 0.06;
  const inEnvelope = u > 0.19 && u < 0.81 && v > 0.27 && v < 0.73;
  const onEdge =
    inEnvelope &&
    (u < 0.19 + t || u > 0.81 - t || v < 0.27 + t || v > 0.73 - t);
  // The envelope's "V" flap, from the top corners down to the centre.
  const flapV = 0.27 + 0.8 * (0.31 - Math.abs(u - 0.5));
  const flap = Math.abs(v - flapV) < t / 1.4;
  if ((u - 0.76) ** 2 + (v - 0.7) ** 2 < 0.018) return [34, 197, 94, 255];
  if (onEdge || (inEnvelope && flap)) return [250, 250, 250, 255];
  return [10, 10, 10, 255];
}
for (const size of [16, 48, 128]) {
  await writeFile(
    path.join(dist, "icons", `icon-${size}.png`),
    encodePng(size, iconPixel),
  );
}

// --- Scripts. The content script must be a classic script (IIFE); the
// service worker is declared as a module in the manifest.
const common = {
  bundle: true,
  target: "chrome120",
  logLevel: "info",
  sourcemap: watch ? "inline" : false,
};
const builds = [
  { entryPoints: [path.join(root, "src/background.ts")], outfile: path.join(dist, "background.js"), format: "esm" },
  { entryPoints: [path.join(root, "src/content/index.ts")], outfile: path.join(dist, "content.js"), format: "iife" },
  { entryPoints: [path.join(root, "src/popup/popup.ts")], outfile: path.join(dist, "popup.js"), format: "iife" },
  { entryPoints: [path.join(root, "src/options/options.ts")], outfile: path.join(dist, "options.js"), format: "iife" },
];

if (watch) {
  for (const options of builds) {
    const ctx = await esbuild.context({ ...common, ...options });
    await ctx.watch();
  }
} else {
  await Promise.all(builds.map((options) => esbuild.build({ ...common, ...options })));
}
