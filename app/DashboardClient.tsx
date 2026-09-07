"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./page.css";
import type { ResumeData } from "@/lib/schema/resume";
import { createBlankResume } from "@/lib/schema/normalize";
import { resumeRepository } from "@/lib/storage/api/resumeRepository";
import { EmptyState, ConfirmDialog } from "@/components/ui";
import { FileText } from "lucide-react";

export default function DashboardClient() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeData[] | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ResumeData | null>(null);

  useEffect(() => {
    resumeRepository.list().then((list) => {
      list.sort((a, b) => b.meta.updatedAt.localeCompare(a.meta.updatedAt));
      setResumes(list);
    });
  }, []);

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
      <header className="dashboard__header">
        <h1 className="dashboard__title">My Resumes</h1>
        <button
          type="button"
          className="dashboard__create-button"
          onClick={handleCreate}
          disabled={isCreating}
        >
          {isCreating ? "Creating…" : "New Resume"}
        </button>
      </header>

      {resumes === null && <p className="dashboard__hint">Loading…</p>}

      {resumes !== null && resumes.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No resumes yet"
          description='Select "New Resume" to build your first one.'
        />
      )}

      {resumes !== null && resumes.length > 0 && (
        <ul className="dashboard__list">
          {resumes.map((resume) => (
            <li key={resume.meta.id} className="resume-card">
              <a href={`/editor/${resume.meta.id}`} className="resume-card__link">
                <span className="resume-card__title">{resume.meta.title}</span>
                <span className="resume-card__meta">
                  Updated {new Date(resume.meta.updatedAt).toLocaleDateString()}
                </span>
              </a>
              <button
                type="button"
                className="resume-card__delete"
                aria-label={`Delete ${resume.meta.title}`}
                onClick={() => setDeleteTarget(resume)}
              >
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
