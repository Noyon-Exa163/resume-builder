"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Copy,
  FileText,
  Lock,
  MoreVertical,
  Plus,
  Search,
  Share2,
  Shield,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  Avatar,
  Input,
  Button,
  EmptyState,
  ActionDialog,
  ActionMenu,
  Skeleton,
  SelectField,
  SwitchField,
  Tooltip,
  useToast,
} from "@/components/ui";
import { InviteUserDialog } from "@/components/editor";
import { PendingInvitesList } from "@/components/settings/PendingInvitesList";
import { StatCard } from "@/components/common/StatCard";
import { StatCardSkeleton } from "@/components/common/StatCardSkeleton";
import { cachePageData, readCachedPageData } from "@/lib/utils/pageDataCache";
import { LoadMoreFooter } from "@/components/common/LoadMoreFooter";
import { usePagedList } from "@/lib/utils/usePagedList";
import { isProtectedAdmin } from "@/lib/auth/constants";
import { formatDisplayDate } from "@/lib/date";
import type { AvatarPreferences } from "@/lib/avatar";
import { ROLE_FILTER_OPTIONS } from "./roleFilterOptions";
import "./page.css";

/** Repeat visits render the cached list and refresh in the background. */
const USERS_CACHE_KEY = "users:list";
const USERS_CACHE_MAX_AGE_MS = 5 * 60 * 1000;

interface User {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  avatar: AvatarPreferences;
  /** Resumes the user owns. */
  resumesCreated: number;
  /** Resumes other people shared with the user. */
  resumesShared: number;
  /** The user's most recent resume save, or null if they have none. */
  lastActivityAt: string | null;
}

export default function UsersPageClient() {
  // Stale-while-revalidate: a repeat visit paints the cached list instantly
  // and refreshes in the background (see lib/utils/pageDataCache.ts). The
  // cache is read in the mount effect below rather than the initial render
  // — sessionStorage doesn't exist during SSR, so reading while rendering
  // would hydrate a different tree than the server rendered (hydration
  // mismatch in devtools).
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const { toast } = useToast();
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  /** Bumped whenever an invite is sent/resended/revoked so the invites list
   *  refetches. */
  const [invitesRefreshKey, setInvitesRefreshKey] = useState(0);
  const [roleFilter, setRoleFilter] = useState("all");

  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Could not load users.");
        return;
      }
      const data: User[] = await res.json();
      setUsers(data);
      cachePageData(USERS_CACHE_KEY, data);
    } catch {
      setError("Something went wrong loading users.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    // Repeat visit: paint the cached list instantly; the fetch below then
    // refreshes it in the background. Runs post-hydration, so the server
    // and client render the same first tree.
    const cached = readCachedPageData<User[]>(
      USERS_CACHE_KEY,
      USERS_CACHE_MAX_AGE_MS,
    );
    if (cached && !ignore) {
      setUsers(cached);
      setIsLoading(false);
    }

    fetch("/api/admin/users")
      .then((res) => {
        if (!ignore && !res.ok) {
          return res
            .json()
            .catch(() => null)
            .then((data) => {
              throw new Error(data?.error || "Could not load users.");
            });
        }
        return res.json();
      })
      .then((data: User[]) => {
        if (!ignore) {
          setUsers(data);
          cachePageData(USERS_CACHE_KEY, data);
        }
      })
      .catch((err: Error) => {
        if (!ignore)
          setError(err.message || "Something went wrong loading users.");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Summary strip — derived counts, never stored.
  const stats = useMemo(() => {
    const admins = users.filter((u) => u.isAdmin).length;
    return {
      total: users.length,
      admins,
      members: users.length - admins,
    };
  }, [users]);

  // Users in the active role bucket (tab selector), independent of search —
  // lets the empty states distinguish "no users in this role at all" from
  // "your search found nothing in this role".
  const roleBucket = useMemo(() => {
    if (roleFilter === "admins") return users.filter((u) => u.isAdmin);
    if (roleFilter === "members") return users.filter((u) => !u.isAdmin);
    return users;
  }, [users, roleFilter]);

  // Client-side search over the active role bucket.
  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return roleBucket;
    return roleBucket.filter((u) => {
      const name = (u.name ?? "").toLowerCase();
      const email = u.email.toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [roleBucket, userSearch]);

  // "Load More" paging over the filtered list — the count line and search
  // above still see everything; only the DOM is windowed (9 per page).
  const {
    visible: visibleUsers,
    visibleCount,
    loadMore,
  } = usePagedList(filteredUsers, 9);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError("");
    setIsCreating(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          isAdmin: newIsAdmin,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setCreateError(data?.error || "Could not create user.");
        return;
      }

      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewIsAdmin(false);
      setIsCreateOpen(false);
      await fetchUsers();
      toast({ type: "success", title: "User created successfully!" });
      // The create may have emitted an invite email (no initial password).
      setInvitesRefreshKey((key) => key + 1);
    } catch {
      setCreateError("Something went wrong creating the user.");
    } finally {
      setIsCreating(false);
    }
  }

  function handleCreateDialogChange(open: boolean) {
    setIsCreateOpen(open);
    if (!open) {
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewIsAdmin(false);
      setCreateError("");
    }
  }

  async function handleCopyEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 1500);
    } catch {
      setCopiedEmail(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Could not delete user.");
        return;
      }
      await fetchUsers();
      toast({ type: "success", title: "User deleted successfully!" });
    } catch {
      setError("Something went wrong deleting the user.");
    }
  }

  return (
    <div className="users-page">
      <div className="users-page__header">
        <div className="users-page__header-text">
          <h1 className="users-page__title">User Management</h1>
          <p className="users-page__subtitle">
            Manage who can sign in and what they can do.
          </p>
        </div>
        <div className="users-page__header-actions">
          <Button
            variant="secondary"
            size="m"
            onClick={() => setIsInviteOpen(true)}
          >
            <UserPlus size={16} />
            Invite by Email
          </Button>
          <Button
            variant="primary"
            size="m"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={16} />
            New User
          </Button>
        </div>
      </div>

      {error && <div className="users-page__error">{error}</div>}

      {/* Control row above the stats — search on the left with the role
         filter beside it on one sight line, like the dashboard. Hidden
         once loaded when there are no users to filter. */}
      {isLoading || users.length > 0 ? (
        <div className="users-page__filters">
          {isLoading ? (
            <>
              <label className="users-page__search">
                <Skeleton width="100%" height={16} />
              </label>
              <SelectField
                className="users-page__role-filter"
                size="s"
                disabled
                value="all"
                ariaLabel="Filter Users by Role"
                options={ROLE_FILTER_OPTIONS}
              />
            </>
          ) : (
            <>
              <label className="users-page__search">
                <Search
                  size={16}
                  className="users-page__search-icon"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  className="users-page__search-input"
                  placeholder={`Search ${users.length} ${users.length === 1 ? "User" : "Users"}...`}
                  aria-label={`Search ${users.length} ${users.length === 1 ? "User" : "Users"}`}
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                />
              </label>
              <SelectField
                className="users-page__role-filter"
                size="s"
                ariaLabel="Filter Users by Role"
                options={ROLE_FILTER_OPTIONS}
                value={roleFilter}
                onValueChange={(next) => setRoleFilter(next ?? "all")}
              />
            </>
          )}
        </div>
      ) : null}

      <ActionDialog
        illustration="/assets/spots/add-users.svg"
        open={isCreateOpen}
        onOpenChange={handleCreateDialogChange}
        title="Create User"
        description="Add someone who can sign in and build resumes."
        confirmLabel="Create User"
        confirmIcon={UserPlus}
        loadingLabel="Creating..."
        isLoading={isCreating}
        formId="create-user-form"
        className="dialog-popup--wide"
      >
        <form
          id="create-user-form"
          className="users-page__create-form"
          onSubmit={handleCreate}
        >
          {createError && (
            <div className="users-page__error">{createError}</div>
          )}
          <div className="users-page__create-row">
            <Input
              label="Name"
              size="m"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              placeholder="Jane Doe"
              autoComplete="off"
            />
            <Input
              label="Email"
              type="email"
              size="m"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              placeholder="user@exabyting.com"
            />
            <Input
              label="Initial Password"
              type="password"
              size="m"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              helperText="Leave empty to email them a setup link instead."
              minLength={8}
            />
            <SwitchField
              checked={newIsAdmin}
              onCheckedChange={setNewIsAdmin}
              label="Admin Access"
              aria-label="Grant Admin Access"
            />
          </div>
        </form>
      </ActionDialog>

      {/* Desktop: stats + 3-column users list on the left tracks, invites
          in the right-hand track starting at the stats row. Below 1024px
          the columns collapse and invites flow beneath the grid. */}
      <div className="users-page__columns">
        <div className="users-page__main">
          {isLoading ? (
            /* The strip shows once users load — reserve its space while
               they're loading so the header doesn't collapse onto the grid. */
            <div className="stat-grid" aria-hidden="true">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          ) : users.length > 0 ? (
            <div className="stat-grid">
              <StatCard icon={Users} label="Total Users" value={stats.total} />
              <StatCard icon={Shield} label="Admins" value={stats.admins} />
              <StatCard icon={User} label="Members" value={stats.members} />
            </div>
          ) : null}

          {isLoading ? (
            <div className="users-page__grid" aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="users-page__card">
                  <div className="users-page__card-body">
                    <Skeleton width={64} height={64} radius="full" />
                    <Skeleton width={120} height={16} />
                    <Skeleton width={160} height={13} />
                    <Skeleton width={90} height={12} />
                    <div className="users-page__card-stats">
                      <Skeleton width="100%" height={16} />
                    </div>
                  </div>
                  <div className="users-page__card-footer">
                    <Skeleton width={64} height={11} />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No users yet."
              description="Create a user or send an invite to get your team started."
              action={
                <Button
                  variant="primary"
                  size="m"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus size={16} />
                  New User
                </Button>
              }
            />
          ) : roleBucket.length === 0 ? (
            roleFilter === "admins" ? (
              <EmptyState
                icon={Shield}
                title="No admins yet."
                description="Nobody has admin access yet. Grant it when creating a user or sending an invite."
                action={
                  <Button
                    variant="primary"
                    size="m"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <Plus size={16} />
                    New User
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={User}
                title="No members yet."
                description="Create a user or send an invite to add a member."
              />
            )
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching users"
              description="No users match your search. Try a different name or email."
              action={
                <Button
                  variant="secondary"
                  size="m"
                  onClick={() => {
                    setUserSearch("");
                    setRoleFilter("all");
                  }}
                >
                  <X size={16} />
                  Clear
                </Button>
              }
            />
          ) : (
            <>
              <ul className="users-page__grid">
                {visibleUsers.map((u) => (
                  <li key={u.id} className="users-page__card">
                    <div className="users-page__card-body">
                      <div className="users-page__card-corner">
                        {isProtectedAdmin(u.email) ? (
                          <Tooltip label="Protected Account">
                            <span className="users-page__card-protected">
                              <Lock size={14} aria-hidden="true" />
                            </span>
                          </Tooltip>
                        ) : (
                          <ActionMenu
                            trigger={
                              <Button
                                type="button"
                                variant="tertiary"
                                size="s"
                                iconOnly
                                aria-label={`More Actions for ${u.email}`}
                              >
                                <MoreVertical size={16} aria-hidden="true" />
                              </Button>
                            }
                            items={[
                              {
                                label: "Delete User",
                                icon: Trash2,
                                isDestructive: true,
                                onSelect: () => setDeleteTarget(u),
                              },
                            ]}
                          />
                        )}
                      </div>
                      <Avatar name={u.email} size={64} {...u.avatar} />
                      <div className="users-page__card-identity">
                        <span className="users-page__card-name">
                          {u.name || u.email.split("@")[0]}
                        </span>
                        <span className="users-page__card-email-row">
                          <span className="users-page__card-email">
                            {u.email}
                          </span>
                          <span className="users-page__card-copy-wrap">
                            <Button
                              type="button"
                              variant="tertiary"
                              size="s"
                              iconOnly
                              disabled={copiedEmail === u.email}
                              onClick={() => void handleCopyEmail(u.email)}
                              aria-label={copiedEmail === u.email
                                ? `Copied ${u.email}`
                                : `Copy email ${u.email}`}
                            >
                              <Copy size={14} aria-hidden="true" />
                            </Button>
                            {copiedEmail === u.email && (
                              <span className="users-page__card-copy-tooltip">
                                Copied
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="users-page__card-joined">
                          {`Joined ${formatDisplayDate(u.createdAt)}`}
                        </span>
                      </div>
                      <div className="users-page__card-stats">
                        <span
                          className="users-page__card-stat"
                          title="Resumes Created"
                        >
                          <FileText size={12} aria-hidden="true" />
                          <span className="users-page__card-stat-value">
                            {u.resumesCreated ?? 0}
                          </span>
                          <span className="users-page__card-stat-label">
                            Created
                          </span>
                        </span>
                        <span
                          className="users-page__card-stat"
                          title="Resumes Shared With Them"
                        >
                          <Share2 size={12} aria-hidden="true" />
                          <span className="users-page__card-stat-value">
                            {u.resumesShared ?? 0}
                          </span>
                          <span className="users-page__card-stat-label">
                            Shared
                          </span>
                        </span>
                      </div>
                    </div>
                    <footer className="users-page__card-footer">
                      <span className="users-page__card-role">
                        {u.isAdmin ? "Admin" : "Member"}
                      </span>
                      {u.isAdmin && (
                        <Tooltip label="Admin Access">
                          <span className="users-page__card-flag">
                            <Shield size={12} aria-hidden="true" />
                          </span>
                        </Tooltip>
                      )}
                    </footer>
                  </li>
                ))}
              </ul>

              <LoadMoreFooter
                visible={visibleCount}
                total={filteredUsers.length}
                pageSize={9}
                itemLabel="users"
                onLoadMore={loadMore}
              />
            </>
          )}
        </div>

        {/* Email invites live beside the grid, one stat card wide — sending
            one from the dialog or accepting it lands the person above. */}
        <div className="users-page__aside">
          <PendingInvitesList
            refreshKey={invitesRefreshKey}
            onChanged={() => {
              void fetchUsers();
            }}
          />
        </div>
      </div>

      <ActionDialog
        illustration="/assets/spots/trash-delete.svg"
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete user "${deleteTarget?.email ?? ""}"?`}
        description="This will permanently remove the user and all their resumes."
        confirmLabel="Delete"
        confirmIcon={Trash2}
        isDestructive
        onConfirm={() => {
          void confirmDelete();
          setDeleteTarget(null);
        }}
      />

      <InviteUserDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        onInviteSent={() => {
          void fetchUsers();
          setInvitesRefreshKey((key) => key + 1);
        }}
      />
    </div>
  );
}
