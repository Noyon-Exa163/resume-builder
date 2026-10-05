/**
 * Copies the files scanned-PDF import needs out of node_modules into public/,
 * so the browser loads them from this site instead of a third-party CDN.
 * Runs on every install (see "postinstall" in package.json); the copies are
 * gitignored because they are always regenerated from the installed versions.
 */
import { cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const nodeModules = path.resolve("node_modules");
const publicDir = path.resolve("public");

/** [source relative to node_modules, destination relative to public/] */
const FILES = [
  ["tesseract.js/dist/worker.min.js", "ocr/worker.min.js"],
  // The engine picks one of these at run time based on CPU features.
  ["tesseract.js-core/tesseract-core-lstm.wasm.js", "ocr/core/tesseract-core-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "ocr/core/tesseract-core-simd-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js", "ocr/core/tesseract-core-relaxedsimd-lstm.wasm.js"],
  ["@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", "ocr/lang/eng.traineddata.gz"],
];

async function copyFile(from, to) {
  const target = path.join(publicDir, to);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(path.join(nodeModules, from), target);
}

for (const [from, to] of FILES) await copyFile(from, to);

// pdfjs decoders for JPEG 2000 / JBIG2 scans.
const wasmDir = path.join(nodeModules, "pdfjs-dist/wasm");
for (const name of await readdir(wasmDir)) {
  if (name.endsWith(".wasm")) await copyFile(`pdfjs-dist/wasm/${name}`, `pdfjs/wasm/${name}`);
}
