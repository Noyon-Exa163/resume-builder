import { create } from "zustand";
import type {
  ResumeData,
  ResumeEntry,
  ResumeSection,
  SectionKind,
} from "@/lib/schema/resume";
import {
  createBlankResume,
  normalizeAndValidate,
} from "@/lib/schema/normalize";
import { resumeRepository } from "@/lib/storage/api/resumeRepository";
import { createId } from "@/lib/utils/ids";

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

  load: (id: string) => Promise<void>;
  startBlank: (templateId?: string) => ResumeData;

  setTitle: (title: string) => void;
  setTemplateId: (templateId: string) => void;
  setPageSize: (pageSize: ResumeData["meta"]["pageSize"]) => void;
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

    async load(id) {
      const token = (loadToken += 1);
      set({ isLoading: true });
      const found = await resumeRepository.get(id);

      // A newer load started while this one was in flight; let that one win.
      if (token !== loadToken) return;

      // The user began editing while this one was in flight. Applying the
      // stored copy now would silently discard those edits and clear the
      // dirty flag, leaving autosave with nothing to persist.
      if (get().isDirty) {
        set({ isLoading: false, hasLoaded: true });
        return;
      }

      set({
        resume: found ?? null,
        isLoading: false,
        isDirty: false,
        lastSavedAt: found?.meta.updatedAt ?? null,
        hasLoaded: true,
      });
    },

    startBlank(templateId) {
      const blank = normalizeAndValidate({
        meta: templateId ? { templateId } : undefined,
      });
      set({ resume: blank, isDirty: false, lastSavedAt: null });
      return blank;
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

    setPageSize(pageSize) {
      const { resume } = get();
      if (!resume) return;
      set({
        resume: touch({ ...resume, meta: { ...resume.meta, pageSize } }),
        isDirty: true,
      });
    },

    setPersonalInfo(patch) {
      const { resume } = get();
      if (!resume) return;
      set({
        resume: touch({
          ...resume,
          personalInfo: { ...resume.personalInfo, ...patch },
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
        layout: "list",
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
