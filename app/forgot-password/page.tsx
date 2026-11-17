"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import Link from "next/link";
import { Input, Button } from "@/components/ui";
import "./page.css";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Could not send reset link.");
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="forgot-page">
      {/* Brand story panel — desktop only */}
      <aside className="forgot-brand" aria-hidden="true">
        <div className="forgot-brand__logo-chip">
          <img
            src="/assets/Logos/ExaResume_Full.svg"
            alt=""
            className="forgot-brand__logo"
          />
        </div>

        <div className="forgot-brand__body">
          <h2 className="forgot-brand__headline">
            Reset your password, keep your Exabyting standard.
          </h2>
          <p className="forgot-brand__subcopy">
            A new password keeps your resumes and invites secure. Set one in
            under a minute.
          </p>
        </div>
      </aside>

      <div className="forgot-panel">
        <div className="forgot-card">
          {sent ? (
            <>
              <div className="forgot-header forgot-header--success">
                <div className="forgot-header__badge">
                  <Lock size={32} aria-hidden="true" />
                </div>
                <h1 className="forgot-header__title">Check your email</h1>
                <p className="forgot-header__subtitle">
                  We&rsquo;ve sent a password reset link to{" "}
                  <strong className="forgot-header__email">{email}</strong>.
                </p>
                <p className="forgot-header__hint">
                  The link expires in 1 hour.
                </p>
              </div>

              <div className="forgot-actions">
                <Button
                  type="button"
                  variant="primary"
                  size="l"
                  onClick={() => router.push("/login")}
                >
                  Sign In
                </Button>
              </div>
            </>
          ) : (
            <>
            <div className="forgot-header">
              <div className="forgot-header__badge">
                <Lock size={32} aria-hidden="true" />
              </div>
                <h1 className="forgot-header__title">Forgot password?</h1>
                <p className="forgot-header__subtitle">
                  Enter your email and we&rsquo;ll send a link to reset your
                  password.
                </p>
              </div>

              <form className="forgot-form" onSubmit={handleSubmit}>
                {error && (
                  <div className="forgot-form__error">
                    <Mail size={14} aria-hidden="true" />
                    {error}
                  </div>
                )}

                <Input
                  label="Email"
                  type="email"
                  size="m"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  required
                  autoComplete="email"
                  placeholder="you@exabyting.com"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="l"
                  className="forgot-form__submit"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending…" : "Send Reset Link"}
                </Button>
              </form>

              <p className="forgot-divider">
                <span>Remembered your password?</span>
              </p>

              <Button
                type="button"
                variant="secondary"
                size="l"
                className="forgot-form__sign-in"
                onClick={() => router.push("/login")}
              >
                <Mail size={16} /> Sign In
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
