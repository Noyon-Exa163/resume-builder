import type * as PdfjsModule from "pdfjs-dist";

type Pdfjs = typeof PdfjsModule;

let pdfjsPromise: Promise<Pdfjs> | null = null;

/**
 * Loads pdfjs-dist and configures its worker, once per session.
 *
 * The import is dynamic so pdfjs never lands in the SSR bundle and the worker
 * URL is only resolved in the browser. Both the PNG exporter and the live
 * preview rasterise PDFs, so they share this rather than each wiring up a
 * worker of their own.
 */
export function getPdfjs(): Promise<Pdfjs> {
  pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = resolveWorkerSrc(pdfjs.version);
    }
    return pdfjs;
  });
  return pdfjsPromise;
}

/**
 * `new URL(..., import.meta.url)` tells the bundler to emit the worker as an
 * asset. If the bundler can't resolve it, fall back to a CDN copy pinned to
 * the installed version.
 */
function resolveWorkerSrc(version: string): string {
  try {
    return new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  } catch {
    return `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  }
}
