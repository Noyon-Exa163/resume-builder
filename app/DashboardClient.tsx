"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "./page.css";
import type { ResumeData } from "@/lib/schema/resume";
import { createBlankResume } from "@/lib/schema/normalize";
import { resumeRepository } from "@/lib/storage/api/resumeRepository";
import {
  listResumesWithAccess,
  canManageResume,
  type ResumeAccessEntry,
} from "@/lib/storage/api/resumeAccess";
import { ResumeCardPreview } from "@/components/dashboard/ResumeCardPreview";
import { ShareDialog } from "@/components/common/ShareDialog";
import { formatDisplayDate } from "@/lib/date";
import { EmptyState, ConfirmDialog, Button } from "@/components/ui";
import { toPdfBlob } from "@/lib/export/toPdfBlob";
import { buildExportFilename } from "@/lib/export/filename";
import { triggerDownload } from "@/lib/export/triggerDownload";
import {
  Download,
  FilePlus,
  FileText,
  Loader2,
  Search,
  Share2,
  Trash2,
} from "lucide-react";

export default function DashboardClient() {
  const router = useRouter();
  const [entries, setEntries] = useState<ResumeAccessEntry[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ResumeData | null>(null);
  const [shareTarget, setShareTarget] = useState<ResumeData | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    listResumesWithAccess().then((list) => {
      list.sort((a, b) =>
        b.resume.meta.updatedAt.localeCompare(a.resume.meta.updatedAt),
      );
      setEntries(list);
    });
  }, []);

  const filteredEntries = useMemo(() => {
    if (!entries) return null;
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
    const blank = createBlankResume();
    await resumeRepository.set(blank.meta.id, blank);
    router.push(`/editor/${blank.meta.id}`);
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
    setEntries((prev) => prev?.filter((e) => e.resume.meta.id !== id) ?? null);
  }

  return (
    <main className="dashboard">
      <div className="dashboard__toolbar">
        <header className="dashboard__header">
          <h1 className="dashboard__title">My Resumes</h1>
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

        {entries !== null && entries.length > 0 && (
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

      {entries === null && <p className="dashboard__hint">Loading…</p>}

      {entries !== null && entries.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No resumes yet"
          description='Select "New Resume" to build your first one.'
        />
      )}

      {entries !== null && entries.length > 0 && filteredEntries?.length === 0 && (
        <p className="dashboard__hint">No resumes match your search.</p>
      )}

      {filteredEntries !== null && filteredEntries.length > 0 && (
        <ul className="dashboard__list">
          {filteredEntries.map(({ resume, access }) => (
            <li key={resume.meta.id} className="resume-card">
              <a href={`/editor/${resume.meta.id}`} className="resume-card__link">
                <ResumeCardPreview data={resume} />
                <span className="resume-card__text">
                  <span className="resume-card__title">{resume.meta.title}</span>
                  <span className="resume-card__meta">
                    Updated {formatDisplayDate(resume.meta.updatedAt)}
                  </span>
                </span>
              </a>
              <div className="resume-card__actions">
                <div className="resume-card__actions-group">
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
                  {canManageResume(access) && (
                    <button
                      type="button"
                      className="resume-card__icon-button resume-card__icon-button--share"
                      aria-label={`Share ${resume.meta.title}`}
                      onClick={() => setShareTarget(resume)}
                    >
                      <Share2 size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
                <div className="resume-card__actions-group resume-card__actions-group--end">
                  {access !== "owner" && (
                    <span
                      className={`resume-card__badge resume-card__badge--${access}`}
                    >
                      {access === "editor"
                        ? "Shared • Editor"
                        : access === "admin"
                          ? "Admin"
                          : "Shared • Viewer"}
                    </span>
                  )}
                  {canManageResume(access) && (
                    <button
                      type="button"
                      className="resume-card__icon-button resume-card__icon-button--delete"
                      aria-label={`Delete ${resume.meta.title}`}
                      onClick={() => setDeleteTarget(resume)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete "${deleteTarget?.meta.title ?? ""}"?`}
        description="This will permanently delete this resume. This cannot be undone."
        onConfirm={confirmDelete}
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
