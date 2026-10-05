import { SKILL_ICON_CATALOG } from "./catalog";
import { SKILL_ICON_ASPECTS } from "./iconAspects";

/** Where the pre-rendered icon PNGs are served from (see public/skill-icons). */
export const SKILL_ICON_DIR = "/skill-icons";

/**
 * Reduces a skill name to the form used for matching: lowercase letters and
 * digits only, with "+" and "#" spelled out so "C++" and "C#" stay distinct
 * from plain "C".
 */
export function skillIconKey(skill: string): string {
  return skill
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/#/g, "sharp")
    .replace(/[^a-z0-9]/g, "");
}

/** Every spelling in the catalog (and each slug) mapped to its icon slug. */
const slugBySkillKey = new Map<string, string>();
for (const [slug, ...spellings] of SKILL_ICON_CATALOG) {
  for (const name of [slug, ...spellings]) {
    const key = skillIconKey(name);
    if (key && !slugBySkillKey.has(key)) slugBySkillKey.set(key, slug);
  }
}

/** Exposed so a test can catch two different icons claiming one spelling. */
export function listSkillIconClaims(): Array<{ key: string; slug: string }> {
  return SKILL_ICON_CATALOG.flatMap(([slug, ...spellings]) =>
    [slug, ...spellings]
      .map((name) => ({ key: skillIconKey(name), slug }))
      .filter((claim) => claim.key),
  );
}

/**
 * The icon slug for a skill, or undefined when we don't have one. Matching is
 * exact (see catalog.ts) — never a guess. A trailing qualifier in brackets,
 * like "Azure (exposure)", is ignored if the full text has no match.
 */
export function resolveSkillIconSlug(skill: string): string | undefined {
  return (
    slugBySkillKey.get(skillIconKey(skill)) ??
    slugBySkillKey.get(skillIconKey(skill.replace(/\([^)]*\)/g, "")))
  );
}

/** URL of the skill's icon image, or undefined when it has none. */
export function resolveSkillIconSrc(skill: string): string | undefined {
  const slug = resolveSkillIconSlug(skill);
  return slug ? `${SKILL_ICON_DIR}/${slug}.png` : undefined;
}

/** Icons wider than this (ratio of width to height) are squeezed to fit. */
const MAX_ICON_WIDTH_RATIO = 2.5;
/** Anything up to this reads as a square-ish mark and gets a square slot, so
 *  a row of icons doesn't jitter in width. */
const SQUARE_SLOT_LIMIT = 1.4;

export interface SkillIcon {
  src: string;
  /** Slot width as a multiple of the icon height: 1 for ordinary marks,
   *  more for wide logos (Go, jQuery) that would be unreadable squeezed
   *  into a square. */
  widthRatio: number;
}

/** The icon for a skill, or undefined when it has none. */
export function resolveSkillIcon(skill: string): SkillIcon | undefined {
  const slug = resolveSkillIconSlug(skill);
  if (!slug) return undefined;
  const aspect = SKILL_ICON_ASPECTS[slug] ?? 1;
  return {
    src: `${SKILL_ICON_DIR}/${slug}.png`,
    widthRatio:
      aspect <= SQUARE_SLOT_LIMIT ? 1 : Math.min(aspect, MAX_ICON_WIDTH_RATIO),
  };
}
