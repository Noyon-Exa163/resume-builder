"use client";

import { useState, type FormEvent } from "react";
import { Input, Button } from "@/components/ui";
import { KeyRound, Loader2 } from "lucide-react";
import "./page.css";

export default function AccountPageClient() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

      <div className="account-card">
        <h2 className="account-card__title">Change Password</h2>
        <form className="account-form" onSubmit={handleSubmit}>
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

          <Button type="submit" variant="primary" size="m" disabled={isLoading}>
            {isLoading ? (
              <Loader2 size={16} className="button__icon--spin" />
            ) : (
              <KeyRound size={16} />
            )}
            {isLoading ? "Updating…" : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
