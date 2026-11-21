"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import {
  ActionDialog,
  DialogRoot,
  DialogPopup,
  Avatar,
  Button,
  EmptyState,
  Skeleton,
  TabsField,
} from "@/components/ui";
import type { ResumeHistoryUser } from "@/lib/db/resumeHistory";
import {
  listResumeHistory,
  listResumeVersions,
  type ResumeHistoryEntry,
  type ResumeVersionEntry,
} from "@/lib/storage/api/resumeHistory";
import { formatDateTime } from "@/lib/date/formatDateTime";
import { VersionDownloadMenu } from "./VersionDownloadMenu";
import "./ResumeHistoryDialog.css";

interface ResumeHistoryDialogProps {
  resumeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether the person can replace the resume with an older version. */
  canRestore: boolean;
  /** Replaces the resume with the version; rejects with a readable message. */
  onRestore: (versionId: string) => Promise<void>;
}

const ACTION_LABELS: Record<ResumeHistoryEntry["action"], string> = {
  created: "Created this resume",
  edited: "Edited this resume",
};

interface TimelineLists {
  history: ResumeHistoryEntry[] | null;
  historyError: string;
  versions: ResumeVersionEntry[] | null;
  versionsError: string;
}

const EMPTY_LISTS: TimelineLists = {
  history: null,
  historyError: "",
  versions: null,
  versionsError: "",
};

/** Edits and saved versions of a resume, as two timelines of who and when. */
export function ResumeHistoryDialog({
  resumeId,
  open,
  onOpenChange,
  canRestore,
  onRestore,
}: ResumeHistoryDialogProps) {
  const [lists, setLists] = useState<TimelineLists>(EMPTY_LISTS);
  // Bumped on every open and after a restore — each value triggers one
  // parallel fetch of both lists.
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    void Promise.allSettled([
      listResumeHistory(resumeId),
      listResumeVersions(resumeId),
    ]).then(([historyResult, versionsResult]) => {
      if (cancelled) return;
      setLists({
        history:
          historyResult.status === "fulfilled" ? historyResult.value : null,
        historyError:
          historyResult.status === "rejected"
            ? historyResult.reason instanceof Error
              ? historyResult.reason.message
              : "Could not load the edit history."
            : "",
        versions:
          versionsResult.status === "fulfilled" ? versionsResult.value : null,
        versionsError:
          versionsResult.status === "rejected"
            ? versionsResult.reason instanceof Error
              ? versionsResult.reason.message
              : "Could not load the versions."
            : "",
      });
    });

    return () => {
      cancelled = true;
    };
  }, [open, resumeId, epoch]);

  /** Refetch both lists (after a restore changed them). */
  const reload = useCallback(() => {
    setLists(EMPTY_LISTS);
    setEpoch((token) => token + 1);
  }, []);

  function handleOpenChange(next: boolean) {
    if (next) {
      // Fresh data per open — clears to skeletons and refetches. Event
      // handler, so resetting state here is fine.
      setLists(EMPTY_LISTS);
      setEpoch((token) => token + 1);
    }
    onOpenChange(next);
  }

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogPopup title="Edit History" className="history-dialog">
        {/* Both lists load in parallel when the dialog opens. The tabs may
            remount their panels, but the data lives here — switching tabs
            renders instantly instead of refetching. */}
        <TabsField
          defaultValue="edits"
          tabs={[
            {
              value: "edits",
              label: "Edits",
              content: (
                <EditsTimeline
                  items={lists.history}
                  error={lists.historyError}
                />
              ),
            },
            {
              value: "versions",
              label: "Versions",
              content: (
                <VersionsTimeline
                  resumeId={resumeId}
                  items={lists.versions}
                  error={lists.versionsError}
                  canRestore={canRestore}
                  onRestore={onRestore}
                  onRestored={reload}
                />
              ),
            },
          ]}
        />
      </DialogPopup>
    </DialogRoot>
  );
}

function EditsTimeline({
  items,
  error,
}: {
  items: ResumeHistoryEntry[] | null;
  error: string;
}) {
  return (
    <AsyncTimeline
      items={items}
      error={error}
      emptyIllustration="/assets/spots/Calendar-empty.svg"
      emptyTitle="No edits yet"
      emptyDescription="Changes to this resume will appear here, along with who made them and when."
      renderItem={(entry) => (
        <TimelineItem
          key={entry.id}
          user={entry.user}
          title={
            <>
              <span className="history-timeline__name">
                {entry.user?.name ?? "Deleted User"}
              </span>{" "}
              {ACTION_LABELS[entry.action]}
            </>
          }
          savedAt={entry.savedAt}
        />
      )}
    />
  );
}

function VersionsTimeline({
  resumeId,
  items,
  error,
  canRestore,
  onRestore,
  onRestored,
}: {
  resumeId: string;
  items: ResumeVersionEntry[] | null;
  error: string;
  canRestore: boolean;
  onRestore: (versionId: string) => Promise<void>;
  /** Called after a successful restore — both lists changed. */
  onRestored: () => void;
}) {
  const [restoreTarget, setRestoreTarget] = useState<ResumeVersionEntry | null>(
    null,
  );
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState("");
  const [actionError, setActionError] = useState("");

  async function handleConfirmRestore() {
    if (!restoreTarget) return;
    setIsRestoring(true);
    setRestoreError("");
    try {
      await onRestore(restoreTarget.id);
      setRestoreTarget(null);
      onRestored();
    } catch (error) {
      setRestoreError(
        error instanceof Error
          ? error.message
          : "Could not restore that version. Please try again.",
      );
    } finally {
      setIsRestoring(false);
    }
  }

  function handleRestoreDialogChange(open: boolean) {
    if (open || isRestoring) return;
    setRestoreTarget(null);
    setRestoreError("");
  }

  const restoreWhen = restoreTarget
    ? formatDateTime(restoreTarget.savedAt)
    : undefined;

  return (
    <>
      {actionError && (
        <p className="history-dialog__message history-dialog__message--error">
          {actionError}
        </p>
      )}
      <AsyncTimeline
        items={items}
        error={error}
        emptyIllustration="/assets/spots/candidate.svg"
        emptyTitle="No versions yet"
        emptyDescription="A version is saved after 30 minutes without changes. The last 5 versions are kept."
        renderItem={(version: ResumeVersionEntry) => (
          <TimelineItem
            key={version.id}
            user={version.user}
            title={
              <span className="history-timeline__name">
                {`V${version.number} • ${version.user?.name ?? "Deleted User"}`}
              </span>
            }
            savedAt={version.savedAt}
            actions={
              <>
                {canRestore && (
                  <Button
                    type="button"
                    variant="tertiary"
                    size="s"
                    iconOnly
                    aria-label="Restore Version"
                    tooltip="Restore"
                    onClick={() => {
                      setRestoreError("");
                      setRestoreTarget(version);
                    }}
                  >
                    <RotateCcw size={16} />
                  </Button>
                )}
                <VersionDownloadMenu
                  resumeId={resumeId}
                  versionId={version.id}
                  versionNumber={version.number}
                  onError={setActionError}
                />
              </>
            }
          />
        )}
      />
      {/* Inside the history dialog's tree so the two dialogs nest properly. */}
      <ActionDialog
        illustration="/assets/spots/security-warning.svg"
        open={restoreTarget !== null}
        onOpenChange={handleRestoreDialogChange}
        title={restoreTarget ? `Restore V${restoreTarget.number}?` : "Restore Version?"}
        description={
          restoreTarget
            ? `This replaces the current content of this resume with V${restoreTarget.number}, saved by ${restoreTarget.user?.name ?? "a deleted user"}${restoreWhen ? ` on ${restoreWhen}` : ""}. Anything changed since then is discarded and can't be recovered.`
            : undefined
        }
        confirmLabel="Restore Version"
        confirmIcon={RotateCcw}
        loadingLabel="Restoring…"
        isLoading={isRestoring}
        isDestructive
        onConfirm={() => void handleConfirmRestore()}
      >
        {restoreError && (
          <p className="history-dialog__message history-dialog__message--error">
            {restoreError}
          </p>
        )}
      </ActionDialog>
    </>
  );
}

interface AsyncTimelineProps<T> {
  /** Loaded list, or null while the fetch is in flight. */
  items: T[] | null;
  error: string;
  emptyIllustration: string;
  emptyTitle: string;
  emptyDescription: string;
  renderItem: (item: T) => ReactNode;
}

/** Shows error, skeleton, empty or timeline for an already-loaded list. */
function AsyncTimeline<T>({
  items,
  error,
  emptyIllustration,
  emptyTitle,
  emptyDescription,
  renderItem,
}: AsyncTimelineProps<T>) {
  if (error) {
    return (
      <p className="history-dialog__message history-dialog__message--error">
        {error}
      </p>
    );
  }

  if (items === null) {
    return (
      <div className="history-dialog__loading" aria-busy="true">
        {[0, 1, 2].map((key) => (
          <div key={key} className="history-dialog__skeleton-row">
            <Skeleton radius="full" width={32} height={32} />
            <div className="history-dialog__skeleton-text">
              <Skeleton width={140} height={14} />
              <Skeleton width={100} height={12} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        illustration={emptyIllustration}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return <ol className="history-timeline">{items.map(renderItem)}</ol>;
}

interface TimelineItemProps {
  user: ResumeHistoryUser | null;
  title: ReactNode;
  savedAt: string;
  /** Icon buttons pinned to the right end of the row. */
  actions?: ReactNode;
}

function TimelineItem({
  user,
  title,
  savedAt,
  actions,
}: TimelineItemProps) {
  return (
    <li className="history-timeline__item">
      <Avatar name={user?.email ?? "deleted-user"} size={32} {...user?.avatar} />
      <div className="history-timeline__content">
        <span className="history-timeline__who">{title}</span>
        <time className="history-timeline__time" dateTime={savedAt}>
          {formatDateTime(savedAt) ?? savedAt}
        </time>
      </div>
      {actions && <div className="history-timeline__actions">{actions}</div>}
    </li>
  );
}
