"use client";

import { useState } from "react";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import Button from "@/components/ui/Button";
import { Avatar } from "@/components/ui";
import AvatarPickerDialog from "@/components/settings/AvatarPickerDialog";
import type { AvatarPreferences } from "@/lib/avatar";
import "./onboarding.css";

export default function InviteOnboardingPage() {
  const router = useRouter();
  // The token arrives as a path segment (/invite/<token>) — the same shape
  // the invite email links to — not as a query parameter.
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatar, setAvatar] = useState<AvatarPreferences>({
    hue: null,
    expression: null,
  });
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  /** The invited email, from token validation — seeds avatar previews. */
  const [inviteEmail, setInviteEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validated, setValidated] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      queueMicrotask(() => {
        if (!cancelled) {
          setError("No invite token provided.");
          setValidated(false);
        }
      });
      return;
    }
    void fetch(`/api/invites/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.valid) {
          setValidated(true);
          setInviteEmail(data.email ?? "");
          setError(null);
        } else {
          setValidated(false);
          setError(data.error || "This invite is not valid.");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setValidated(false);
        setError("Could not validate this invite.");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!validated) {
    return (
      <main className="onboarding-page">
        <div className="onboarding-card">
          <h1>Accept Invitation</h1>
          {error && (
            <p className="onboarding-error">{error}</p>
          )}
          {!error && token && (
            <p>Validating your invite…</p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="onboarding-page">
      <div className="onboarding-card">
        <h1>Set Up Your Account</h1>
        <p>Create your password and profile to get started.</p>

        {error && <p className="onboarding-error">{error}</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);

            if (password !== confirmPassword) {
              setError("Passwords do not match.");
              return;
            }

            setIsLoading(true);
            void fetch(`/api/invites/${token}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: name.trim(),
                password,
                avatarHue: avatar.hue,
                avatarExpression: avatar.expression,
              }),
            })
              .then(async (res) => {
                const data = await res.json();
                if (!res.ok) {
                  setError(data.error || "Failed to create account.");
                  setIsLoading(false);
                  return;
                }
                void router.push("/");
              })
              .catch(() => {
                setError("Something went wrong. Please try again.");
                setIsLoading(false);
              });
          }}
        >
          <div className="onboarding-field">
            <label htmlFor="onboarding-name">Full name</label>
            <input
              id="onboarding-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              required
              minLength={2}
            />
          </div>
          <div className="onboarding-field">
            <label>Avatar (optional)</label>
            <div className="onboarding-avatar-row">
              <Avatar
                name={inviteEmail || "new.member@exabyting.com"}
                size={44}
                hue={avatar.hue}
                expression={avatar.expression}
              />
              <Button
                type="button"
                variant="secondary"
                size="s"
                onClick={() => setIsAvatarPickerOpen(true)}
              >
                <UserRound size={14} />
                {avatar.hue === null && avatar.expression === null
                  ? "Choose Avatar"
                  : "Change Avatar"}
              </Button>
            </div>
          </div>
          <div className="onboarding-field">
            <label htmlFor="onboarding-password">Password</label>
            <input
              id="onboarding-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
            />
          </div>
          <div className="onboarding-field">
            <label htmlFor="onboarding-confirm-password">Confirm password</label>
            <input
              id="onboarding-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="l"
            disabled={isLoading}
            className="onboarding-submit"
          >
            {isLoading ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </div>

      <AvatarPickerDialog
        open={isAvatarPickerOpen}
        onOpenChange={setIsAvatarPickerOpen}
        email={inviteEmail || "new.member@exabyting.com"}
        value={avatar}
        isSaving={false}
        error=""
        onSave={(next) => {
          setAvatar(next);
          setIsAvatarPickerOpen(false);
        }}
      />
    </main>
  );
}
