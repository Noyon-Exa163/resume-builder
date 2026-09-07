"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FilePlus, Loader2 } from "lucide-react";
import { useEditorStore } from "@/lib/store/editorStore";
import { formatLastSavedLabel } from "@/lib/utils/formatLastSaved";
import { createBlankResume, type DeepPartial } from "@/lib/schema/normalize";
import type { ResumeData } from "@/lib/schema/resume";
import { resumeRepository } from "@/lib/storage/api/resumeRepository";
import { Button, CollapsibleSection } from "@/components/ui";
import { SplitPane } from "@/components/common/SplitPane";
import {
  ImportResumeCard,
  PersonalInfoForm,
  SummaryForm,
  SectionList,
  AddSectionMenu,
  LivePreviewPane,
  ExportButtons,
} from "@/components/editor";
import "./page.css";

const AUTOSAVE_DELAY_MS = 5_000;
const SAVE_STATUS_TICK_MS = 30_000;

export default function EditorPage() {
  const params = useParams<{ resumeId: string }>();
  const router = useRouter();
  const {
    resume,
    isLoading,
    hasLoaded,
    isDirty,
    isSaving,
    lastSavedAt,
    load,
    save,
    importInto,
    setTitle,
    setPersonalInfo,
    setSummary,
    addSection,
    updateSection,
    removeSection,
    reorderSections,
    addEntry,
    updateEntry,
    removeEntry,
    reorderEntries,
  } = useEditorStore();

  useEffect(() => {
    if (params.resumeId) void load(params.resumeId);
  }, [params.resumeId, load]);

  useEffect(() => {
    if (!isDirty) return;
    const timeoutId = window.setTimeout(() => {
      void save();
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [resume, isDirty, save]);

  useEffect(() => {
    const flush = () => {
      if (useEditorStore.getState().isDirty) {
        void useEditorStore.getState().save();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, []);

  // Controlled rather than Collapsible's `defaultOpen` — that prop only sets
  // the *initial* state of an uncontrolled component, and recomputing
  // "does this resume have content" on every render (it must, to react to an
  // import) makes it look like the default itself is changing after mount,
  // which Base UI warns about. Seed it once from the freshly loaded resume,
  // then drive it explicitly (e.g. auto-expanding after an import below).
  const [isManualEditOpen, setIsManualEditOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const hasInitializedManualEditOpen = useRef(false);

  useEffect(() => {
    if (hasInitializedManualEditOpen.current || !hasLoaded || !resume) return;
    hasInitializedManualEditOpen.current = true;
    setIsManualEditOpen(
      Boolean(resume.personalInfo.fullName?.trim()) ||
        Boolean(resume.summary?.trim()) ||
        resume.sections.length > 0,
    );
  }, [hasLoaded, resume]);

  async function handleBack() {
    await save();
    router.push("/");
  }

  async function handleNewResume() {
    setIsCreating(true);
    try {
      await save();
      const blank = createBlankResume();
      await resumeRepository.set(blank.meta.id, blank);
      router.push(`/editor/${blank.meta.id}`);
    } finally {
      setIsCreating(false);
    }
  }

  // A completed AI/heuristic extraction is a deliberate, commit-worthy
  // moment — persist right away rather than waiting out the normal
  // keystroke-debounced autosave. Also expand the manual-edit section so
  // the newly filled-in fields are actually visible.
  function handleImport(partial: DeepPartial<ResumeData>) {
    importInto(partial);
    setIsManualEditOpen(true);
    void save();
  }

  if (isLoading || !hasLoaded) {
    return <main className="editor-page__loading">Loading…</main>;
  }

  if (resume === null) {
    return (
      <main className="editor-page__loading">
        <div className="editor-page__not-found">
          <p>
            This resume doesn&apos;t exist, or you don&apos;t have access to it.
          </p>
          <Button
            type="button"
            variant="tertiary"
            size="m"
            onClick={() => router.push("/")}
          >
            ← Back to My Resumes
          </Button>
        </div>
      </main>
    );
  }

  const hasContent =
    Boolean(resume.personalInfo.fullName?.trim()) ||
    Boolean(resume.summary?.trim()) ||
    resume.sections.length > 0;

  return (
    <main className="editor-page">
      <header className="editor-page__header">
        <Button
          type="button"
          variant="secondary"
          size="m"
          iconOnly
          aria-label="Back to My Resumes"
          onClick={() => void handleBack()}
        >
          <ArrowLeft size={18} />
        </Button>
        <input
          className="editor-page__title-input"
          value={resume.meta.title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Resume title"
        />
        {/* Keyed so a new save restarts the elapsed-time clock immediately
            rather than waiting out the current tick. */}
        <LastSavedStatus
          key={lastSavedAt}
          lastSavedAt={lastSavedAt}
          isSaving={isSaving}
        />
        <div className="editor-page__actions">
          <ExportButtons data={resume} />
          <Button
            type="button"
            variant="secondary"
            size="m"
            iconOnly
            aria-label="New Resume"
            disabled={isCreating}
            onClick={() => void handleNewResume()}
          >
            {isCreating ? (
              <Loader2 size={18} className="button__icon--spin" />
            ) : (
              <FilePlus size={18} />
            )}
          </Button>
        </div>
      </header>

      <div className="editor-page__body">
        <SplitPane
          primaryAriaLabel="Resume editor"
          secondaryAriaLabel="Live preview"
          primary={
            <div className="editor-page__form-pane">
              <ImportResumeCard
                hasExistingContent={hasContent}
                onImport={handleImport}
              />
              <CollapsibleSection
                label="Edit Manually"
                open={isManualEditOpen}
                onOpenChange={setIsManualEditOpen}
              >
                <PersonalInfoForm
                  value={resume.personalInfo}
                  onChange={setPersonalInfo}
                />
                <SummaryForm
                  value={resume.summary ?? ""}
                  onChange={setSummary}
                />
                <SectionList
                  sections={resume.sections}
                  onUpdateSection={updateSection}
                  onRemoveSection={removeSection}
                  onReorderSections={reorderSections}
                  onAddEntry={addEntry}
                  onUpdateEntry={updateEntry}
                  onRemoveEntry={removeEntry}
                  onReorderEntries={reorderEntries}
                />
                <AddSectionMenu onAddSection={addSection} />
              </CollapsibleSection>
            </div>
          }
          secondary={<LivePreviewPane data={resume} />}
        />
      </div>
    </main>
  );
}

function LastSavedStatus({
  lastSavedAt,
  isSaving,
}: {
  lastSavedAt: string | null;
  isSaving: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, SAVE_STATUS_TICK_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  const label = isSaving
    ? "Saving…"
    : lastSavedAt
      ? formatLastSavedLabel(lastSavedAt, new Date(now))
      : null;

  if (!label) return null;

  return (
    <p className="editor-page__save-status" aria-live="polite">
      {label}
    </p>
  );
}
