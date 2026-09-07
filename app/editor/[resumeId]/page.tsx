"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FilePlus, Loader2, Pencil, Sparkles } from "lucide-react";
import { useEditorStore } from "@/lib/store/editorStore";
import { formatLastSavedLabel } from "@/lib/utils/formatLastSaved";
import { createBlankResume, type DeepPartial } from "@/lib/schema/normalize";
import type { ResumeData } from "@/lib/schema/resume";
import { resumeRepository } from "@/lib/storage/api/resumeRepository";
import { Button, TabsField } from "@/components/ui";
import {
  AiResumeBar,
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
const DEFAULT_SIDEBAR_WIDTH = 420;
const MIN_SIDEBAR_WIDTH = 320;
const MAX_SIDEBAR_WIDTH = 640;

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

  // Seed which tab opens first from the freshly loaded resume — a blank one
  // leads with AI, one that already has content opens straight to Manual
  // Edit. Only ever seeded once per resume load; afterward the user (or a
  // completed AI import, below) drives it explicitly.
  const [activeTab, setActiveTab] = useState("ai");
  const [isCreating, setIsCreating] = useState(false);
  const hasInitializedActiveTab = useRef(false);

  useEffect(() => {
    if (hasInitializedActiveTab.current || !hasLoaded || !resume) return;
    hasInitializedActiveTab.current = true;
    const hasContent =
      Boolean(resume.personalInfo.fullName?.trim()) ||
      Boolean(resume.summary?.trim()) ||
      resume.sections.length > 0;
    setActiveTab(hasContent ? "manual" : "ai");
  }, [hasLoaded, resume]);

  // Drag-to-resize the sidebar, dragging from its left edge. The sidebar
  // sits on the right, so its width is the distance from the cursor to the
  // container's right edge — the mirror of a left-side resizer.
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  function clampSidebarWidth(width: number) {
    return Math.min(Math.max(width, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
  }

  function handleResizerPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsResizingSidebar(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleResizerPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!isResizingSidebar || !bodyRef.current) return;
    const rect = bodyRef.current.getBoundingClientRect();
    setSidebarWidth(clampSidebarWidth(rect.right - e.clientX));
  }

  function handleResizerPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!isResizingSidebar) return;
    setIsResizingSidebar(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Pointer capture may already be released
    }
  }

  function handleResizerKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = 16;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSidebarWidth((w) => clampSidebarWidth(w + step));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSidebarWidth((w) => clampSidebarWidth(w - step));
    } else if (e.key === "Home") {
      e.preventDefault();
      setSidebarWidth(MAX_SIDEBAR_WIDTH);
    } else if (e.key === "End") {
      e.preventDefault();
      setSidebarWidth(MIN_SIDEBAR_WIDTH);
    }
  }

  // Stop resizing if the pointer is released outside the handle.
  useEffect(() => {
    if (!isResizingSidebar) return;
    const stop = () => setIsResizingSidebar(false);
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, [isResizingSidebar]);

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
  // keystroke-debounced autosave. Also switch to the Manual Edit tab so
  // the newly filled-in fields are actually visible.
  function handleImport(partial: DeepPartial<ResumeData>) {
    importInto(partial);
    setActiveTab("manual");
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

      <div
        className={[
          "editor-page__body",
          isResizingSidebar && "editor-page__body--resizing",
        ]
          .filter(Boolean)
          .join(" ")}
        ref={bodyRef}
        onPointerMove={handleResizerPointerMove}
        onPointerUp={handleResizerPointerUp}
        onPointerCancel={handleResizerPointerUp}
      >
        <LivePreviewPane data={resume} />
        <div
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-valuenow={Math.round(sidebarWidth)}
          aria-valuemin={MIN_SIDEBAR_WIDTH}
          aria-valuemax={MAX_SIDEBAR_WIDTH}
          aria-label="Resize sidebar"
          className="editor-page__resizer"
          onPointerDown={handleResizerPointerDown}
          onKeyDown={handleResizerKeyDown}
        >
          <div className="editor-page__resizer-handle" />
        </div>
        <aside
          className="editor-page__sidebar"
          style={{ width: sidebarWidth }}
          aria-label="Resume editor"
        >
          <TabsField
            value={activeTab}
            onValueChange={setActiveTab}
            tabs={[
              {
                value: "ai",
                label: "AI",
                icon: Sparkles,
                content: (
                  <AiResumeBar resume={resume} onApply={handleImport} />
                ),
              },
              {
                value: "manual",
                label: "Manual Edit",
                icon: Pencil,
                content: (
                  <div className="editor-page__manual-edit">
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
                  </div>
                ),
              },
            ]}
          />
        </aside>
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
