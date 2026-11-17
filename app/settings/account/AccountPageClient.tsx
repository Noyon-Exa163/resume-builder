"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Badge, Input, Button, ActionDialog, useToast } from "@/components/ui";
import {
  Calendar,
  KeyRound,
  Mail,
  Pencil,
  Shield,
  Smile,
  User,
} from "lucide-react";
import AvatarPickerDialog from "@/components/settings/AvatarPickerDialog";
import type { AvatarPreferences } from "@/lib/avatar";
import { formatDisplayDate } from "@/lib/date";
import "./page.css";

interface AccountPageClientProps {
  name: string;
  email: string;
  role: "user" | "admin";
  /** ISO timestamp the account was created — shown as "Member Since". */
  memberSince: string;
  avatar: AvatarPreferences;
}

export default function AccountPageClient({
  name,
  email,
  role,
  memberSince,
  avatar,
}: AccountPageClientProps) {
  const router = useRouter();

  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(name);
  const [nameError, setNameError] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  // Bumped on each open so the picker remounts and drops any unsaved draft.
  const [avatarDialogKey, setAvatarDialogKey] = useState(0);
  const [avatarError, setAvatarError] = useState("");
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  function handleNameDialogChange(open: boolean) {
    setIsNameDialogOpen(open);
    if (open) {
      setNameDraft(name);
      setNameError("");
    }
  }

  async function handleNameSubmit(e: FormEvent) {
    e.preventDefault();
    setNameError("");
    setIsSavingName(true);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameDraft }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setNameError(data?.error || "Could not update your name.");
        return;
      }

      setIsNameDialogOpen(false);
      toast({ type: "success", title: "Name updated successfully!" });
      router.refresh();
    } catch {
      setNameError("Something went wrong. Please try again.");
    } finally {
      setIsSavingName(false);
    }
  }

  function handleAvatarDialogChange(open: boolean) {
    setIsAvatarDialogOpen(open);
    if (open) {
      setAvatarError("");
      setAvatarDialogKey((k) => k + 1);
    }
  }

  async function handleAvatarSave(next: AvatarPreferences) {
    setAvatarError("");
    setIsSavingAvatar(true);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: next }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setAvatarError(data?.error || "Could not update your avatar.");
        return;
      }

      setIsAvatarDialogOpen(false);
      toast({ type: "success", title: "Avatar updated successfully!" });
      router.refresh();
    } catch {
      setAvatarError("Something went wrong. Please try again.");
    } finally {
      setIsSavingAvatar(false);
    }
  }

  function handleDialogChange(open: boolean) {
    setIsDialogOpen(open);
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Could not change password. Please try again.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsDialogOpen(false);
      toast({ type: "success", title: "Password updated successfully!" });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="account-page">
      <header className="account-page__header">
        <h1 className="account-page__title">Account</h1>
        <p className="account-page__subtitle">
          Manage your profile, avatar and sign-in details.
        </p>
      </header>

      <div className="account-page__grid">
        <section className="account-card account-profile" aria-label="Profile">
          <div className="account-profile__avatar-wrap">
            <Avatar
              name={email}
              size={88}
              hue={avatar.hue}
              expression={avatar.expression}
              followPointer
              bare
            />
            <Button
              variant="secondary"
              size="s"
              iconOnly
              className="account-profile__avatar-edit"
              aria-label="Customize Avatar"
              onClick={() => handleAvatarDialogChange(true)}
            >
              <Pencil size={14} />
            </Button>
          </div>
          <div className="account-profile__identity">
            <span className="account-profile__name">{name}</span>
            <span className="account-profile__email">{email}</span>
            <Badge variant={role === "admin" ? "default" : "secondary"}>
              {role === "admin" ? "Admin" : "Member"}
            </Badge>
          </div>
          <div className="account-profile__actions">
            <Button
              variant="secondary"
              size="m"
              onClick={() => handleAvatarDialogChange(true)}
            >
              <Smile size={16} />
              Customize Avatar
            </Button>
            <Button
              variant="secondary"
              size="m"
              onClick={() => setIsDialogOpen(true)}
            >
              <KeyRound size={16} />
              Change Password
            </Button>
          </div>
        </section>

        <section className="account-card account-details" aria-label="Account Details">
          <h2 className="account-details__title">Account Details</h2>
          <dl className="account-details__list">
            <div className="account-details__row">
              <dt className="account-details__label">
                <span className="account-details__label-icon">
                  <User size={14} aria-hidden="true" />
                </span>
                Name
              </dt>
              <dd className="account-details__value">
                <span className="account-details__value-text">{name}</span>
                <Button
                  variant="tertiary"
                  size="s"
                  iconOnly
                  aria-label="Edit Name"
                  onClick={() => handleNameDialogChange(true)}
                >
                  <Pencil size={14} />
                </Button>
              </dd>
            </div>
            <div className="account-details__row">
              <dt className="account-details__label">
                <span className="account-details__label-icon">
                  <Mail size={14} aria-hidden="true" />
                </span>
                Email
              </dt>
              <dd className="account-details__value">
                <span className="account-details__value-text">{email}</span>
              </dd>
            </div>
            <div className="account-details__row">
              <dt className="account-details__label">
                <span className="account-details__label-icon">
                  <Shield size={14} aria-hidden="true" />
                </span>
                Role
              </dt>
              <dd className="account-details__value">
                <Badge variant={role === "admin" ? "default" : "secondary"}>
                  {role === "admin" ? "Admin" : "Member"}
                </Badge>
              </dd>
            </div>
            <div className="account-details__row">
              <dt className="account-details__label">
                <span className="account-details__label-icon">
                  <Calendar size={14} aria-hidden="true" />
                </span>
                Member Since
              </dt>
              <dd className="account-details__value">
                {formatDisplayDate(memberSince)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <AvatarPickerDialog
        key={avatarDialogKey}
        open={isAvatarDialogOpen}
        onOpenChange={handleAvatarDialogChange}
        email={email}
        value={avatar}
        isSaving={isSavingAvatar}
        error={avatarError}
        onSave={handleAvatarSave}
      />

      <ActionDialog
        icon={Pencil}
        open={isNameDialogOpen}
        onOpenChange={handleNameDialogChange}
        title="Edit Name"
        description="This is the name shown next to your avatar."
        confirmLabel="Save Name"
        loadingLabel="Saving…"
        isLoading={isSavingName}
        formId="edit-name-form"
      >
        <form
          id="edit-name-form"
          className="account-form"
          onSubmit={handleNameSubmit}
        >
          <div className="account-form__fields">
            {nameError && (
              <div className="account-form__error">{nameError}</div>
            )}
            <Input
              label="Name"
              size="m"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              required
              maxLength={100}
              autoComplete="name"
            />
          </div>
        </form>
      </ActionDialog>

      <ActionDialog
        icon={KeyRound}
        open={isDialogOpen}
        onOpenChange={handleDialogChange}
        title="Change Password"
        description="Enter your current password, then choose a new one."
        confirmLabel="Update Password"
        confirmIcon={KeyRound}
        loadingLabel="Updating…"
        isLoading={isLoading}
        formId="change-password-form"
      >
        <form
          id="change-password-form"
          className="account-form"
          onSubmit={handleSubmit}
        >
          <div className="account-form__fields">
            {error && <div className="account-form__error">{error}</div>}

            <Input
              label="Current Password"
              type="password"
              size="m"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <Input
              label="New Password"
              type="password"
              size="m"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />

            <Input
              label="Confirm New Password"
              type="password"
              size="m"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </form>
      </ActionDialog>
    </div>
  );
}
