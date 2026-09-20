import type { ResumeData } from "@/lib/schema/resume";
import { getPdfjs } from "@/lib/pdf/pdfjs";
import { thumbnailRepository } from "@/lib/storage/thumbnails/thumbnailRepository";
import { REGISTERED_TEMPLATE_IDS } from "@/templates/ids";
import { toPdfBlob } from "./toPdfBlob";

/** Rendered wider than any dashboard card actually needs so the cached PNG
 *  stays crisp when the grid scales it down, but far short of full print
 *  resolution — see MAX_PIXEL_RATIO below for the rest of that budget. */
const RENDER_WIDTH = 640;
const MAX_PIXEL_RATIO = 2;

export function thumbnailCacheId(
  resumeId: string,
  templateId: string,
): string {
  return `${resumeId}:${templateId}`;
}

/**
 * Header, summary, template, and page size — the fields that paint into the
 * top of page 1. Sections live further down, so editing them must not bust
 * this cache (dashboard cards and the theme picker both rely on that).
 */
export function computeThumbnailKey(resume: ResumeData): string {
  return JSON.stringify({
    templateId: resume.meta.templateId,
    pageSize: resume.meta.pageSize,
    // Explicit fallback, not just `resume.meta.nameCasing`: JSON.stringify
    // drops an `undefined` property entirely, so a resume saved before this
    // field existed would produce the exact same key as before and never
    // bust the cache — the fallback forces the key to actually change once.
    nameCasing: resume.meta.nameCasing ?? "uppercase",
    accentColor: resume.meta.accentColor ?? "cyan",
    // Affects every template's contact row (see the toggle in
    // components/editor/PersonalInfoForm.tsx) — without this, flipping it
    // wouldn't bust the cached header crop.
    alternatePhoneVisible: resume.meta.alternatePhoneVisible ?? true,
    personalInfo: resume.personalInfo,
    summary: resume.summary ?? "",
  });
}

/**
 * Keeps the header and summary, drops sections. The thumbnail crop never
 * shows experience/education/etc., and laying those out is the cost this
 * cache exists to avoid.
 */
function toPreviewResume(resume: ResumeData): ResumeData {
  return { ...resume, sections: [] };
}

/**
 * Returns a PNG data URL of the top of page 1, from cache if the preview
 * key hasn't changed since it was last rendered for this resume+template,
 * or freshly drawn (and cached) otherwise. Safe to call as often as needed
 * — a cache hit is one IndexedDB read and no PDF work.
 *
 * Keyed by resume id AND template id so the editor theme picker can cache
 * each template side by side without clobbering the dashboard card.
 */
export async function getResumeThumbnailDataUrl(
  resume: ResumeData,
): Promise<string> {
  const cacheId = thumbnailCacheId(resume.meta.id, resume.meta.templateId);
  const contentKey = computeThumbnailKey(resume);

  const cached = await thumbnailRepository.get(cacheId);
  if (cached && cached.headerKey === contentKey) {
    return cached.dataUrl;
  }

  const dataUrl = await renderPageToPng(toPreviewResume(resume));
  await thumbnailRepository.set(cacheId, {
    headerKey: contentKey,
    dataUrl,
    updatedAt: new Date().toISOString(),
  });
  return dataUrl;
}

/** Drops every cached preview for a resume (all templates, plus the legacy
 *  un-namespaced key from before template-scoped ids). */
export async function deleteResumeThumbnails(resumeId: string): Promise<void> {
  await Promise.all([
    thumbnailRepository.delete(resumeId),
    ...REGISTERED_TEMPLATE_IDS.map((templateId) =>
      thumbnailRepository.delete(thumbnailCacheId(resumeId, templateId)),
    ),
  ]);
}

async function renderPageToPng(resume: ResumeData): Promise<string> {
  const blob = await toPdfBlob(resume);
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
