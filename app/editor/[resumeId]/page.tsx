"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEditorStore } from "@/lib/store/editorStore";
import { SplitPane } from "@/components/common/SplitPane";
import {
  PersonalInfoForm,
  SummaryForm,
  SectionList,
  AddSectionMenu,
  LivePreviewPane,
  ExportButtons,
} from "@/components/editor";
import "./page.css";

export default function EditorPage() {
  const params = useParams<{ resumeId: string }>();
  const router = useRouter();
  const {
    resume,
    isLoading,
    hasLoaded,
    isDirty,
    isSaving,
    load,
    save,
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

  if (isLoading || !hasLoaded) {
    return <main className="editor-page__loading">Loading…</main>;
  }

  if (resume === null) {
    return (
      <main className="editor-page__loading">
        <div className="editor-page__not-found">
          <p>This resume doesn&apos;t exist, or you don&apos;t have access to it.</p>
          <button
            type="button"
            className="editor-page__back"
            onClick={() => router.push("/")}
          >
            ← Back to My Resumes
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="editor-page">
      <header className="editor-page__header">
        <button
          type="button"
          className="editor-page__back"
          onClick={() => router.push("/")}
        >
          ← My Resumes
        </button>
        <input
          className="editor-page__title-input"
          value={resume.meta.title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Resume title"
        />
        <button
          type="button"
          className="editor-page__save"
          onClick={() => void save()}
          disabled={isSaving || !isDirty}
        >
          {isSaving ? "Saving…" : isDirty ? "Save" : "Saved"}
        </button>
        <ExportButtons data={resume} />
      </header>

      <div className="editor-page__body">
        <SplitPane
          primaryAriaLabel="Resume editor"
          secondaryAriaLabel="Live preview"
          primary={
            <div className="editor-page__form-pane">
              <PersonalInfoForm
                value={resume.personalInfo}
                onChange={setPersonalInfo}
              />
              <SummaryForm value={resume.summary ?? ""} onChange={setSummary} />
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
            </div>
          }
          secondary={<LivePreviewPane data={resume} />}
        />
      </div>
    </main>
  );
}
