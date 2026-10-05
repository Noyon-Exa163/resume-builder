import type { Worker } from "tesseract.js";
import { orderOcrBoxes } from "./ocrReadingOrder";

/**
 * Engine files are served from public/ocr and public/pdfjs (copied from
 * node_modules by scripts/copyOcrAssets.mjs). They must be absolute URLs
 * because the OCR worker is started from a blob, where relative paths
 * would not resolve.
 */
export function assetUrl(path: string): string {
  return new URL(path, window.location.origin).href;
}

/**
 * Starts an English OCR worker. tesseract.js is imported dynamically — it is
 * only ever needed for scans and images, so it stays out of the normal import
 * path. The caller must `terminate()` the worker when done.
 */
export async function createOcrWorker(): Promise<Worker> {
  const { createWorker, OEM, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    workerPath: assetUrl("/ocr/worker.min.js"),
    corePath: assetUrl("/ocr/core"),
    langPath: assetUrl("/ocr/lang"),
  });
  // Sparse mode returns each fragment with its position, which lets
  // orderOcrBoxes keep multi-column CVs from being read straight across.
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
  return worker;
}

/** Reads one rendered page or image, returning its text in reading order. */
export async function recognizeCanvas(
  worker: Worker,
  canvas: HTMLCanvasElement,
): Promise<string> {
  const { data } = await worker.recognize(canvas, {}, { blocks: true });
  return orderOcrBoxes(
    (data.blocks ?? []).map((block) => ({
      text: block.text.replace(/\s+/g, " ").trim(),
      ...block.bbox,
    })),
  );
}
