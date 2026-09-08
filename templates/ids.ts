/**
 * Template ids only — safe to import from server routes that must not pull
 * in react-pdf Document components (see templates/index.ts). Keep this list
 * in sync with templateRegistry; test/templates.test.ts asserts they match.
 */
export const FALLBACK_TEMPLATE_ID = "exabyting";

export const REGISTERED_TEMPLATE_IDS = [
  "exabyting",
  "minimal",
  "cyan",
] as const;

export type RegisteredTemplateId = (typeof REGISTERED_TEMPLATE_IDS)[number];

export function resolveTemplateId(id: string | undefined | null): string {
  if (id && (REGISTERED_TEMPLATE_IDS as readonly string[]).includes(id)) {
    return id;
  }
  return FALLBACK_TEMPLATE_ID;
}
