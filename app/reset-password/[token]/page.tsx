"use client";

import { useState, type FormEvent, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Mail, ArrowLeft, LogIn, CheckCircle2 } from "lucide-react";
import { Input, Button } from "@/components/ui";
import "./page.css";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetDone, setResetDone] = useState(false);
  const [validated, setValidated] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      queueMicrotask(() => {
        if (!cancelled) {
          setError("No reset token provided.");
          setValidated(false);
        }
      });
      return;
    }
    void fetch(`/api/auth/reset-password/${token}`, {
      method: "GET",
    })
      .then(async (res) => {
        if (cancelled) return;
        const data = await res.json().catch(() => null);
        if (!cancelled) {
          setValidated(data?.valid ?? false);
          setError(data?.valid ? "" : "This reset link is invalid or has expired.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setValidated(false);
          setError("Could not validate this reset link.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Failed to reset password.");
        return;
      }

      setResetDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!validated && token) {
    return (
      <div className="reset-page">
        <div className="reset-card">
          <h1 className="reset-header__title">Validating reset link…</h1>
        </div>
      </div>
    );
  }

  if (!validated) {
    return (
      <div className="reset-page">
        <div className="reset-card">
          <div className="reset-header">
            <h1 className="reset-header__title">Invalid reset link</h1>
            <p className="reset-header__subtitle">
              This password reset link is invalid or has expired. Request a new
              one on the sign-in page.
            </p>
          </div>
          <div className="reset-actions">
            <Button
              type="button"
              variant="primary"
              size="l"
              onClick={() => router.push("/forgot-password")}
            >
              <Mail size={16} />
              Request New Link
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (resetDone) {
    return (
      <div className="reset-page">
        <div className="reset-card">
          <div className="reset-header">
            <div className="reset-header__success">
              <CheckCircle2 size={40} aria-hidden="true" />
            </div>
            <h1 className="reset-header__title">Password reset</h1>
            <p className="reset-header__subtitle">
              Your password has been changed. You can sign in now.
            </p>
          </div>
          <div className="reset-actions">
            <Button
              type="button"
              variant="primary"
              size="l"
              onClick={() => router.push("/login")}
            >
              <LogIn size={16} /> Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-page">
      <div className="reset-card">
        <div className="reset-header">
          <Button
            type="button"
            variant="tertiary"
            size="s"
            iconOnly
            onClick={() => router.push("/login")}
            aria-label="Back to sign in"
          >
            <ArrowLeft size={14} />
          </Button>
          <h1 className="reset-header__title">Set new password</h1>
          <p className="reset-header__subtitle">
            Choose a strong new password for your account.
          </p>
        </div>

        <form className="reset-form" onSubmit={handleSubmit}>
          {error && (
            <div className="reset-form__error">
              <Mail size={14} aria-hidden="true" />
              {error}
            </div>
          )}

          <Input
            label="New password"
            type="password"
            size="m"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
            placeholder="••••••••"
          />

          <Input
            label="Confirm password"
            type="password"
            size="m"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
            placeholder="••••••••"
          />

          <Button
            type="submit"
            variant="primary"
            size="l"
            className="reset-form__submit"
            disabled={isLoading}
          >
            {isLoading ? "Resetting…" : "Reset Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
