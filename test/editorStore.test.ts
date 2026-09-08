import { beforeEach, describe, expect, it, vi } from "vitest";

import { createBlankResume } from "@/lib/schema/normalize";
import type { ResumeData } from "@/lib/schema/resume";

const stored: { current: ResumeData } = { current: createBlankResume() };
const deferred: Array<() => void> = [];

vi.mock("@/lib/storage/api/resumeRepository", () => ({
  resumeRepository: {
    get: async () => stored.current,
    set: async (_id: string, value: ResumeData) => {
      stored.current = value;
    },
    list: async () => [stored.current],
    delete: async () => {},
  },
}));

// editorStore.load() fetches the resume and the caller's access together
// (see lib/storage/api/resumeAccess.ts's getResumeWithAccess) — mocked here
// rather than resumeRepository.get() above, which load() no longer calls.
vi.mock("@/lib/storage/api/resumeAccess", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/storage/api/resumeAccess")>();
  return {
    ...actual,
    // Resolves only when the test releases it, so a load can be held in
    // flight while the draft is edited.
    getResumeWithAccess: () =>
      new Promise((resolve) => {
        deferred.push(() =>
          resolve({
            resume: stored.current,
            access: "owner",
            ownerEmail: "owner@example.com",
          }),
        );
      }),
  };
});

const { useEditorStore } = await import("@/lib/store/editorStore");

describe("editorStore.load", () => {
  beforeEach(() => {
    deferred.length = 0;
    stored.current = createBlankResume();
    stored.current.personalInfo.fullName = "Stored Name";
    useEditorStore.setState({
      resume: null,
      isLoading: false,
      isSaving: false,
      isDirty: false,
      lastSavedAt: null,
      hasLoaded: false,
      access: null,
      ownerEmail: "",
    });
  });

  it("keeps edits made while the fetch was in flight", async () => {
    const pending = useEditorStore.getState().load(stored.current.meta.id);

    useEditorStore.setState({
      resume: { ...stored.current, summary: "Typed while loading" },
      isDirty: true,
    });

    deferred.forEach((release) => release());
    await pending;

    const state = useEditorStore.getState();
    expect(state.resume?.summary).toBe("Typed while loading");
    expect(state.isDirty).toBe(true);
    expect(state.hasLoaded).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it("ignores a fetch superseded by a newer load", async () => {
    const first = useEditorStore.getState().load(stored.current.meta.id);
    const second = useEditorStore.getState().load(stored.current.meta.id);

    // Resolve the newer request first, then let the stale one settle.
    deferred[1]();
    await second;
    useEditorStore.setState({ resume: null });

    deferred[0]();
    await first;

    expect(useEditorStore.getState().resume).toBeNull();
  });

  it("applies the stored copy when nothing was edited", async () => {
    const pending = useEditorStore.getState().load(stored.current.meta.id);
    deferred.forEach((release) => release());
    await pending;

    const state = useEditorStore.getState();
    expect(state.resume?.personalInfo.fullName).toBe("Stored Name");
    expect(state.isDirty).toBe(false);
  });
});

describe("editorStore.importInto", () => {
  beforeEach(() => {
    const existing = createBlankResume();
    existing.meta.title = "Untitled Resume";
    useEditorStore.setState({
      resume: existing,
      isLoading: false,
      isSaving: false,
      isDirty: false,
      lastSavedAt: null,
      hasLoaded: true,
    });
  });

  it("renames the resume after the imported person's name", () => {
    useEditorStore.getState().importInto({
      personalInfo: { fullName: "Ada Lovelace" },
      sections: [],
    });

    const state = useEditorStore.getState();
    expect(state.resume?.meta.title).toBe("Ada Lovelace");
    expect(state.resume?.personalInfo.fullName).toBe("Ada Lovelace");
    expect(state.isDirty).toBe(true);
  });

  it("keeps the id and createdAt of the resume being edited", () => {
    const before = useEditorStore.getState().resume!;

    useEditorStore.getState().importInto({
      personalInfo: { fullName: "Ada Lovelace" },
    });

    const after = useEditorStore.getState().resume!;
    expect(after.meta.id).toBe(before.meta.id);
    expect(after.meta.createdAt).toBe(before.meta.createdAt);
  });

  it("falls back to the existing title when no name was extracted", () => {
    useEditorStore.getState().importInto({ summary: "No name in this one" });

    expect(useEditorStore.getState().resume?.meta.title).toBe(
      "Untitled Resume",
    );
  });
});

describe("editorStore.setPersonalInfo", () => {
  beforeEach(() => {
    useEditorStore.setState({
      resume: createBlankResume(),
      isLoading: false,
      isSaving: false,
      isDirty: false,
      lastSavedAt: null,
      hasLoaded: true,
    });
  });

  it("keeps a trailing space in the headline while typing", () => {
    useEditorStore.getState().setPersonalInfo({ headline: "DevOps " });

    expect(useEditorStore.getState().resume?.personalInfo.headline).toBe(
      "DevOps ",
    );
  });

  it("still rewrites pipes to bullets without eating the following space", () => {
    useEditorStore
      .getState()
      .setPersonalInfo({ headline: "DevOps Engineer | " });

    expect(useEditorStore.getState().resume?.personalInfo.headline).toBe(
      "DevOps Engineer • ",
    );
  });
});
