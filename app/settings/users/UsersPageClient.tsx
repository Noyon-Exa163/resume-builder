"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Lock, Plus, Search, Shield, Trash2, User, UserPlus, Users, X } from "lucide-react";
import {
  Avatar,
  Badge,
  Input,
  Button,
  EmptyState,
  ActionDialog,
  Skeleton,
  SwitchField,
  Tooltip,
  useToast,
} from "@/components/ui";
import { InviteUserDialog } from "@/components/editor";
import { PendingInvitesList } from "@/components/settings/PendingInvitesList";
import { StatCard } from "@/components/common/StatCard";
import { isProtectedAdmin } from "@/lib/auth/constants";
import { formatDisplayDate } from "@/lib/date";
import type { AvatarPreferences } from "@/lib/avatar";
import "./page.css";

interface User {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  avatar: AvatarPreferences;
}

export default function UsersPageClient() {
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
  /** Bumped whenever an invite is sent/resended/revoked so the invites list
   *  refetches. */
  const [invitesRefreshKey, setInvitesRefreshKey] = useState(0);

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
    } catch {
      setError("Something went wrong loading users.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

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
        if (!ignore) setUsers(data);
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

  // Client-side filter over name and email.
  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((u) => {
      const name = (u.name ?? "").toLowerCase();
      const email = u.email.toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [users, userSearch]);

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

      {!isLoading && users.length > 0 && (
        <div className="stat-grid">
          <StatCard icon={Users} label="Total Users" value={stats.total} />
          <StatCard icon={Shield} label="Admins" value={stats.admins} />
          <StatCard icon={User} label="Members" value={stats.members} />
        </div>
      )}

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

      <div className="users-page__list">
        <div className="users-page__list-header">
          <div className="users-page__list-heading">
            <h2 className="users-page__list-title">All Users</h2>
            {isLoading ? (
              <Skeleton width={64} height={13} />
            ) : (
              <span className="users-page__list-count">
                {`${filteredUsers.length} user${filteredUsers.length !== 1 ? "s" : ""}`}
              </span>
            )}
          </div>
          {users.length > 0 && (
            <label className="users-page__search">
              <Search
                size={16}
                className="users-page__search-icon"
                aria-hidden="true"
              />
              <input
                type="search"
                className="users-page__search-input"
                placeholder="Search Users..."
                aria-label="Search Users"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
              />
            </label>
          )}
        </div>

        {isLoading ? (
          Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="users-page__user">
              <div className="users-page__user-info">
                <Skeleton width={40} height={40} radius="full" />
                <div className="users-page__user-identity">
                  <Skeleton width={140} height={14} />
                  <Skeleton width={180} height={12} />
                </div>
              </div>
              <Skeleton width={48} height={18} radius="full" />
              <Skeleton width={32} height={32} radius="full" />
            </div>
          ))
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
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching users"
            description="No users match your search. Try a different name or email."
            action={
              <Button
                variant="secondary"
                size="m"
                onClick={() => setUserSearch("")}
              >
                <X size={16} />
                Clear
              </Button>
            }
          />
        ) : (
          filteredUsers.map((u) => (
            <div key={u.id} className="users-page__user">
              <div className="users-page__user-info">
                <Avatar name={u.email} size={40} {...u.avatar} />
                <div className="users-page__user-identity">
                  <span className="users-page__user-name">
                    {u.name || u.email.split("@")[0]}
                  </span>
                  <span className="users-page__user-email">{u.email}</span>
                </div>
              </div>
              <span className="users-page__user-joined">
                Joined {formatDisplayDate(u.createdAt)}
              </span>
              <Badge variant={u.isAdmin ? "default" : "secondary"}>
                {u.isAdmin ? "Admin" : "Member"}
              </Badge>
              <div className="users-page__user-actions">
                {isProtectedAdmin(u.email) ? (
                  <Tooltip label="Protected Account">
                    <span className="users-page__user-protected">
                      <Lock size={14} aria-hidden="true" />
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip label="Delete User">
                    <button
                      type="button"
                      className="users-page__user-delete"
                      aria-label={`Delete ${u.email}`}
                      onClick={() => setDeleteTarget(u)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>
          ))
        )}
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

      <PendingInvitesList
        refreshKey={invitesRefreshKey}
        onChanged={() => {
          void fetchUsers();
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
