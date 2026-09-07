import type { ComponentType } from "react";
import type { PageSize, ResumeData } from "@/lib/schema/resume";

export interface TemplateMeta {
  id: string;
  name: string;
  thumbnailSrc: string;
  pageSize: PageSize;
  description?: string;
}

export interface ResumeTemplateProps {
  data: ResumeData;
}

/**
 * A template's `Document` is a react-pdf `<Document>...</Document>` root
 * component — the exact same component drives the live preview
 * (PDFViewer/blob) and the final PDF/PNG export, so there is one render
 * path and zero drift between what a user sees and what they download.
 * See AGENTS.md for why this is a different styling system from the app
 * chrome (react-pdf StyleSheet objects, not CSS).
 */
export interface TemplateModule {
  meta: TemplateMeta;
  Document: ComponentType<ResumeTemplateProps>;
}
