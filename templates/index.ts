import { CyanDocument } from "./cyan/CyanDocument";
import { cyanMeta } from "./cyan/meta";
import { ExabytingDocument } from "./exabyting/ExabytingDocument";
import { exabytingMeta } from "./exabyting/meta";
import { FALLBACK_TEMPLATE_ID, resolveTemplateId } from "./ids";
import { MinimalDocument } from "./minimal/MinimalDocument";
import { minimalMeta } from "./minimal/meta";
import type { TemplateModule } from "./types";

export {
  FALLBACK_TEMPLATE_ID,
  REGISTERED_TEMPLATE_IDS,
  resolveTemplateId,
} from "./ids";
export type { RegisteredTemplateId } from "./ids";

/**
 * Template registry. Adding a future template = new folder under
 * templates/ + one entry here — no visual template builder needed.
 */
export const templateRegistry: Record<string, TemplateModule> = {
  exabyting: {
    meta: exabytingMeta,
    Document: ExabytingDocument,
  },
  minimal: {
    meta: minimalMeta,
    Document: MinimalDocument,
  },
  cyan: {
    meta: cyanMeta,
    Document: CyanDocument,
  },
};

export function getTemplate(id: string): TemplateModule {
  const template = templateRegistry[resolveTemplateId(id)];
  if (!template) {
    throw new Error(
      `No template registered for "${id}" and no fallback "${FALLBACK_TEMPLATE_ID}" template exists yet.`,
    );
  }
  return template;
}
