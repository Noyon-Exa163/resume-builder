import { createElement } from "react";
import { pdf } from "@react-pdf/renderer";
import type { ResumeData } from "@/lib/schema/resume";
import { getTemplate } from "@/templates";

/**
 * Renders a resume to a PDF Blob using the template's Document component —
 * the exact same component the live preview (LivePreviewPane) uses, so there
 * is zero drift between what the user sees and what they download.
 *
 * Runs entirely client-side. No API routes needed.
 */
export async function toPdfBlob(data: ResumeData): Promise<Blob> {
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
