import { getPdfjs } from "@/lib/pdf/pdfjs";
import { assetUrl, createOcrWorker, recognizeCanvas } from "./ocrEngine";

/** Renders at ~2x so small resume text stays legible without huge canvases. */
const OCR_RENDER_SCALE = 2;

/** Scans are slow to read, so only the first pages are processed. */
export const OCR_MAX_PAGES = 12;

/** What the OCR step is doing right now — copy for it lives in the UI. */
export type OcrProgress =
  | { step: "preparing" }
  | { step: "reading-image" }
  | {
      step: "reading-page";
      page: number;
      /** Pages that will actually be read (capped at OCR_MAX_PAGES). */
      totalPages: number;
      /** Pages in the file beyond the cap that are being skipped. */
      skippedPages: number;
    };

/**
 * OCR fallback for scanned/image-only PDFs, which have no text layer for
 * `extractPdfText` to read. Each page is rasterised with pdfjs and recognised
 * with tesseract.js, both client-side, so the file never leaves the browser.
 */
export async function extractPdfTextWithOcr(
  file: File,
  onProgress?: (progress: OcrProgress) => void,
): Promise<string> {
  const pdfjs = await getPdfjs();
  const pdfDoc = await pdfjs.getDocument({
    data: await file.arrayBuffer(),
    // Scans are usually JPEG 2000 / JBIG2 images, which pdfjs decodes with
    // wasm modules it can only load from an explicit URL. Without this the
    // page renders blank and OCR finds no text.
    wasmUrl: assetUrl("/pdfjs/wasm/"),
  }).promise;

  onProgress?.({ step: "preparing" });
  const worker = await createOcrWorker();

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
      const text = await recognizeCanvas(worker, canvas);
      if (text.trim()) pages.push(text);
    }
    return pages.join("\n");
  } finally {
    await worker.terminate();
  }
}
