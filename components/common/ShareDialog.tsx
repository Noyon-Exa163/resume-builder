"use client";

import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { Avatar, ActionDialog, SelectField, Skeleton, useToast } from "@/components/ui";
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
  const [shareTargets, setShareTargets] = useState<ShareableUser[] | null>(
    null,
  );
  const [permissions, setPermissions] = useState<
    Record<string, PermissionChoice>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();

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
        const seeded: Record<string, PermissionChoice> = {};
        for (const share of shares) {
          if (share.userId === resumeOwner.id) continue;
          seeded[share.userId] = share.permission;
        }
        // People who already have access come first. Ordered once at load —
        // not on every dropdown change — so rows don't jump while editing.
        // Array.sort is stable, so each group keeps its alphabetical order.
        setShareTargets(
          allUsers
            .filter((user) => user.id !== resumeOwner.id)
            .sort((a, b) => Number(b.id in seeded) - Number(a.id in seeded)),
        );
        setPermissions(seeded);
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "Couldn't load sharing settings.",
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
      toast({ type: "success", title: "Resume shared successfully!" });
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
    <ActionDialog
      className="share-dialog"
      illustration="/assets/spots/add-users.svg"
      open={open}
      onOpenChange={onOpenChange}
      title={`Share "${resumeTitle}"`}
      description="Choose what each person can do with this resume."
      confirmLabel="Share"
      confirmIcon={Share2}
      loadingLabel="Sharing…"
      isLoading={isSaving}
      isConfirmDisabled={isLoading || !hasShareTargets}
      onConfirm={() => void handleShare()}
    >
      <div className="share-dialog__body">
        {isLoading ? (
          <div className="share-dialog__section">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="share-dialog__row">
                <Skeleton width="50%" height={14} />
                <Skeleton width={130} height={32} radius="md" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {owner && (
              <div className="share-dialog__section">
                <p className="share-dialog__heading">Owner</p>
                <div className="share-dialog__list">
                  <div className="share-dialog__row">
                    <Avatar name={owner.email} size={28} {...owner.avatar} />
                    <span className="share-dialog__identity">
                      <span className="share-dialog__name">{owner.name}</span>
                      <span className="share-dialog__email">{owner.email}</span>
                    </span>
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
                      <Avatar name={user.email} size={28} {...user.avatar} />
                      <span className="share-dialog__identity">
                        <span className="share-dialog__name">{user.name}</span>
                        <span className="share-dialog__email">
                          {user.email}
                        </span>
                      </span>
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
    </ActionDialog>
  );
}
