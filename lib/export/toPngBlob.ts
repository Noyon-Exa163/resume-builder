import type { PDFDocumentProxy } from "pdfjs-dist";
import type { ResumeData } from "@/lib/schema/resume";
import { getPdfjs } from "@/lib/pdf/pdfjs";
import { toPdfBlob } from "./toPdfBlob";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
/** Visual gap between stacked pages in the all-pages export, in device
 * pixels at scale 1 — scaled up so it looks the same size at any scale. */
const PAGE_GAP = 24;

function clampScale(scale: number): number {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
}

async function loadPdfDocument(data: ResumeData): Promise<PDFDocumentProxy> {
  const pdfBlob = await toPdfBlob(data);
  const pdfArrayBuffer = await pdfBlob.arrayBuffer();
  const pdfjs = await getPdfjs();
  return pdfjs.getDocument({ data: pdfArrayBuffer }).promise;
}

/** How many pages the resume currently renders to — used to offer a page
 * picker before the user commits to a PNG export. */
export async function getPdfPageCount(data: ResumeData): Promise<number> {
  const pdfDoc = await loadPdfDocument(data);
  return pdfDoc.numPages;
}

async function renderPageToCanvas(
  pdfDoc: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
): Promise<HTMLCanvasElement> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

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
  return canvas;
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("canvas.toBlob() returned null. The canvas may be empty."));
      }
    }, "image/png");
  });
}

/**
 * Renders a single page of the resume to a PNG Blob via the same PDF
 * (toPdfBlob -> pdfjs -> canvas) path the live preview and PDF export use,
 * so there's no drift between what's shown and what's downloaded.
 *
 * @param data        The resume data.
 * @param scale       Device-pixel scale factor (1–5). Higher = sharper but larger.
 * @param pageNumber  1-indexed page to render. Defaults to the first page.
 */
export async function toPngBlob(
  data: ResumeData,
  scale: number = 2,
  pageNumber: number = 1,
): Promise<Blob> {
  const clampedScale = clampScale(scale);
  const pdfDoc = await loadPdfDocument(data);
  const canvas = await renderPageToCanvas(pdfDoc, pageNumber, clampedScale);
  return canvasToPngBlob(canvas);
}

/**
 * Renders every page of the resume and stacks them into a single tall PNG,
 * for a "the whole resume as one image" export.
 */
export async function toPngBlobAllPages(
  data: ResumeData,
  scale: number = 2,
): Promise<Blob> {
  const clampedScale = clampScale(scale);
  const pdfDoc = await loadPdfDocument(data);

  const pageCanvases: HTMLCanvasElement[] = [];
  for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber += 1) {
    pageCanvases.push(await renderPageToCanvas(pdfDoc, pageNumber, clampedScale));
  }

  if (pageCanvases.length === 1) {
    return canvasToPngBlob(pageCanvases[0]);
  }

  const gap = PAGE_GAP * clampedScale;
  const width = Math.max(...pageCanvases.map((c) => c.width));
  const height =
    pageCanvases.reduce((sum, c) => sum + c.height, 0) +
    gap * (pageCanvases.length - 1);

  const composite = document.createElement("canvas");
  composite.width = width;
  composite.height = height;
  const ctx = composite.getContext("2d");
  if (!ctx) {
    throw new Error(
      "Could not get a 2D canvas context. PNG export requires a browser environment.",
    );
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  let y = 0;
  for (const pageCanvas of pageCanvases) {
    ctx.drawImage(pageCanvas, 0, y);
    y += pageCanvas.height + gap;
  }

  return canvasToPngBlob(composite);
}
