"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useEditorStore } from "@/lib/store/editorStore";
import { formatLastSavedLabel } from "@/lib/utils/formatLastSaved";
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

  async function handleBack() {
    await save();
    router.push("/");
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
        <ExportButtons data={resume} />
      </header>

      <div className="editor-page__body">
        <SplitPane
          primaryAriaLabel="Resume editor"
          secondaryAriaLabel="Live preview"
          primary={
            <div className="editor-page__form-pane">
              <ImportResumeCard
                hasExistingContent={hasContent}
                onImport={importInto}
              />
              <CollapsibleSection
                label="Edit Manually"
                defaultOpen={hasContent}
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
