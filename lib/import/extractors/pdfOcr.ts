import { getPdfjs } from "@/lib/pdf/pdfjs";
import { orderOcrBoxes } from "./ocrReadingOrder";

/** Renders at ~2x so small resume text stays legible without huge canvases. */
const OCR_RENDER_SCALE = 2;

/** Scans are slow to read, so only the first pages are processed. */
export const OCR_MAX_PAGES = 12;

/** What the OCR step is doing right now — copy for it lives in the UI. */
export type OcrProgress =
  | { step: "preparing" }
  | {
      step: "reading-page";
      page: number;
      /** Pages that will actually be read (capped at OCR_MAX_PAGES). */
      totalPages: number;
      /** Pages in the file beyond the cap that are being skipped. */
      skippedPages: number;
    };

/**
 * Engine files are served from public/ocr and public/pdfjs (copied from
 * node_modules by scripts/copyOcrAssets.mjs). They must be absolute URLs
 * because the OCR worker is started from a blob, where relative paths
 * would not resolve.
 */
function assetUrl(path: string): string {
  return new URL(path, window.location.origin).href;
}

/**
 * OCR fallback for scanned/image-only PDFs, which have no text layer for
 * `extractPdfText` to read. Each page is rasterised with pdfjs and recognised
 * with tesseract.js, both client-side, so the file never leaves the browser.
 *
 * tesseract.js is imported dynamically — it is only ever needed for scans, so
 * it stays out of the normal import path.
 */
export async function extractPdfTextWithOcr(
  file: File,
  onProgress?: (progress: OcrProgress) => void,
): Promise<string> {
  const [pdfjs, { createWorker, OEM, PSM }] = await Promise.all([
    getPdfjs(),
    import("tesseract.js"),
  ]);
  const pdfDoc = await pdfjs.getDocument({
    data: await file.arrayBuffer(),
    // Scans are usually JPEG 2000 / JBIG2 images, which pdfjs decodes with
    // wasm modules it can only load from an explicit URL. Without this the
    // page renders blank and OCR finds no text.
    wasmUrl: assetUrl("/pdfjs/wasm/"),
  }).promise;

  onProgress?.({ step: "preparing" });
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    workerPath: assetUrl("/ocr/worker.min.js"),
    corePath: assetUrl("/ocr/core"),
    langPath: assetUrl("/ocr/lang"),
  });
  // Sparse mode returns each fragment with its position, which lets
  // orderOcrBoxes keep multi-column CVs from being read straight across.
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });

  try {
    const totalPages = Math.min(pdfDoc.numPages, OCR_MAX_PAGES);
    const skippedPages = pdfDoc.numPages - totalPages;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      onProgress?.({
        step: "reading-page",
        page: pageNumber,
        totalPages,
        skippedPages,
      });
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: OCR_RENDER_SCALE });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get a 2D canvas context for OCR.");

      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      const { data } = await worker.recognize(canvas, {}, { blocks: true });
      const text = orderOcrBoxes(
        (data.blocks ?? []).map((block) => ({
          text: block.text.replace(/\s+/g, " ").trim(),
          ...block.bbox,
        })),
      );
      if (text.trim()) pages.push(text);
    }
    return pages.join("\n");
  } finally {
    await worker.terminate();
  }
}
