"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Input, Button, ActionDialog } from "@/components/ui";
import { KeyRound, Pencil } from "lucide-react";
import "./page.css";

interface AccountPageClientProps {
  name: string;
  email: string;
}

export default function AccountPageClient({
  name,
  email,
}: AccountPageClientProps) {
  const router = useRouter();

  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(name);
  const [nameError, setNameError] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      router.refresh();
    } catch {
      setNameError("Something went wrong. Please try again.");
    } finally {
      setIsSavingName(false);
    }
  }

  function handleDialogChange(open: boolean) {
    setIsDialogOpen(open);
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setSuccess("");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

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

      setSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="account-page">
      <h1 className="account-page__title">Account</h1>

      <div className="account-card account-profile">
        <Avatar name={email} size={72} />
        <div className="account-profile__identity">
          <div className="account-profile__name-row">
            <span className="account-profile__name">{name}</span>
            <Button
              variant="tertiary"
              size="s"
              iconOnly
              aria-label="Edit Name"
              onClick={() => handleNameDialogChange(true)}
            >
              <Pencil size={16} />
            </Button>
          </div>
          <span className="account-profile__email">{email}</span>
        </div>
        <Button
          variant="secondary"
          size="m"
          className="account-profile__action"
          onClick={() => setIsDialogOpen(true)}
        >
          <KeyRound size={16} />
          Change Password
        </Button>
      </div>

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
            {success && <div className="account-form__success">{success}</div>}
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
