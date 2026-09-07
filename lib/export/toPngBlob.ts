import type { ResumeData } from "@/lib/schema/resume";
import { getPdfjs } from "@/lib/pdf/pdfjs";
import { toPdfBlob } from "./toPdfBlob";

/**
 * Renders a resume to a PNG Blob by:
 * 1. Generating the PDF blob via toPdfBlob() (same render path as preview/export).
 * 2. Loading it with pdfjs-dist.
 * 3. Rendering page 1 to an off-screen <canvas> at the given scale.
 * 4. Exporting canvas.toBlob('image/png').
 *
 * @param data  The resume data.
 * @param scale  Device-pixel scale factor (1–5). Higher = sharper but larger.
 *
 * Runs entirely client-side. No API routes needed.
 */
export async function toPngBlob(
  data: ResumeData,
  scale: number = 2,
): Promise<Blob> {
  const clampedScale = Math.max(1, Math.min(5, scale));

  // Generate the PDF using the same path as export and preview.
  const pdfBlob = await toPdfBlob(data);
  const pdfArrayBuffer = await pdfArrayBufferFromBlob(pdfBlob);

  const pdfjs = await getPdfjs();

  // Load the PDF document.
  const loadingTask = pdfjs.getDocument({ data: pdfArrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(1);

  // Render page 1 to an off-screen canvas at the requested scale.
  const viewport = page.getViewport({ scale: clampedScale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error(
      "Could not get a 2D canvas context. PNG export requires a browser environment.",
    );
  }

  await page.render({ canvas, canvasContext: ctx, viewport }).promise;

  // Convert canvas to PNG blob.
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("canvas.toBlob() returned null. The canvas may be empty."));
        }
      },
      "image/png",
    );
  });
}

/** Convert a Blob to ArrayBuffer, compatible with all browsers. */
async function pdfArrayBufferFromBlob(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer();
}
