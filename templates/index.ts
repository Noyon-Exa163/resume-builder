import { ExabyingDocument } from "./exabyting/ExabyingDocument";
import { exabytingMeta } from "./exabyting/meta";
import { MinimalDocument } from "./minimal/MinimalDocument";
import { minimalMeta } from "./minimal/meta";
import type { TemplateModule } from "./types";

/**
 * Template registry. Adding a future template = new folder under
 * templates/ + one entry here — no visual template builder needed.
 */
export const templateRegistry: Record<string, TemplateModule> = {
  exabyting: {
    meta: exabytingMeta,
    Document: ExabyingDocument,
  },
  minimal: {
    meta: minimalMeta,
    Document: MinimalDocument,
  },
};

const FALLBACK_TEMPLATE_ID = "exabyting";

export function getTemplate(id: string): TemplateModule {
  const template =
    templateRegistry[id] ?? templateRegistry[FALLBACK_TEMPLATE_ID];
  if (!template) {
    throw new Error(
      `No template registered for "${id}" and no fallback "${FALLBACK_TEMPLATE_ID}" template exists yet.`,
    );
  }
  return template;
}
