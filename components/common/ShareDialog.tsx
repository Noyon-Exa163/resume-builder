"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button, DialogPopup, DialogRoot, EmptyState, SelectField } from "@/components/ui";
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
 * Owner-only sharing UI: a scrollable list of every other user in the
 * system with a per-person permission choice (Drive-style), applied all at
 * once on Share. Opens from both the dashboard card and the editor header.
 */
export function ShareDialog({
  resumeId,
  resumeTitle,
  open,
  onOpenChange,
}: ShareDialogProps) {
  const [users, setUsers] = useState<ShareableUser[] | null>(null);
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
        const [allUsers, currentShares] = await Promise.all([
          listShareableUsers(),
          getResumeShares(resumeId),
        ]);
        if (cancelled) return;
        setUsers(allUsers);
        const seeded: Record<string, PermissionChoice> = {};
        for (const share of currentShares) {
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
        .filter((entry): entry is [string, "viewer" | "editor"] => entry[1] !== "none")
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
              disabled={isLoading || isSaving || !users?.length}
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
          ) : users && users.length === 0 ? (
            <EmptyState title="There are no other users to share with yet." />
          ) : (
            <div className="share-dialog__list">
              {users?.map((user) => (
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
          )}

          {errorMessage && (
            <div className="share-dialog__error">{errorMessage}</div>
          )}
        </div>
      </DialogPopup>
    </DialogRoot>
  );
}
