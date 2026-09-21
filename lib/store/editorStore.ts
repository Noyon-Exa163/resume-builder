import { create } from "zustand";
import type {
  ResumeData,
  ResumeEntry,
  ResumeSection,
  SectionKind,
} from "@/lib/schema/resume";
import { layoutForSection } from "@/lib/schema/resume";
import {
  backfillMetaDefaults,
  createBlankResume,
  dedupeResumeIds,
  normalizeAndValidate,
  type DeepPartial,
} from "@/lib/schema/normalize";
import { resumeRepository } from "@/lib/storage/api/resumeRepository";
import {
  getResumeWithAccess,
  type ResumeAccessLevel,
} from "@/lib/storage/api/resumeAccess";
import { getResumeThumbnailDataUrl } from "@/lib/export/resumeThumbnail";
import { createId } from "@/lib/utils/ids";
import { replaceHeadlineBars } from "@/lib/schema/headline";

/**
 * Editor draft state. This is the one place editor UI reads/writes the
 * in-progress ResumeData — components never touch resumeRepository or
 * IndexedDB directly (AGENTS.md §1.6). Every mutation keeps the draft
 * schema-valid by routing through normalizeAndValidate() rather than
 * trusting partial patches.
 */
interface EditorState {
  resume: ResumeData | null;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  /** ISO timestamp of the last successful persist — not the in-memory
   * `meta.updatedAt`, which advances on every keystroke. */
  lastSavedAt: string | null;
  /** True once load() has settled at least once — distinguishes "still
   * loading" from "loaded, and it turned out this resume doesn't exist." */
  hasLoaded: boolean;
  /** The caller's relationship to `resume`, from the same request that
   * fetched it — null until load() resolves, or if `resume` is null. */
  access: ResumeAccessLevel | null;
  ownerEmail: string;

  load: (id: string) => Promise<void>;
  startBlank: (templateId?: string) => ResumeData;
  /**
   * Applies AI/heuristic/project-file-parsed data onto the currently open
   * resume — keeps the same id/createdAt (so autosave keeps writing to the
   * same row rather than orphaning a new one) but otherwise replaces
   * personalInfo/summary/sections wholesale. Throws if `partial` can't be
   * normalized into a valid ResumeData (caller should catch and show a
   * friendly message rather than letting it bubble up).
   */
  importInto: (partial: DeepPartial<ResumeData>) => void;

  setTitle: (title: string) => void;
  setTemplateId: (templateId: string) => void;
  setAccentColor: (accentColor: ResumeData["meta"]["accentColor"]) => void;
  setShowAlternatePhone: (show: boolean) => void;
  setPageSize: (pageSize: ResumeData["meta"]["pageSize"]) => void;
  setNameCasing: (nameCasing: ResumeData["meta"]["nameCasing"]) => void;
  setPersonalInfo: (patch: Partial<ResumeData["personalInfo"]>) => void;
  setSummary: (summary: string) => void;

  addSection: (kind: SectionKind, title: string) => void;
  updateSection: (sectionId: string, patch: Partial<ResumeSection>) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (orderedIds: string[]) => void;

  addEntry: (sectionId: string) => void;
  updateEntry: (
    sectionId: string,
    entryId: string,
    patch: Partial<ResumeEntry>,
  ) => void;
  removeEntry: (sectionId: string, entryId: string) => void;
  reorderEntries: (sectionId: string, orderedIds: string[]) => void;

  save: () => Promise<void>;
}

function touch(resume: ResumeData): ResumeData {
  return {
    ...resume,
    meta: { ...resume.meta, updatedAt: new Date().toISOString() },
  };
}

function mapSection(
  resume: ResumeData,
  sectionId: string,
  fn: (section: ResumeSection) => ResumeSection,
): ResumeData {
  return {
    ...resume,
    sections: resume.sections.map((s) => (s.id === sectionId ? fn(s) : s)),
  };
}

export const useEditorStore = create<EditorState>((set, get) => {
  /** Serialize persist calls so a keystroke during an in-flight save
   * cannot clobber the newer draft when the request resolves. */
  let persistTail: Promise<void> = Promise.resolve();

  /** Identifies the newest load() call. A fetch that resolves after a newer
   * one started is stale and must not be applied. */
  let loadToken = 0;

  return {
    resume: null,
    isLoading: false,
    isSaving: false,
    isDirty: false,
    lastSavedAt: null,
    hasLoaded: false,
    access: null,
    ownerEmail: "",

    async load(id) {
      const token = (loadToken += 1);
      set({ isLoading: true });
      let found: Awaited<ReturnType<typeof getResumeWithAccess>>;
      try {
        found = await getResumeWithAccess(id);
      } catch (error) {
        console.error("Failed to load resume:", error);
        // Leave the loading state so the page doesn't sit on its skeleton
        // forever; with no resume it falls through to the not-found screen.
        if (token === loadToken) set({ isLoading: false, hasLoaded: true });
        return;
      }

      // A newer load started while this one was in flight; let that one win.
      if (token !== loadToken) return;

      // The user began editing while this one was in flight. Applying the
      // stored copy now would silently discard those edits and clear the
      // dirty flag, leaving autosave with nothing to persist.
      if (get().isDirty) {
        set({ isLoading: false, hasLoaded: true });
        return;
      }

      // Self-heal a resume that already has a duplicate section/entry id, or
      // is missing a `meta` field added after it was saved — both are
      // no-ops (same reference back) for the overwhelming majority of
      // resumes that don't need it.
      const repaired = found
        ? backfillMetaDefaults(dedupeResumeIds(found.resume))
        : null;
      // A viewer can't save, so a repaired copy stays in memory only; marking
      // it dirty would just queue writes the server rejects.
      const wasRepaired =
        found && found.access !== "viewer" ? repaired !== found.resume : false;

      set({
        resume: repaired,
        isLoading: false,
        isDirty: wasRepaired,
        lastSavedAt: found?.resume.meta.updatedAt ?? null,
        hasLoaded: true,
        access: found?.access ?? null,
        ownerEmail: found?.ownerEmail ?? "",
      });
    },

    startBlank(templateId) {
      const blank = normalizeAndValidate({
        meta: templateId ? { templateId } : undefined,
      });
      set({ resume: blank, isDirty: false, lastSavedAt: null });
      return blank;
    },

    importInto(partial) {
      const { resume } = get();
      if (!resume) return;
      // The imported person's name is a better resume title than whatever
      // this draft was called before (usually still "Untitled Resume") or
      // the AI's own guess at a document title — prefer it when present.
      const importedName = partial.personalInfo?.fullName?.trim();
      const merged = normalizeAndValidate({
        ...partial,
        meta: {
          ...partial.meta,
          id: resume.meta.id,
          createdAt: resume.meta.createdAt,
          templateId: partial.meta?.templateId ?? resume.meta.templateId,
          pageSize: partial.meta?.pageSize ?? resume.meta.pageSize,
          nameCasing: partial.meta?.nameCasing ?? resume.meta.nameCasing,
          accentColor: partial.meta?.accentColor ?? resume.meta.accentColor,
          alternatePhoneVisible:
            partial.meta?.alternatePhoneVisible ?? resume.meta.alternatePhoneVisible,
          title: importedName || partial.meta?.title || resume.meta.title,
        },
      });
      set({ resume: touch(merged), isDirty: true });
    },

    setTitle(title) {
      const { resume } = get();
      if (!resume) return;
      set({
        resume: touch({ ...resume, meta: { ...resume.meta, title } }),
        isDirty: true,
      });
    },

    setTemplateId(templateId) {
      const { resume } = get();
      if (!resume) return;
      set({
        resume: touch({ ...resume, meta: { ...resume.meta, templateId } }),
        isDirty: true,
      });
    },

    setAccentColor(accentColor) {
      const { resume } = get();
      if (!resume) return;
      set({
        resume: touch({ ...resume, meta: { ...resume.meta, accentColor } }),
        isDirty: true,
      });
    },

    setShowAlternatePhone(show) {
      const { resume } = get();
      if (!resume) return;
      set({
        resume: touch({
          ...resume,
          meta: { ...resume.meta, alternatePhoneVisible: show },
        }),
        isDirty: true,
      });
    },

    setPageSize(pageSize) {
      const { resume } = get();
      if (!resume) return;
      set({
        resume: touch({ ...resume, meta: { ...resume.meta, pageSize } }),
        isDirty: true,
      });
    },

    setNameCasing(nameCasing) {
      const { resume } = get();
      if (!resume) return;
      set({
        resume: touch({ ...resume, meta: { ...resume.meta, nameCasing } }),
        isDirty: true,
      });
    },

    setPersonalInfo(patch) {
      const { resume } = get();
      if (!resume) return;
      const next =
        patch.headline !== undefined
          ? { ...patch, headline: replaceHeadlineBars(patch.headline) }
          : patch;
      set({
        resume: touch({
          ...resume,
          personalInfo: { ...resume.personalInfo, ...next },
        }),
        isDirty: true,
      });
    },

    setSummary(summary) {
      const { resume } = get();
      if (!resume) return;
      set({ resume: touch({ ...resume, summary }), isDirty: true });
    },

    addSection(kind, title) {
      const { resume } = get();
      if (!resume) return;
      const section: ResumeSection = {
        id: createId(),
        kind,
        title,
        visible: true,
        layout: layoutForSection(kind, title),
        entries: [],
      };
      set({
        resume: touch({ ...resume, sections: [...resume.sections, section] }),
        isDirty: true,
      });
    },

    updateSection(sectionId, patch) {
      const { resume } = get();
      if (!resume) return;
      set({
        resume: touch(
          mapSection(resume, sectionId, (s) => ({ ...s, ...patch })),
        ),
        isDirty: true,
      });
    },

    removeSection(sectionId) {
      const { resume } = get();
      if (!resume) return;
      set({
        resume: touch({
          ...resume,
          sections: resume.sections.filter((s) => s.id !== sectionId),
        }),
        isDirty: true,
      });
    },

    reorderSections(orderedIds) {
      const { resume } = get();
      if (!resume) return;
      const byId = new Map(resume.sections.map((s) => [s.id, s]));
      const sections = orderedIds
        .map((id) => byId.get(id))
        .filter((s): s is ResumeSection => Boolean(s));
      set({ resume: touch({ ...resume, sections }), isDirty: true });
    },

    addEntry(sectionId) {
      const { resume } = get();
      if (!resume) return;
      const entry: ResumeEntry = {
        id: createId(),
        title: "",
        bullets: [],
        tags: [],
      };
      set({
        resume: touch(
          mapSection(resume, sectionId, (s) => ({
            ...s,
            entries: [...s.entries, entry],
          })),
        ),
        isDirty: true,
      });
    },

    updateEntry(sectionId, entryId, patch) {
      const { resume } = get();
      if (!resume) return;
      set({
        resume: touch(
          mapSection(resume, sectionId, (s) => ({
            ...s,
            entries: s.entries.map((e) =>
              e.id === entryId ? { ...e, ...patch } : e,
            ),
          })),
        ),
        isDirty: true,
      });
    },

    removeEntry(sectionId, entryId) {
      const { resume } = get();
      if (!resume) return;
      set({
        resume: touch(
          mapSection(resume, sectionId, (s) => ({
            ...s,
            entries: s.entries.filter((e) => e.id !== entryId),
          })),
        ),
        isDirty: true,
      });
    },

    reorderEntries(sectionId, orderedIds) {
      const { resume } = get();
      if (!resume) return;
      set({
        resume: touch(
          mapSection(resume, sectionId, (s) => {
            const byId = new Map(s.entries.map((e) => [e.id, e]));
            const entries = orderedIds
              .map((id) => byId.get(id))
              .filter((e): e is ResumeEntry => Boolean(e));
            return { ...s, entries };
          }),
        ),
        isDirty: true,
      });
    },

    async save() {
      const run = async () => {
        if (!get().resume || !get().isDirty) return;
        set({ isSaving: true });
        try {
          while (get().isDirty) {
            const snapshot = get().resume;
            if (!snapshot) return;
            const valid = normalizeAndValidate(snapshot);
            await resumeRepository.set(valid.meta.id, valid);
            // Warms the dashboard's thumbnail cache right away rather than
            // leaving it for the card's next render to notice the header
            // or summary changed — a no-op if those fields didn't change.
            // Fire-and-forget: a failure here must never surface as a save
            // failure.
            getResumeThumbnailDataUrl(valid).catch((error) => {
              console.error("Failed to refresh resume thumbnail:", error);
            });
            if (get().resume === snapshot) {
              set({
                resume: valid,
                isDirty: false,
                lastSavedAt: valid.meta.updatedAt,
              });
            } else {
              set({ lastSavedAt: valid.meta.updatedAt });
            }
          }
        } catch (error) {
          console.error("Failed to save resume:", error);
        } finally {
          set({ isSaving: false });
        }
      };

      const pending = persistTail.then(run, run);
      persistTail = pending.then(
        () => undefined,
        () => undefined,
      );
      await pending;
    },
  };
});

export { createBlankResume };
