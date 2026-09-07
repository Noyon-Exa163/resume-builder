import type { TemplateModule } from "./types";

/**
 * Template registry. Adding a future template = new folder under
 * templates/ + one entry here — no visual template builder needed.
 * (Empty until Phase 1 adds the "exabyting" template.)
 */
export const templateRegistry: Record<string, TemplateModule> = {};

const FALLBACK_TEMPLATE_ID = "exabyting";

export function getTemplate(id: string): TemplateModule {
  const template = templateRegistry[id] ?? templateRegistry[FALLBACK_TEMPLATE_ID];
  if (!template) {
    throw new Error(
      `No template registered for "${id}" and no fallback "${FALLBACK_TEMPLATE_ID}" template exists yet.`,
    );
  }
  return template;
}
