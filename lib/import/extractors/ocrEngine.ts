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
 * tesseract.js's createWorker() can hang forever instead of rejecting when
 * its language-data fetch fails — a bug in the library itself: that
 * rejection is swallowed internally rather than reaching the promise we're
 * awaiting (createWorker.js only wires workerResReject for the 'load'
 * action, not 'loadLanguage'/'initialize', then `.catch(() => {})`s the
 * whole chain). Bounding the wait here is what turns a flaky fetch into a
 * normal, retryable error instead of wedging the whole chat panel.
 */
const OCR_STARTUP_TIMEOUT_MS = 30_000;

/**
 * Starts an English OCR worker. tesseract.js is imported dynamically — it is
 * only ever needed for scans and images, so it stays out of the normal import
 * path. The caller must `terminate()` the worker when done.
 */
export async function createOcrWorker(): Promise<Worker> {
  const { createWorker, OEM, PSM } = await import("tesseract.js");
  const creation = createWorker("eng", OEM.LSTM_ONLY, {
    workerPath: assetUrl("/ocr/worker.min.js"),
    corePath: assetUrl("/ocr/core"),
    langPath: assetUrl("/ocr/lang"),
    // Without this, a failed fetch throws uncaught inside the worker's own
    // message handler instead of ever reaching our catch.
    errorHandler: () => {},
  });
  const worker = await Promise.race([
    creation,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(
          new Error(
            "Couldn't load the OCR engine. Check your connection and try again.",
          ),
        );
        // The real creation may still resolve after we give up on it —
        // terminate that worker instead of leaking it.
        void creation.then((w) => w.terminate()).catch(() => {});
      }, OCR_STARTUP_TIMEOUT_MS);
    }),
  ]);
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
