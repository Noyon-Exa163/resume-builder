import { createOcrWorker, recognizeCanvas } from "./ocrEngine";

/** Small screenshots read poorly, so they are scaled up to about this. */
const MIN_LONG_SIDE = 1800;
/** Huge photos are scaled down; OCR gains nothing past this and memory spikes. */
const MAX_LONG_SIDE = 4000;

/**
 * Reads the text in a picture of a resume — a screenshot, a phone photo, or
 * an exported image — with OCR, entirely in the browser. Any format the
 * browser can decode works (PNG, JPEG, WebP, AVIF, GIF, BMP).
 */
export async function extractImageTextWithOcr(
  file: File,
  onProgress?: () => void,
): Promise<string> {
  // Decoding first means an unreadable file fails fast, before the engine loads.
  // The default orientation handling turns phone photos upright.
  const bitmap = await createImageBitmap(file);
  try {
    const longSide = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(
      Math.max(1, MIN_LONG_SIDE / longSide),
      MAX_LONG_SIDE / longSide,
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get a 2D canvas context for OCR.");
    // A transparent PNG would otherwise OCR as black text on black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    onProgress?.();
    const worker = await createOcrWorker();
    try {
      return await recognizeCanvas(worker, canvas);
    } finally {
      await worker.terminate();
    }
  } finally {
    bitmap.close();
  }
}
