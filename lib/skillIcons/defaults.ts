import type { DeepPartial } from "@/lib/schema/normalize";
import type { ResumeData } from "@/lib/schema/resume";

/**
 * Decides the "Show Skill Icons" setting for skills sections that come back
 * from an AI turn.
 *
 * The AI returns the whole resume, and never knows about this setting, so
 * every skills section arrives with the schema default (off). Without this,
 * any AI edit would silently switch icons off. A section that already
 * existed (matched by id) keeps whatever the person chose; a section the AI
 * just created — for example when importing a CV — starts with icons off,
 * like any new resume. Icons make the exported file much larger, so people
 * switch them on themselves.
 */
export function applySkillIconDefaults(
  current: ResumeData,
  update: DeepPartial<ResumeData>,
): DeepPartial<ResumeData> {
  if (!update.sections) return update;
  return {
    ...update,
    sections: update.sections.map((section) => {
      if (section?.kind !== "skills") return section;
      const existing = current.sections.find((s) => s.id === section.id);
      return { ...section, showSkillIcons: existing?.showSkillIcons ?? false };
    }),
  };
}
