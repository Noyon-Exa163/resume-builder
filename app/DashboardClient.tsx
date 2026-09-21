"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "./page.css";
import type { ResumeData } from "@/lib/schema/resume";
import { createBlankResume } from "@/lib/schema/normalize";
import { resumeRepository } from "@/lib/storage/api/resumeRepository";
import { fetchDefaultTemplateId } from "@/lib/storage/api/appDefaults";
import { deleteResumeThumbnails } from "@/lib/export/resumeThumbnail";
import { aiChatRepository } from "@/lib/storage/aiChat/aiChatRepository";
import {
  canManageResume,
  type ResumeAccessEntry,
} from "@/lib/storage/api/resumeAccess";
import { ResumeCardPreview } from "@/components/dashboard/ResumeCardPreview";
import { ShareDialog } from "@/components/common/ShareDialog";
import { formatDisplayDate } from "@/lib/date";
import { toTitleCase } from "@/lib/schema/personalInfo";
import { EmptyState, ActionDialog, Avatar, Button, Tooltip, UserTooltip } from "@/components/ui";
import { toPdfBlob } from "@/lib/export/toPdfBlob";
import { buildExportFilename } from "@/lib/export/filename";
import { triggerDownload } from "@/lib/export/triggerDownload";
import {
  Download,
  FilePlus,
  Loader2,
  Search,
  Share2,
  Trash2,
  X,
} from "lucide-react";

function formatCreatedAt(iso: string): string | undefined {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface DashboardClientProps {
  /** Loaded server-side by app/page.tsx — see that file's comment. */
  initialEntries: ResumeAccessEntry[];
}

export default function DashboardClient({
  initialEntries,
}: DashboardClientProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<ResumeAccessEntry[]>(initialEntries);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ResumeData | null>(null);
  const [shareTarget, setShareTarget] = useState<ResumeData | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return entries;

    return entries.filter(({ resume }) => {
      const title = resume.meta.title.toLowerCase();
      const fullName = resume.personalInfo.fullName.toLowerCase();
      return title.includes(query) || fullName.includes(query);
    });
  }, [entries, searchQuery]);

  async function handleCreate() {
    setIsCreating(true);
    try {
      const templateId = await fetchDefaultTemplateId();
      const blank = createBlankResume(templateId);
      await resumeRepository.set(blank.meta.id, blank);
      router.push(`/editor/${blank.meta.id}`);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDownload(resume: ResumeData) {
    setDownloadingId(resume.meta.id);
    try {
      const blob = await toPdfBlob(resume);
      const name = buildExportFilename(resume);
      triggerDownload(blob, `${name}.pdf`);
    } catch (err) {
      console.error("PDF download failed:", err);
    } finally {
      setDownloadingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.meta.id;
    await resumeRepository.delete(id);
    // Not awaited alongside the resume delete above: this is a purely local
    // cache cleanup, not part of the operation the user is waiting on.
    void deleteResumeThumbnails(id).catch((error) => {
      console.error("Failed to clear cached resume thumbnail:", error);
    });
    void aiChatRepository.delete(id).catch((error) => {
      console.error("Failed to clear cached AI chat history:", error);
    });
    setEntries((prev) => prev.filter((e) => e.resume.meta.id !== id));
  }

  return (
    <main className="dashboard">
      <div className="dashboard__toolbar">
        <header className="dashboard__header">
          <h1 className="dashboard__title">Resumes</h1>
          <Button
            type="button"
            variant="primary"
            size="m"
            onClick={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? (
              <Loader2 size={16} className="button__icon--spin" />
            ) : (
              <FilePlus size={16} />
            )}
            {isCreating ? "Creating…" : "New Resume"}
          </Button>
        </header>

        {entries.length > 0 && (
          <label className="dashboard__search">
            <Search
              size={16}
              className="dashboard__search-icon"
              aria-hidden="true"
            />
            <input
              type="search"
              className="dashboard__search-input"
              placeholder={`Search ${entries.length} ${entries.length === 1 ? "Resume" : "Resumes"}...`}
              aria-label={`Search ${entries.length} ${entries.length === 1 ? "Resume" : "Resumes"}`}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
        )}
      </div>

      {entries.length === 0 && (
        <EmptyState
          illustration="/assets/spots/candidate.svg"
          title="No resumes yet"
          description='Select "New Resume" to build your first one.'
        />
      )}

      {entries.length > 0 && filteredEntries.length === 0 && (
        <EmptyState
          illustration="/assets/spots/candidate.svg"
          title="No matching resumes"
          description="No resumes match your search. Try a different name or keyword."
          action={
            <Button
              type="button"
              variant="secondary"
              size="m"
              onClick={() => setSearchQuery("")}
            >
              <X size={16} />
              Clear
            </Button>
          }
        />
      )}

      {filteredEntries.length > 0 && (
        <ul className="dashboard__list">
          {filteredEntries.map(({ resume, access, ownerEmail, ownerName }) => (
            <li key={resume.meta.id} className="resume-card">
              <a
                href={`/editor/${resume.meta.id}`}
                className="resume-card__link"
              >
                <ResumeCardPreview data={resume} />
                <span className="resume-card__text">
                  <span className="resume-card__title">
                    {toTitleCase(resume.meta.title)}
                  </span>
                  <span className="resume-card__meta">
                    Updated {formatDisplayDate(resume.meta.updatedAt)}
                  </span>
                </span>
              </a>
              <div className="resume-card__actions">
                <div className="resume-card__actions-group">
                  <Tooltip label="Download PDF">
                    <button
                      type="button"
                      className="resume-card__icon-button resume-card__icon-button--download"
                      aria-label={`Download ${resume.meta.title} as PDF`}
                      disabled={downloadingId === resume.meta.id}
                      onClick={() => void handleDownload(resume)}
                    >
                      {downloadingId === resume.meta.id ? (
                        <Loader2
                          size={16}
                          className="button__icon--spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Download size={16} aria-hidden="true" />
                      )}
                    </button>
                  </Tooltip>
                  {canManageResume(access) && (
                    <Tooltip label="Share">
                      <button
                        type="button"
                        className="resume-card__icon-button resume-card__icon-button--share"
                        aria-label={`Share ${resume.meta.title}`}
                        onClick={() => setShareTarget(resume)}
                      >
                        <Share2 size={16} aria-hidden="true" />
                      </button>
                    </Tooltip>
                  )}
                </div>
                <div className="resume-card__actions-group resume-card__actions-group--end">
                  {access !== "owner" && (
                    <UserTooltip
                      title={access === "admin" ? "Created By" : "Shared By"}
                      name={ownerName ?? ownerEmail.split("@")[0]}
                      email={ownerEmail}
                      caption={
                        access === "admin"
                          ? formatCreatedAt(resume.meta.createdAt)
                          : undefined
                      }
                    >
                      {access === "admin" ? (
                        <Avatar name={ownerEmail} size={24} />
                      ) : (
                        <span
                          className={`resume-card__badge resume-card__badge--${access}`}
                        >
                          {access === "editor"
                            ? "Shared • Editor"
                            : "Shared • Viewer"}
                        </span>
                      )}
                    </UserTooltip>
                  )}
                  {canManageResume(access) && (
                    <Tooltip label="Delete">
                      <button
                        type="button"
                        className="resume-card__icon-button resume-card__icon-button--delete"
                        aria-label={`Delete ${resume.meta.title}`}
                        onClick={() => setDeleteTarget(resume)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ActionDialog
        illustration="/assets/spots/trash-delete.svg"
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete "${deleteTarget?.meta.title ?? ""}"?`}
        description="This will permanently delete this resume. This cannot be undone."
        confirmLabel="Delete"
        confirmIcon={Trash2}
        isDestructive
        onConfirm={() => {
          void confirmDelete();
          setDeleteTarget(null);
        }}
      />

      {shareTarget && (
        <ShareDialog
          resumeId={shareTarget.meta.id}
          resumeTitle={shareTarget.meta.title}
          open={shareTarget !== null}
          onOpenChange={(open) => {
            if (!open) setShareTarget(null);
          }}
        />
      )}
    </main>
  );
}
