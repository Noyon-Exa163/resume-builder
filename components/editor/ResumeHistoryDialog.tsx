"use client";

import { useEffect, useState, type ReactNode } from "react";
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
import { formatDateTime } from "@/lib/utils/formatDateTime";
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

/** Edits and saved versions of a resume, as two timelines of who and when. */
export function ResumeHistoryDialog({
  resumeId,
  open,
  onOpenChange,
  canRestore,
  onRestore,
}: ResumeHistoryDialogProps) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogPopup title="Edit History" className="history-dialog">
        {/* Each panel mounts only while its tab is showing, so it loads fresh. */}
        <TabsField
          defaultValue="edits"
          tabs={[
            {
              value: "edits",
              label: "Edits",
              content: <EditsTimeline resumeId={resumeId} />,
            },
            {
              value: "versions",
              label: "Versions",
              content: (
                <VersionsTimeline
                  resumeId={resumeId}
                  canRestore={canRestore}
                  onRestore={onRestore}
                />
              ),
            },
          ]}
        />
      </DialogPopup>
    </DialogRoot>
  );
}

function EditsTimeline({ resumeId }: { resumeId: string }) {
  return (
    <AsyncTimeline
      load={() => listResumeHistory(resumeId)}
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
  canRestore,
  onRestore,
}: {
  resumeId: string;
  canRestore: boolean;
  onRestore: (versionId: string) => Promise<void>;
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
        load={() => listResumeVersions(resumeId)}
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
  load: () => Promise<T[]>;
  emptyIllustration: string;
  emptyTitle: string;
  emptyDescription: string;
  renderItem: (item: T) => ReactNode;
}

/** Loads a list once on mount and shows skeleton, error, empty or timeline. */
function AsyncTimeline<T>({
  load,
  emptyIllustration,
  emptyTitle,
  emptyDescription,
  renderItem,
}: AsyncTimelineProps<T>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    load()
      .then((result) => {
        if (!cancelled) setItems(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Could not load this list.",
        );
      });

    return () => {
      cancelled = true;
    };
    // Loads once when the panel mounts; `load` is a fresh closure every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
