"use client";

import { useEffect, useState } from "react";
import { Mail, MailQuestion, RotateCcw, Trash2, UserPlus } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  SelectField,
  Skeleton,
  useToast,
  type SelectOption,
} from "@/components/ui";
import { formatDateTime } from "@/lib/date/formatDateTime";
import { usePagedList } from "@/lib/utils/usePagedList";
import { cachePageData, readCachedPageData } from "@/lib/utils/pageDataCache";
import { LoadMoreFooter } from "@/components/common/LoadMoreFooter";
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

const STATUS_FILTER_OUTSTANDING = "outstanding";
const STATUS_FILTER_ACCEPTED = "accepted";
const STATUS_FILTER_ALL = "all";

const STATUS_FILTER_OPTIONS: SelectOption[] = [
  {
    value: STATUS_FILTER_OUTSTANDING,
    label: "Outstanding",
    icon: <MailQuestion size={14} aria-hidden="true" />,
  },
  {
    value: STATUS_FILTER_ACCEPTED,
    label: "Accepted",
    icon: <UserPlus size={14} aria-hidden="true" />,
  },
  {
    value: STATUS_FILTER_ALL,
    label: "All",
    icon: <Mail size={14} aria-hidden="true" />,
  },
];

export interface PendingInvitesListProps {
  /** Bump to make the list refetch (e.g. after the invite dialog sends one). */
  refreshKey: number;
  onChanged: () => void;
}

/** Repeat visits render the cached list and refresh in the background. */
const INVITES_CACHE_KEY = "invites:list";
const INVITES_CACHE_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Admin view of every invite ever sent, rendered as a card section beside
 * the users grid (below it on smaller screens). Defaults to the All filter
 * — outstanding (pending + expired) and accepted invite history are one
 * switch away, and the pill counts whatever the active filter shows.
 * Hidden entirely until at least one invite exists.
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
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);
  const { toast } = useToast();

  useEffect(() => {
    let ignore = false;

    // Repeat visit: paint the cached list instantly; the fetch below then
    // refreshes it in the background. Runs post-hydration, so the server
    // and client render the same first tree.
    const cached = readCachedPageData<InviteRecord[]>(
      INVITES_CACHE_KEY,
      INVITES_CACHE_MAX_AGE_MS,
    );
    if (cached && !ignore) {
      setInvites(
        cached.map((row) => ({ ...row, status: statusOf(row, Date.now()) })),
      );
      setIsLoading(false);
    }

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
        setInvites(
          data.map((row) => ({ ...row, status: statusOf(row, Date.now()) })),
        );
        setError("");
        cachePageData(INVITES_CACHE_KEY, data);
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

  const outstanding = invites.filter((invite) => invite.status !== "accepted");

  // Active selector bucket, independent of anything else — lets the empty
  // states distinguish "nothing outstanding" from "no invites at all".
  const bucket =
    statusFilter === STATUS_FILTER_ACCEPTED
      ? invites.filter((invite) => invite.status === "accepted")
      : statusFilter === STATUS_FILTER_ALL
        ? invites
        : outstanding;
  // "Load More" paging over the active bucket.
  const {
    visible: visibleInvites,
    visibleCount,
    loadMore,
  } = usePagedList(bucket, 8);

  // Nobody has ever been invited — nothing to manage, no section at all.
  if (!isLoading && invites.length === 0) return null;

  return (
    <section className="pending-invites" aria-label="Email Invites">
      <div className="pending-invites__header">
        <h2 className="pending-invites__title">Email Invites</h2>
        {isLoading ? (
          <Skeleton width={28} height={18} radius="full" />
        ) : (
          <span className="pending-invites__count" aria-live="polite">
            {bucket.length}
          </span>
        )}
        <SelectField
          className="pending-invites__filter"
          size="s"
          ariaLabel="Filter Invites by Status"
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onValueChange={(next) => setStatusFilter(next ?? STATUS_FILTER_ALL)}
        />
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
        ) : bucket.length === 0 ? (
          statusFilter === STATUS_FILTER_OUTSTANDING ? (
            <EmptyState
              icon={MailQuestion}
              title="No outstanding invites."
              description="Every invitation has been accepted."
            />
          ) : statusFilter === STATUS_FILTER_ACCEPTED ? (
            <EmptyState
              icon={UserPlus}
              title="No accepted invites yet."
              description="Accepted invitations appear here as history."
            />
          ) : (
            <EmptyState
              icon={MailQuestion}
              title="No invites sent yet."
              description='Use "Invite by Email" to add teammates without creating passwords by hand.'
            />
          )
        ) : (
          visibleInvites.map((invite) => {
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
                        Invited by {invite.invitedBy || "an admin"} · Invited{" "}
                        {formatDateTime(invite.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="pending-invites__actions-group">
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

        <LoadMoreFooter
          visible={visibleCount}
          total={bucket.length}
          pageSize={8}
          itemLabel="invites"
          onLoadMore={loadMore}
        />
      </div>
    </section>
  );
}
