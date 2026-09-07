"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button, DialogPopup, DialogRoot, SelectField } from "@/components/ui";
import {
  getResumeShares,
  listShareableUsers,
  updateResumeShares,
  type ShareableUser,
} from "@/lib/storage/api/resumeAccess";
import "./ShareDialog.css";

type PermissionChoice = "none" | "viewer" | "editor";

const PERMISSION_OPTIONS = [
  { value: "none", label: "No access" },
  { value: "viewer", label: "Can view" },
  { value: "editor", label: "Can edit" },
];

export interface ShareDialogProps {
  resumeId: string;
  resumeTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Sharing UI: the resume owner is shown as a locked row, then every other
 * user in the system gets a Drive-style permission dropdown. Applied all at
 * once on Share. Opens from both the dashboard card and the editor header.
 */
export function ShareDialog({
  resumeId,
  resumeTitle,
  open,
  onOpenChange,
}: ShareDialogProps) {
  const [owner, setOwner] = useState<ShareableUser | null>(null);
  const [shareTargets, setShareTargets] = useState<ShareableUser[] | null>(null);
  const [permissions, setPermissions] = useState<Record<string, PermissionChoice>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setErrorMessage("");
      setIsLoading(true);
      try {
        const [allUsers, { owner: resumeOwner, shares }] = await Promise.all([
          listShareableUsers(),
          getResumeShares(resumeId),
        ]);
        if (cancelled) return;
        setOwner(allUsers.find((user) => user.id === resumeOwner.id) ?? null);
        setShareTargets(allUsers.filter((user) => user.id !== resumeOwner.id));
        const seeded: Record<string, PermissionChoice> = {};
        for (const share of shares) {
          if (share.userId === resumeOwner.id) continue;
          seeded[share.userId] = share.permission;
        }
        setPermissions(seeded);
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error ? err.message : "Couldn't load sharing settings.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, resumeId]);

  async function handleShare() {
    setErrorMessage("");
    setIsSaving(true);
    try {
      const shares = Object.entries(permissions)
        .filter(
          (entry): entry is [string, "viewer" | "editor"] =>
            entry[1] !== "none" && entry[0] !== owner?.id,
        )
        .map(([userId, permission]) => ({ userId, permission }));
      await updateResumeShares(resumeId, shares);
      onOpenChange(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Couldn't update sharing.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const hasShareTargets = (shareTargets?.length ?? 0) > 0;

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogPopup
        title={`Share "${resumeTitle}"`}
        description="Choose what each person can do with this resume."
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="m"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="m"
              disabled={isLoading || isSaving || !hasShareTargets}
              onClick={() => void handleShare()}
            >
              {isSaving && <Loader2 size={16} className="button__icon--spin" />}
              {isSaving ? "Sharing…" : "Share"}
            </Button>
          </>
        }
      >
        <div className="share-dialog__body">
          {isLoading ? (
            <p className="share-dialog__loading">Loading users…</p>
          ) : (
            <>
              {owner && (
                <div className="share-dialog__section">
                  <p className="share-dialog__heading">Owner</p>
                  <div className="share-dialog__list">
                    <div className="share-dialog__row">
                      <span className="share-dialog__email">{owner.email}</span>
                      <span className="share-dialog__role">Owner</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="share-dialog__section">
                <p className="share-dialog__heading">Share With</p>
                {hasShareTargets ? (
                  <div className="share-dialog__list">
                    {shareTargets?.map((user) => (
                      <div key={user.id} className="share-dialog__row">
                        <span className="share-dialog__email">{user.email}</span>
                        <SelectField
                          size="s"
                          options={PERMISSION_OPTIONS}
                          value={permissions[user.id] ?? "none"}
                          onValueChange={(value) =>
                            setPermissions((prev) => ({
                              ...prev,
                              [user.id]: (value as PermissionChoice) ?? "none",
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="share-dialog__hint">
                    There are no other users to share with yet. Add people in
                    Manage Users and they will appear here with a permission
                    dropdown.
                  </p>
                )}
              </div>
            </>
          )}

          {errorMessage && (
            <div className="share-dialog__error">{errorMessage}</div>
          )}
        </div>
      </DialogPopup>
    </DialogRoot>
  );
}
