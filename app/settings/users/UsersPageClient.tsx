"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Users, Loader2, Trash2, UserPlus } from "lucide-react";
import { Input, Button, EmptyState, ConfirmDialog } from "@/components/ui";
import { isProtectedAdmin } from "@/lib/auth/constants";
import "./page.css";

interface User {
  id: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

export default function UsersPageClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

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
        if (!ignore) setError(err.message || "Something went wrong loading users.");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsCreating(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          isAdmin: newIsAdmin,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Could not create user.");
        return;
      }

      setNewEmail("");
      setNewPassword("");
      setNewIsAdmin(false);
      await fetchUsers();
    } catch {
      setError("Something went wrong creating the user.");
    } finally {
      setIsCreating(false);
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
    } catch {
      setError("Something went wrong deleting the user.");
    }
  }

  return (
    <div className="users-page">
      <h1 className="users-page__title">User Management</h1>

      {error && <div className="users-page__error">{error}</div>}

      <div className="users-page__create">
        <h2 className="users-page__create-title">Create User</h2>
        <form className="users-page__create-form" onSubmit={handleCreate}>
          <div className="users-page__create-row">
            <Input
              label="Email"
              type="email"
              size="s"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              placeholder="user@exabyting.com"
            />
            <Input
              label="Initial Password"
              type="password"
              size="s"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
            <label className="users-page__create-checkbox">
              <input
                type="checkbox"
                checked={newIsAdmin}
                onChange={(e) => setNewIsAdmin(e.target.checked)}
              />
              Admin
            </label>
          </div>
          <div>
            <Button
              type="submit"
              variant="primary"
              size="s"
              disabled={isCreating}
            >
              {isCreating ? (
                <Loader2 size={14} className="button__icon--spin" />
              ) : (
                <UserPlus size={14} />
              )}
              {isCreating ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </div>

      <div className="users-page__list">
        <div className="users-page__list-header">
          <h2 className="users-page__list-title">All Users</h2>
          <span className="users-page__list-count">
            {isLoading ? "Loading..." : `${users.length} user${users.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {isLoading ? null : users.length === 0 ? (
          <EmptyState icon={Users} title="No users yet." />
        ) : (
          users.map((u) => (
            <div key={u.id} className="users-page__user">
              <div className="users-page__user-info">
                <span className="users-page__user-email">{u.email}</span>
                <span
                  className={`users-page__user-badge ${u.isAdmin ? "users-page__user-badge--admin" : "users-page__user-badge--user"}`}
                >
                  {u.isAdmin ? "Admin" : "User"}
                </span>
              </div>
              <div className="users-page__user-actions">
                {isProtectedAdmin(u.email) ? (
                  <span className="users-page__user-protected">
                    Cannot be deleted
                  </span>
                ) : (
                  <Button
                    variant="tertiary"
                    size="s"
                    onClick={() => setDeleteTarget(u)}
                  >
                    <Trash2 size={14} />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete user "${deleteTarget?.email ?? ""}"?`}
        description="This will permanently remove the user and all their resumes."
        onConfirm={confirmDelete}
      />
    </div>
  );
}
