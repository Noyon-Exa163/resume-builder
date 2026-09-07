"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "./page.css";
import type { ResumeData } from "@/lib/schema/resume";
import { createBlankResume } from "@/lib/schema/normalize";
import { resumeRepository } from "@/lib/storage/api/resumeRepository";
import { ResumeCardPreview } from "@/components/dashboard/ResumeCardPreview";
import { formatDisplayDate } from "@/lib/date";
import { EmptyState, ConfirmDialog, Button } from "@/components/ui";
import { FilePlus, FileText, Loader2, Search, Trash2 } from "lucide-react";

export default function DashboardClient() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeData[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ResumeData | null>(null);

  useEffect(() => {
    resumeRepository.list().then((list) => {
      list.sort((a, b) => b.meta.updatedAt.localeCompare(a.meta.updatedAt));
      setResumes(list);
    });
  }, []);

  const filteredResumes = useMemo(() => {
    if (!resumes) return null;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return resumes;

    return resumes.filter((resume) => {
      const title = resume.meta.title.toLowerCase();
      const fullName = resume.personalInfo.fullName.toLowerCase();
      return title.includes(query) || fullName.includes(query);
    });
  }, [resumes, searchQuery]);

  async function handleCreate() {
    setIsCreating(true);
    const blank = createBlankResume();
    await resumeRepository.set(blank.meta.id, blank);
    router.push(`/editor/${blank.meta.id}`);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.meta.id;
    await resumeRepository.delete(id);
    setResumes((prev) => prev?.filter((r) => r.meta.id !== id) ?? null);
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

        {resumes !== null && resumes.length > 0 && (
          <label className="dashboard__search">
            <Search
              size={16}
              className="dashboard__search-icon"
              aria-hidden="true"
            />
            <input
              type="search"
              className="dashboard__search-input"
              placeholder="Search resumes"
              aria-label="Search resumes"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
        )}
      </div>

      {resumes === null && <p className="dashboard__hint">Loading…</p>}

      {resumes !== null && resumes.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No resumes yet"
          description='Select "New Resume" to build your first one.'
        />
      )}

      {resumes !== null && resumes.length > 0 && filteredResumes?.length === 0 && (
        <p className="dashboard__hint">No resumes match your search.</p>
      )}

      {filteredResumes !== null && filteredResumes.length > 0 && (
        <ul className="dashboard__list">
          {filteredResumes.map((resume) => (
            <li key={resume.meta.id} className="resume-card">
              <a href={`/editor/${resume.meta.id}`} className="resume-card__link">
                <ResumeCardPreview data={resume} />
                <span className="resume-card__title">{resume.meta.title}</span>
                <span className="resume-card__meta">
                  Updated {formatDisplayDate(resume.meta.updatedAt)}
                </span>
              </a>
              <button
                type="button"
                className="resume-card__delete"
                aria-label={`Delete ${resume.meta.title}`}
                onClick={() => setDeleteTarget(resume)}
              >
                <Trash2 size={14} aria-hidden="true" />
                Delete
              </button>
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
    </main>
  );
}
