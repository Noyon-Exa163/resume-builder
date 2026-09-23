"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  FilePlus,
  Loader2,
  MoreVertical,
  Palette,
  Pencil,
  Share2,
  Sparkles,
} from "lucide-react";
import { useEditorStore } from "@/lib/store/editorStore";
import { createBlankResume, type DeepPartial } from "@/lib/schema/normalize";
import type { ResumeData } from "@/lib/schema/resume";
import { resumeRepository } from "@/lib/storage/api/resumeRepository";
import { fetchDefaultTemplateId } from "@/lib/storage/api/appDefaults";
import { canManageResume } from "@/lib/storage/api/resumeAccess";
import { restoreResumeVersion } from "@/lib/storage/api/resumeHistory";
import { resumeHasContent } from "@/lib/export/shared";
import {
  ActionMenu,
  BottomTabBar,
  Button,
  Skeleton,
  TabsField,
} from "@/components/ui";
import { ShareDialog } from "@/components/common/ShareDialog";
import { SaveStatusButton } from "@/components/editor/SaveStatusButton";
import { ResumeHistoryDialog } from "@/components/editor/ResumeHistoryDialog";
import {
  AiChatPanel,
  PersonalInfoForm,
  SummaryForm,
  SectionList,
  AddSectionMenu,
  LivePreviewPane,
  ExportButtons,
  ThemePicker,
} from "@/components/editor";
import "./page.css";

const AUTOSAVE_DELAY_MS = 5_000;
const DEFAULT_SIDEBAR_WIDTH = 420;
const MIN_SIDEBAR_WIDTH = 320;
const MAX_SIDEBAR_WIDTH = 640;

/** The bottom tab bar's extra view — the rest map onto the sidebar tabs. */
const PREVIEW_VIEW = "preview";

const COMPACT_VIEWS = [
  { value: PREVIEW_VIEW, label: "Preview", icon: Eye },
  { value: "ai", label: "AI", icon: Sparkles },
  { value: "manual", label: "Edit", icon: Pencil },
  { value: "theme", label: "Theme", icon: Palette },
];

/** Sidebar width travels as a custom property so page.css can ignore it
 *  once the layout goes single-view (no inline width to override). */
function sidebarWidthStyle(width: number): CSSProperties {
  return { "--editor-sidebar-width": `${width}px` } as CSSProperties;
}

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
    access,
    ownerEmail,
    load,
    save,
    importInto,
    setTitle,
    setTemplateId,
    setAccentColor,
    setShowAlternatePhone,
    setNameCasing,
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

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [importCelebrateKey, setImportCelebrateKey] = useState(0);

  // access/ownerEmail come from the same request that loads `resume` (see
  // editorStore.load()) — there is no longer a window where the resume is
  // loaded but access is still unconfirmed, so failing closed here is just
  // "haven't loaded yet," the same as the rest of the loading state.
  const isReadOnly = access === "viewer";

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

  // AI is always the tab the editor opens on — the chat transcript itself
  // (not a tab switch) is what shows the user what's changed.
  const [activeTab, setActiveTab] = useState("ai");
  // Below desktop width only one pane shows at a time, picked by the bottom
  // tab bar: the preview, or the sidebar on its active tab. Ignored by the
  // desktop layout, where both panes are always visible.
  const [isPreviewShown, setIsPreviewShown] = useState(false);

  // Pick the starting compact view once per resume, as soon as it loads: a
  // blank resume opens on AI (to import or describe one), a filled-in one
  // opens on its preview. Done during render, not in an effect, so the
  // wrong view never paints first. Desktop ignores isPreviewShown.
  const [startViewResumeId, setStartViewResumeId] = useState<string | null>(
    null,
  );
  if (resume && hasLoaded && resume.meta.id !== startViewResumeId) {
    setStartViewResumeId(resume.meta.id);
    setIsPreviewShown(resumeHasContent(resume));
  }

  function handleCompactViewChange(view: string) {
    if (view === PREVIEW_VIEW) {
      setIsPreviewShown(true);
      return;
    }
    setIsPreviewShown(false);
    setActiveTab(view);
  }
  const [isCreating, setIsCreating] = useState(false);

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
      const templateId = await fetchDefaultTemplateId();
      const blank = createBlankResume(templateId);
      await resumeRepository.set(blank.meta.id, blank);
      router.push(`/editor/${blank.meta.id}`);
    } finally {
      setIsCreating(false);
    }
  }

  // A completed AI/heuristic extraction is a deliberate, commit-worthy
  // moment — persist right away rather than waiting out the normal
  // keystroke-debounced autosave. Stays on the AI tab: the chat reply
  // already confirms what changed, right where the user is looking.
  function handleImport(partial: DeepPartial<ResumeData>) {
    importInto(partial);
    setImportCelebrateKey((key) => key + 1);
    void save();
  }

  async function handleRestoreVersion(versionId: string) {
    if (!resume) return;
    // Flush pending edits first, so the restore isn't overwritten by a stale
    // autosave a moment later.
    await save();
    if (useEditorStore.getState().isDirty) {
      throw new Error(
        "Your latest edits couldn't be saved yet. Wait a moment and try again.",
      );
    }
    const restored = await restoreResumeVersion(resume.meta.id, versionId);
    useEditorStore.setState({
      resume: restored,
      isDirty: false,
      lastSavedAt: restored.meta.updatedAt,
    });
    setIsHistoryOpen(false);
  }

  if (isLoading || !hasLoaded) {
    return (
      <main className="editor-page">
        <header className="editor-page__header">
          <Skeleton radius="full" width={40} height={40} />
          <Skeleton width={160} height={20} />
          <div className="editor-page__header-end">
            <Skeleton width={140} height={40} radius="md" />
          </div>
        </header>
        <div className="editor-page__body">
          <Skeleton radius="none" className="editor-page__preview-skeleton" />
          <div
            className="editor-page__sidebar"
            style={sidebarWidthStyle(DEFAULT_SIDEBAR_WIDTH)}
          >
            <div className="editor-page__sidebar-skeleton">
              <Skeleton height={36} />
              <Skeleton height={100} />
              <Skeleton height={100} />
              <Skeleton height={100} />
            </div>
          </div>
        </div>
      </main>
    );
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
            ← Back to Resumes
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
          aria-label="Back to Resumes"
          onClick={() => void handleBack()}
        >
          <ArrowLeft size={18} />
        </Button>
        <span className="editor-page__title">
          <span className="editor-page__title-sizer" aria-hidden="true">
            {`${resume.meta.title}\u00a0`}
          </span>
          <input
            className="editor-page__title-input"
            value={resume.meta.title}
            onChange={(e) => setTitle(e.target.value)}
            readOnly={isReadOnly}
            aria-label="Resume title"
            size={1}
          />
        </span>
        <div className="editor-page__header-end">
          {pageCount != null && (
            <p className="editor-page__save-status">
              {pageCount === 1 ? "1 page" : `${pageCount} pages`}
            </p>
          )}
          <SaveStatusButton
            isSaving={isSaving}
            isDirty={isDirty}
            lastSavedAt={lastSavedAt}
            onClick={() => setIsHistoryOpen(true)}
          />
          <div className="editor-page__actions">
            <ExportButtons data={resume} />
            <div className="editor-page__inline-actions">
              {access != null && canManageResume(access) && (
                <Button
                  type="button"
                  variant="secondary"
                  size="m"
                  iconOnly
                  aria-label="Share Resume"
                  onClick={() => setIsShareOpen(true)}
                >
                  <Share2 size={18} />
                </Button>
              )}
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
            <span className="editor-page__more-actions">
              <ActionMenu
                trigger={
                  <Button
                    type="button"
                    variant="secondary"
                    size="m"
                    iconOnly
                    aria-label="More Actions"
                  >
                    <MoreVertical size={18} />
                  </Button>
                }
                items={[
                  access != null &&
                    canManageResume(access) && {
                      label: "Share Resume",
                      icon: Share2,
                      onSelect: () => setIsShareOpen(true),
                    },
                  {
                    label: "New Resume",
                    icon: FilePlus,
                    disabled: isCreating,
                    onSelect: () => void handleNewResume(),
                  },
                ]}
              />
            </span>
          </div>
        </div>
      </header>

      <div
        className={[
          "editor-page__body",
          isResizingSidebar && "editor-page__body--resizing",
        ]
          .filter(Boolean)
          .join(" ")}
        data-compact-view={
          isReadOnly ? "read-only" : isPreviewShown ? PREVIEW_VIEW : "panel"
        }
        ref={bodyRef}
        onPointerMove={handleResizerPointerMove}
        onPointerUp={handleResizerPointerUp}
        onPointerCancel={handleResizerPointerUp}
      >
        <LivePreviewPane
          data={resume}
          onPageCountChange={setPageCount}
          celebrateKey={importCelebrateKey}
        />
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
          style={sidebarWidthStyle(sidebarWidth)}
          aria-label="Resume editor"
        >
          {isReadOnly ? (
            <p className="editor-page__readonly-notice">
              {`Shared by ${ownerEmail} — view only.`}
            </p>
          ) : (
            <TabsField
              value={activeTab}
              onValueChange={setActiveTab}
              tabs={[
                {
                  value: "ai",
                  label: "AI",
                  icon: Sparkles,
                  content: (
                    <AiChatPanel
                      key={resume.meta.id}
                      resume={resume}
                      onApply={handleImport}
                    />
                  ),
                },
                {
                  value: "manual",
                  label: "Edit",
                  icon: Pencil,
                  content: (
                    <div className="editor-page__manual-edit">
                      <PersonalInfoForm
                        value={resume.personalInfo}
                        onChange={setPersonalInfo}
                        nameCasing={resume.meta.nameCasing}
                        onNameCasingChange={setNameCasing}
                        showAlternatePhone={resume.meta.alternatePhoneVisible}
                        onShowAlternatePhoneChange={setShowAlternatePhone}
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
                {
                  value: "theme",
                  label: "Theme",
                  icon: Palette,
                  content: (
                    <ThemePicker
                      resume={resume}
                      value={resume.meta.templateId}
                      onChange={setTemplateId}
                      accentColor={resume.meta.accentColor}
                      onAccentColorChange={setAccentColor}
                      active={activeTab === "theme"}
                    />
                  ),
                },
              ]}
            />
          )}
        </aside>
      </div>

      {!isReadOnly && (
        <BottomTabBar
          className="editor-page__bottom-bar"
          aria-label="Editor View"
          items={COMPACT_VIEWS}
          value={isPreviewShown ? PREVIEW_VIEW : activeTab}
          onValueChange={handleCompactViewChange}
        />
      )}

      <ResumeHistoryDialog
        resumeId={resume.meta.id}
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        canRestore={!isReadOnly}
        onRestore={handleRestoreVersion}
      />
      {access != null && canManageResume(access) && (
        <ShareDialog
          resumeId={resume.meta.id}
          resumeTitle={resume.meta.title}
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
        />
      )}
    </main>
  );
}
