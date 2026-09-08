import type { ResumeData } from "@/lib/schema/resume";
import { getPdfjs } from "@/lib/pdf/pdfjs";
import { thumbnailRepository } from "@/lib/storage/thumbnails/thumbnailRepository";
import { toPdfBlob } from "./toPdfBlob";

/** Rendered wider than any dashboard card actually needs so the cached PNG
 *  stays crisp when the grid scales it down, but far short of full print
 *  resolution — see MAX_PIXEL_RATIO below for the rest of that budget. */
const RENDER_WIDTH = 640;
const MAX_PIXEL_RATIO = 2;

/**
 * Every template's header block reads only these fields (see
 * templates/exabyting/ExabyingDocument.tsx's <Header>, templates/minimal's
 * equivalent) — summary and sections never appear in it. The dashboard card
 * preview only shows the very top of page one (see ResumeCardPreview.css),
 * which is exactly this header, so a thumbnail only needs redrawing when
 * one of these fields changes — not on every edit to the resume body.
 */
export function computeThumbnailKey(resume: ResumeData): string {
  return JSON.stringify({
    templateId: resume.meta.templateId,
    pageSize: resume.meta.pageSize,
    personalInfo: resume.personalInfo,
  });
}

/**
 * Strips everything the header doesn't render. Laying out a resume's full
 * summary and sections just to throw away everything but the header is the
 * cost this whole cache exists to avoid — so the thumbnail is rendered from
 * a header-only resume in the first place, not cropped out of the full one.
 */
function toHeaderOnlyResume(resume: ResumeData): ResumeData {
  return { ...resume, summary: undefined, sections: [] };
}

/**
 * Returns a PNG data URL of the resume's header, from cache if the header
 * hasn't changed since it was last rendered, or freshly drawn (and cached)
 * otherwise. Safe to call as often as needed — a cache hit costs one
 * IndexedDB read and no PDF work at all, so both the dashboard card (on
 * first view) and editorStore.save() (right after every save) call this
 * same function rather than one of them forcing a redraw unconditionally.
 */
export async function getResumeThumbnailDataUrl(
  resume: ResumeData,
): Promise<string> {
  const id = resume.meta.id;
  const headerKey = computeThumbnailKey(resume);

  const cached = await thumbnailRepository.get(id);
  if (cached && cached.headerKey === headerKey) {
    return cached.dataUrl;
  }

  const dataUrl = await renderThumbnailDataUrl(resume);
  await thumbnailRepository.set(id, {
    headerKey,
    dataUrl,
    updatedAt: new Date().toISOString(),
  });
  return dataUrl;
}

async function renderThumbnailDataUrl(resume: ResumeData): Promise<string> {
  const blob = await toPdfBlob(toHeaderOnlyResume(resume));
  const pdfjs = await getPdfjs();
  const data = await blob.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data });

  try {
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(1);
    const unscaled = page.getViewport({ scale: 1 });
    const pixelRatio = Math.min(
      typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
      MAX_PIXEL_RATIO,
    );
    const viewport = page.getViewport({
      scale: (RENDER_WIDTH / unscaled.width) * pixelRatio,
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not get a 2D canvas context.");

    await page.render({ canvas, canvasContext: context, viewport }).promise;
    return canvas.toDataURL("image/png");
  } finally {
    void loadingTask.destroy();
  }
}
