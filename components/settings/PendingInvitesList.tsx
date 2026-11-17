"use client";

import { useEffect, useState } from "react";
import { MailQuestion, RotateCcw, Trash2 } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Skeleton,
  useToast,
} from "@/components/ui";
import { formatDateTime } from "@/lib/utils/formatDateTime";
import "./PendingInvitesList.css";

export interface InviteRecord {
  id: string;
  email: string;
  invitedBy: string;
  token: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

type InviteStatus = "pending" | "accepted" | "expired";

type InviteRow = InviteRecord & { status: InviteStatus };

function statusOf(invite: InviteRecord, now: number): InviteStatus {
  if (invite.usedAt) return "accepted";
  return new Date(invite.expiresAt).getTime() < now ? "expired" : "pending";
}

const STATUS_LABEL: Record<InviteStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  expired: "Expired",
};

export interface PendingInvitesListProps {
  /** Bump to make the list refetch (e.g. after the invite dialog sends one). */
  refreshKey: number;
  onChanged: () => void;
}

/**
 * Admin view of every invite ever sent, with re-send and revoke for the ones
 * still outstanding. Accepted invites stay listed as history.
 */
export function PendingInvitesList({
  refreshKey,
  onChanged,
}: PendingInvitesListProps) {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [localRefresh, setLocalRefresh] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    let ignore = false;
    fetch("/api/invites")
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Could not load invites.");
        }
        return (await res.json()) as InviteRecord[];
      })
      .then((data) => {
        if (ignore) return;
        setInvites(data.map((row) => ({ ...row, status: statusOf(row, Date.now()) })));
        setError("");
      })
      .catch((err: Error) => {
        if (!ignore)
          setError(err.message || "Something went wrong loading invites.");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [refreshKey, localRefresh]);

  async function handleResend(invite: InviteRecord) {
    setBusyEmail(invite.email);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: invite.email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Could not resend the invite.");
        return;
      }
      setLocalRefresh((key) => key + 1);
      onChanged();
      toast({ type: "success", title: "Invite re-sent successfully!" });
    } catch {
      setError("Something went wrong resending the invite.");
    } finally {
      setBusyEmail(null);
    }
  }

  async function handleRevoke(invite: InviteRecord) {
    setBusyEmail(invite.email);
    try {
      const res = await fetch(
        `/api/invites/${encodeURIComponent(invite.token)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Could not revoke the invite.");
        return;
      }
      setLocalRefresh((key) => key + 1);
      onChanged();
      toast({ type: "success", title: "Invite revoked successfully!" });
    } catch {
      setError("Something went wrong revoking the invite.");
    } finally {
      setBusyEmail(null);
    }
  }

  const outstanding = invites.filter(
    (invite) => invite.status !== "accepted",
  );

  return (
    <section className="pending-invites">
      <div className="pending-invites__header">
        <div className="pending-invites__headline">
          <h2 className="pending-invites__title">Email Invites</h2>
          <p className="pending-invites__subtitle">
            Outstanding and past invitations sent to teammates.
          </p>
        </div>
        {isLoading ? (
          <Skeleton width={64} height={13} />
        ) : (
          <span className="pending-invites__count">
            {outstanding.length === 0
              ? "No outstanding invites"
              : `${outstanding.length} outstanding`}
          </span>
        )}
      </div>

      {error && <div className="pending-invites__error">{error}</div>}

      <div className="pending-invites__list">
        {isLoading ? (
          Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="pending-invites__card">
              <div className="pending-invites__card-skeleton">
                <Skeleton width={32} height={32} radius="full" />
                <Skeleton width={180} height={14} />
                <Skeleton width={120} height={12} />
                <Skeleton width={96} height={20} radius="md" />
                <Skeleton width={40} height={28} />
              </div>
            </div>
          ))
        ) : invites.length === 0 ? (
          <EmptyState
            icon={MailQuestion}
            title="No invites sent yet."
            description='Use "Invite by Email" to add teammates without creating passwords by hand.'
          />
        ) : (
          invites.map((invite) => {
            const isBusy = busyEmail === invite.email;
            return (
              <div
                key={invite.id}
                className="pending-invites__card"
                data-status={invite.status}
              >
                <div className="pending-invites__card-body">
                  <div className="pending-invites__identity">
                    <Avatar
                      name={invite.email}
                      size={32}
                      className="pending-invites__avatar"
                    />
                    <div className="pending-invites__identity-text">
                      <span className="pending-invites__email">
                        {invite.email}
                      </span>
                      <span className="pending-invites__meta">
                        Invited by {invite.invitedBy || "an admin"} ·
                        Invited {formatDateTime(invite.createdAt)} ·
                        {invite.status !== "accepted"
                          ? `${invite.status === "expired" ? "expired" : "expires"} ${formatDateTime(invite.expiresAt)}`
                          : `Accepted ${formatDateTime(invite.usedAt ?? invite.createdAt)}`}
                      </span>
                    </div>
                  </div>
                  <div className="pending-invites__right">
                    <Badge
                      variant={
                        invite.status === "pending"
                          ? "default"
                          : invite.status === "accepted"
                            ? "secondary"
                            : "destructive"
                      }
                      className="pending-invites__status-badge"
                    >
                      {STATUS_LABEL[invite.status]}
                    </Badge>
                    <div className="pending-invites__actions">
                      {invite.status !== "accepted" && (
                        <>
                          <Button
                            variant="tertiary"
                            size="s"
                            disabled={isBusy}
                            onClick={() => void handleResend(invite)}
                            aria-label={`Re-send invite to ${invite.email}`}
                          >
                            {isBusy ? (
                              <Skeleton width={14} height={14} radius="full" />
                            ) : (
                              <RotateCcw size={14} />
                            )}
                            Re-send
                          </Button>
                          <Button
                            variant="tertiary"
                            size="s"
                            disabled={isBusy}
                            onClick={() => void handleRevoke(invite)}
                            aria-label={`Revoke invite for ${invite.email}`}
                          >
                            {isBusy ? (
                              <Skeleton width={14} height={14} radius="full" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                            Revoke
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
