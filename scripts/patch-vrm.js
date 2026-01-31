/**
 * Patches @pixiv/three-vrm to add null checks in setTextureColorSpace.
 * Prevents crash when texture blob URLs fail to load.
 * Run via: node scripts/patch-vrm.js
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const files = [
  "node_modules/@pixiv/three-vrm/lib/three-vrm.module.js",
  "node_modules/@pixiv/three-vrm/lib/three-vrm.cjs",
  "node_modules/@pixiv/three-vrm-materials-mtoon/lib/three-vrm-materials-mtoon.module.js",
  "node_modules/@pixiv/three-vrm-materials-mtoon/lib/three-vrm-materials-mtoon.cjs",
];

const pattern = /function setTextureColorSpace\(texture, colorSpace\) \{\n  if \(/g;
const replacement = `function setTextureColorSpace(texture, colorSpace) {\n  if (!texture) return;\n  if (`;

let patched = 0;
for (const rel of files) {
  const abs = join(root, rel);
  try {
    const src = readFileSync(abs, "utf8");
    if (src.includes("if (!texture) return;")) continue; // already patched
    const out = src.replace(pattern, replacement);
    if (out !== src) {
      writeFileSync(abs, out, "utf8");
      patched++;
      console.log(`Patched: ${rel}`);
    }
  } catch {
    // file may not exist
  }
}
console.log(`Done. ${patched} file(s) patched.`);
