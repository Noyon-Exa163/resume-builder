import { beforeEach, describe, expect, it, vi } from "vitest";

import { createBlankResume } from "@/lib/schema/normalize";
import type { ResumeData } from "@/lib/schema/resume";

const stored: { current: ResumeData } = { current: createBlankResume() };
const deferred: Array<() => void> = [];

vi.mock("@/lib/storage/api/resumeRepository", () => ({
  resumeRepository: {
    // Resolves only when the test releases it, so a load can be held in
    // flight while the draft is edited.
    get: () =>
      new Promise<ResumeData>((resolve) => {
        deferred.push(() => resolve(stored.current));
      }),
    set: async (_id: string, value: ResumeData) => {
      stored.current = value;
    },
    list: async () => [stored.current],
    delete: async () => {},
  },
}));

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
