import { fixBrandCasingDeep } from "@/lib/schema/brandCasing";
import { createElement } from "react";
import type { pdf as PdfFn } from "@react-pdf/renderer";
import type { ResumeData } from "@/lib/schema/resume";
import { getTemplate } from "@/templates";

let pdfPromise: Promise<typeof PdfFn> | null = null;

/**
 * react-pdf's full layout engine is only needed once a resume is actually
 * being rendered (preview or export) — load it lazily so it never lands in
 * the initial route bundle, mirroring lib/pdf/pdfjs.ts's getPdfjs().
 */
function getPdf(): Promise<typeof PdfFn> {
  pdfPromise ??= import("@react-pdf/renderer").then((mod) => mod.pdf);
  return pdfPromise;
}

/** How many rendered blobs to keep. A handful covers toggling back (undo to
 *  a previous state, theme flip and back) without retaining every draft
 *  state of a long editing session — each entry is a full PDF blob. */
const PDF_BLOB_CACHE_LIMIT = 4;

/**
 * Cache of rendered PDF blobs keyed by the resume's content key. Avoids
 * re-rendering the whole PDF when the same content is rendered again.
 * LRU-capped, and failed renders are never cached so a transient error
 * can't poison later requests for the same content.
 */
const pdfBlobCache = new Map<string, Promise<Blob>>();

/**
 * Renders a resume to a PDF Blob using the template's Document component —
 * the exact same component the live preview (LivePreviewPane) uses, so there
 * is zero drift between what the user sees and what they download.
 *
 * Runs entirely client-side. No API routes needed.
 */
export async function toPdfBlob(source: ResumeData): Promise<Blob> {
  const data = fixBrandCasingDeep(source);
  const pdf = await getPdf();
  const { Document } = getTemplate(data.meta.templateId);
  // The template's Document wraps react-pdf's <Document> internally.
  // pdf() expects ReactElement<DocumentProps> but the template's prop type
  // is ResumeTemplateProps — the cast is safe at runtime since Document
  // renders a standard react-pdf <Document> under the hood.
  const element = createElement(Document, { data }) as Parameters<
    typeof pdf
  >[0];
  const instance = pdf(element);
  return instance.toBlob();
}

/**
 * Returns a cached PDF blob for the given content key, rendering and
 * caching it on a miss. The cache key should be the previewKey from
 * LivePreviewPane so that identical content reuses the previous render.
 */
export async function getCachedPdfBlob(
  key: string,
  render: () => Promise<Blob>,
): Promise<Blob> {
  const cached = pdfBlobCache.get(key);
  if (cached) {
    // Refresh recency — Map iterates in insertion order.
    pdfBlobCache.delete(key);
    pdfBlobCache.set(key, cached);
    return cached;
  }

  const promise = render();
  pdfBlobCache.set(key, promise);
  void promise.catch(() => {
    // A failed render must not stay cached — it would reject every later
    // request for this content until a full page reload.
    if (pdfBlobCache.get(key) === promise) pdfBlobCache.delete(key);
  });

  if (pdfBlobCache.size > PDF_BLOB_CACHE_LIMIT) {
    const oldest = pdfBlobCache.keys().next().value;
    if (oldest !== undefined && oldest !== key) pdfBlobCache.delete(oldest);
  }
  return promise;
}

/**
 * Test hook: vitest reuses one module graph across files (isolate: false),
 * so cache-dependent tests need a deterministic reset. Not for production
 * use.
 */
export function clearPdfBlobCacheForTests(): void {
  pdfBlobCache.clear();
}
