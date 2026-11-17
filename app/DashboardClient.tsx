"use client";

import { useMemo, useState } from "react";
import "./page.css";
import type { ResumeData } from "@/lib/schema/resume";
import { createBlankResume, normalizeAndValidate } from "@/lib/schema/normalize";
import { resumeRepository } from "@/lib/storage/api/resumeRepository";
import { deleteResumeThumbnails } from "@/lib/export/resumeThumbnail";
import { aiChatRepository } from "@/lib/storage/aiChat/aiChatRepository";
import {
  canManageResume,
  type ResumeAccessEntry,
} from "@/lib/storage/api/resumeAccess";
import { ResumeCardPreview } from "@/components/dashboard/ResumeCardPreview";
import { StatCard } from "@/components/common/StatCard";
import { NewResumeDialog } from "@/components/dashboard/NewResumeDialog";
import { ShareDialog } from "@/components/common/ShareDialog";
import { formatDisplayDate } from "@/lib/date";
import { formatDateTime } from "@/lib/utils/formatDateTime";
import { toTitleCase } from "@/lib/schema/personalInfo";
import { EmptyState, ActionDialog, ActionMenu, Avatar, Button, DialogPopup, DialogRoot, GroupedSelect, Input, SelectField, Tooltip, UserTooltip, useToast } from "@/components/ui";
import { toPdfBlob } from "@/lib/export/toPdfBlob";
import { buildExportFilename } from "@/lib/export/filename";
import { triggerDownload } from "@/lib/export/triggerDownload";
import {
  Copy,
  Download,
  Edit,
  FilePlus,
  FileText,
  Loader2,
  MoreVertical,
  Search,
  Share2,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
const ALL_OWNERS = "all";

const SORT_FIELD_OPTIONS = [
  { value: "created", label: "Date Created" },
  { value: "modified", label: "Date Modified" },
];
const DEFAULT_SORT_FIELD = "modified";
const DEFAULT_SORT_DIRECTION = "desc";
const SORT_DIRECTION_OPTIONS = [
  { value: "desc", label: "Newest First" },
  { value: "asc", label: "Oldest First" },
];

/** Timestamp to sort by; an unparseable date sorts as oldest. */
function sortTimestamp(entry: ResumeAccessEntry, field: string): number {
  const iso =
    field === "created" ? entry.resume.meta.createdAt : entry.resume.meta.updatedAt;
  const time = Date.parse(iso);
  return Number.isNaN(time) ? 0 : time;
}

interface DashboardClientProps {
  /** Loaded server-side by app/page.tsx — see that file's comment. */
  initialEntries: ResumeAccessEntry[];
}

export default function DashboardClient({
  initialEntries,
}: DashboardClientProps) {
  const [entries, setEntries] = useState<ResumeAccessEntry[]>(initialEntries);
  const [searchQuery, setSearchQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState(ALL_OWNERS);
  const [sortField, setSortField] = useState(DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState(DEFAULT_SORT_DIRECTION);
  const [isNewResumeOpen, setIsNewResumeOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ResumeData | null>(null);
  const [shareTarget, setShareTarget] = useState<ResumeData | null>(null);
  const [renameTarget, setRenameTarget] = useState<ResumeData | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { toast } = useToast();

  // One option per distinct creator, alphabetical by display name.
  const ownerOptions = useMemo(() => {
    const byEmail = new Map<string, ResumeAccessEntry>();
    for (const entry of entries) {
      if (!byEmail.has(entry.ownerEmail)) byEmail.set(entry.ownerEmail, entry);
    }
    return [...byEmail.values()]
      .map((entry) => ({
        value: entry.ownerEmail,
        label: entry.ownerName ?? entry.ownerEmail.split("@")[0],
        icon: (
          <Avatar
            name={entry.ownerEmail}
            size={20}
            bare
            {...entry.ownerAvatar}
          />
        ),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [entries]);

  // Falls back to "all" if the chosen creator's last resume was deleted.
  const activeOwnerFilter = ownerOptions.some((o) => o.value === ownerFilter)
    ? ownerFilter
    : ALL_OWNERS;

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const sign = sortDirection === "asc" ? 1 : -1;

    const matches = entries.filter(({ resume, ownerEmail }) => {
      if (activeOwnerFilter !== ALL_OWNERS && ownerEmail !== activeOwnerFilter) {
        return false;
      }
      if (!query) return true;
      const title = resume.meta.title.toLowerCase();
      const fullName = resume.personalInfo.fullName.toLowerCase();
      return title.includes(query) || fullName.includes(query);
    });

    return matches.sort(
      (a, b) => sign * (sortTimestamp(a, sortField) - sortTimestamp(b, sortField)),
    );
  }, [entries, searchQuery, activeOwnerFilter, sortField, sortDirection]);

  // Summary strip above the grid — derived, never stored.
  const stats = useMemo(() => {
    const createdByYou = entries.filter((entry) => entry.access === "owner").length;
    return {
      total: entries.length,
      createdByYou,
      sharedWithMe: entries.length - createdByYou,
    };
  }, [entries]);

  async function handleDownload(resume: ResumeData) {
    setDownloadingId(resume.meta.id);
    try {
      // The dashboard list is loaded with `sections` stripped (see
      // listResumesForUser) — fetch the full resume so the PDF isn't just
      // the header and summary.
      const full = await resumeRepository.get(resume.meta.id);
      if (!full) throw new Error(`Resume ${resume.meta.id} no longer exists.`);
      const blob = await toPdfBlob(full);
      const name = buildExportFilename(full);
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
    toast({ type: "success", title: "Resume deleted successfully!" });
  }

  async function handleDuplicate(resume: ResumeData) {
    const full = await resumeRepository.get(resume.meta.id);
    if (!full) {
      console.error(`Resume ${resume.meta.id} no longer exists.`);
      return;
    }
    const copy = createBlankResume();
    copy.meta.title = `Copy of ${full.meta.title}`;
    copy.meta.templateId = full.meta.templateId;
    copy.meta.pageSize = full.meta.pageSize;
    copy.meta.nameCasing = full.meta.nameCasing;
    copy.meta.accentColor = full.meta.accentColor;
    copy.meta.alternatePhoneVisible = full.meta.alternatePhoneVisible;
    copy.personalInfo = full.personalInfo;
    copy.summary = full.summary;
    copy.sections = full.sections;

    const normalized = normalizeAndValidate(copy);
    await resumeRepository.set(normalized.meta.id, normalized);
    setEntries((prev) => [
      ...prev,
      {
        resume: normalized,
        access: "owner",
        ownerEmail: "",
        ownerName: "",
        ownerAvatar: { hue: null, expression: null },
      },
    ]);
    toast({ type: "success", title: "Resume duplicated successfully!" });
  }

  async function handleRenameConfirm() {
    if (!renameTarget || !renameTitle.trim()) return;
    const id = renameTarget.meta.id;
    const full = await resumeRepository.get(id);
    if (!full) return;
    const updated = { ...full, meta: { ...full.meta, title: renameTitle.trim() } };
    const normalized = normalizeAndValidate(updated);
    await resumeRepository.set(normalized.meta.id, normalized);
    setEntries((prev) =>
      prev.map((e) =>
        e.resume.meta.id === id
          ? { ...e, resume: normalized }
          : e,
      ),
    );
    setRenameTarget(null);
    setRenameTitle("");
    toast({ type: "success", title: "Resume renamed successfully!" });
  }

  return (
    <main className="dashboard">
      <div className="dashboard__toolbar">
        <header className="dashboard__header">
          <div className="dashboard__header-text">
            <h1 className="dashboard__title">Resumes</h1>
            <p className="dashboard__subtitle">
              Browse, create and share your resumes.
            </p>
          </div>
          {entries.length > 0 && (
            <Button
              type="button"
              variant="primary"
              size="m"
              onClick={() => setIsNewResumeOpen(true)}
            >
              <FilePlus size={16} />
              New Resume
            </Button>
          )}
        </header>

        {entries.length > 0 && (
          <div className="dashboard__filters">
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
            {ownerOptions.length > 1 && (
              <SelectField
                size="s"
                className="dashboard__owner-filter"
                options={[
                  {
                    value: ALL_OWNERS,
                    label: "All Users",
                    icon: (
                      <span className="dashboard__owner-all-icon">
                        <Users size={12} aria-hidden="true" />
                      </span>
                    ),
                  },
                  ...ownerOptions,
                ]}
                value={activeOwnerFilter}
                onValueChange={(next) => setOwnerFilter(next ?? ALL_OWNERS)}
              />
            )}
            <GroupedSelect
              className="dashboard__sort"
              aria-label="Sort Resumes"
              reset={{
                label: "Default",
                isActive:
                  sortField === DEFAULT_SORT_FIELD &&
                  sortDirection === DEFAULT_SORT_DIRECTION,
                onSelect: () => {
                  setSortField(DEFAULT_SORT_FIELD);
                  setSortDirection(DEFAULT_SORT_DIRECTION);
                },
              }}
              groups={[
                {
                  id: "field",
                  options: SORT_FIELD_OPTIONS,
                  value: sortField,
                  onValueChange: setSortField,
                },
                {
                  id: "direction",
                  options: SORT_DIRECTION_OPTIONS,
                  value: sortDirection,
                  onValueChange: setSortDirection,
                },
              ]}
            />
          </div>
        )}
      </div>

      {entries.length > 0 && (
        <div className="stat-grid">
          <StatCard icon={FileText} label="Total Resumes" value={stats.total} />
          <StatCard
            icon={User}
            label="Created By You"
            value={stats.createdByYou}
          />
          <StatCard
            icon={Share2}
            label="Shared With Me"
            value={stats.sharedWithMe}
          />
        </div>
      )}

      {entries.length === 0 && (
        <div className="dashboard__empty">
          <EmptyState
            illustration="/assets/spots/candidate.svg"
            title="No resumes yet"
          />
          <div className="dashboard__empty-actions">
            <Button
              type="button"
              variant="primary"
              size="m"
              onClick={() => setIsNewResumeOpen(true)}
            >
              <FilePlus size={16} />
              Create New Resume
            </Button>
          </div>
        </div>
      )}

      {entries.length > 0 && filteredEntries.length === 0 && (
        <div className="dashboard__empty">
          <EmptyState
            illustration="/assets/spots/candidate.svg"
            title="No matching resumes"
            description="No resumes match your search or filter. Try a different name, keyword or user."
            action={
              <Button
                type="button"
                variant="secondary"
                size="m"
                onClick={() => {
                  setSearchQuery("");
                  setOwnerFilter(ALL_OWNERS);
                }}
              >
                <X size={16} />
                Clear
              </Button>
            }
          />
        </div>
      )}

      {filteredEntries.length > 0 && (
        <ul className="dashboard__list">
          {filteredEntries.map(({ resume, access, ownerEmail, ownerName, ownerAvatar }) => (
            <li key={resume.meta.id} className="resume-card">
              <a
                href={`/editor/${resume.meta.id}`}
                className="resume-card__link"
              >
                <div className="resume-card__preview">
                  <ResumeCardPreview data={resume} />
                </div>
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
                    <span className="resume-card__inline-actions">
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
                    </span>
                  )}
                </div>
                <div className="resume-card__actions-group resume-card__actions-group--end">
                  {access !== "owner" && (
                    <UserTooltip
                      title={access === "admin" ? "Created By" : "Shared By"}
                      name={ownerName ?? ownerEmail.split("@")[0]}
                      email={ownerEmail}
                      avatar={ownerAvatar}
                      caption={
                        access === "admin"
                          ? formatDateTime(resume.meta.createdAt)
                          : undefined
                      }
                    >
                      {access === "admin" ? (
                        <Avatar name={ownerEmail} size={24} bare {...ownerAvatar} />
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
                    <span className="resume-card__inline-actions">
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
                    </span>
                  )}
                  {/* Phones: Share and Delete don't fit a two-column grid
                      beside Download, so they collapse into one menu. */}
                  {canManageResume(access) && (
                    <span className="resume-card__menu">
                      <ActionMenu
                        trigger={
                          <Button
                            type="button"
                            variant="tertiary"
                            size="s"
                            iconOnly
                            aria-label={`More Actions for ${resume.meta.title}`}
                          >
                            <MoreVertical size={16} />
                          </Button>
                        }
                        items={[
                          {
                            label: "Share",
                            icon: Share2,
                            onSelect: () => setShareTarget(resume),
                          },
                          {
                            label: "Duplicate",
                            icon: Copy,
                            onSelect: () => void handleDuplicate(resume),
                          },
                          {
                            label: "Rename",
                            icon: Edit,
                            onSelect: () => {
                              setRenameTarget(resume);
                              setRenameTitle(resume.meta.title);
                            },
                          },
                          {
                            label: "Delete",
                            icon: Trash2,
                            isDestructive: true,
                            onSelect: () => setDeleteTarget(resume),
                          },
                        ]}
                      />
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <NewResumeDialog
        open={isNewResumeOpen}
        onOpenChange={setIsNewResumeOpen}
      />

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

      {renameTarget && (
        <DialogRoot
          open={renameTarget !== null}
          onOpenChange={(open) => {
            if (!open) setRenameTarget(null);
          }}
        >
          <DialogPopup
            title="Rename resume"
            description="Enter a new title for this resume."
            className="rename-dialog"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleRenameConfirm();
              }}
            >
              <Input
                id="rename-title"
                label="Resume Title"
                type="text"
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                required
                maxLength={100}
                autoFocus
              />
              <div className="rename-dialog__footer">
                <Button
                  type="button"
                  variant="secondary"
                  size="m"
                  onClick={() => setRenameTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="m"
                >
                  Rename
                </Button>
              </div>
            </form>
          </DialogPopup>
        </DialogRoot>
      )}

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
