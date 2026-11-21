"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input, Button, useToast } from "@/components/ui";
import { clearPageDataCache } from "@/lib/utils/pageDataCache";
import { Loader2, LogIn, Users, Palette, MonitorSmartphone, Mail } from "lucide-react";
import "./page.css";

const BRAND_POINTS = [
  {
    icon: Users,
    title: "Built for the Whole Team",
    description:
      "Shared resumes, roles, and invites — everyone works in one place.",
  },
  {
    icon: Palette,
    title: "On-Brand by Default",
    description:
      "Every template ships with Exabyting's type, logo, and accents.",
  },
  {
    icon: MonitorSmartphone,
    title: "True-to-Print Preview",
    description:
      "What you see while editing is exactly what exports as a PDF.",
  },
] as const;

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Incorrect email or password.");
        return;
      }

      // Fresh start for the new identity — drop any cached page data the
      // previous user left in this tab.
      clearPageDataCache();

      router.push(nextPath);
      toast({ type: "success", title: "Signed in successfully!" });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Brand story panel — desktop only */}
      <aside className="login-brand" aria-hidden="true">
        <div className="login-brand__logo-chip">
          <img
            src="/assets/Logos/ExaResume_Full.svg"
            alt=""
            className="login-brand__logo"
          />
        </div>

        <div className="login-brand__body">
          <h2 className="login-brand__headline">
            Resumes that carry the Exabyting standard.
          </h2>
          <p className="login-brand__subcopy">
            One workspace where every CV is parsed, polished, and exported
            without anyone touching a template file.
          </p>

          <ul className="login-brand__points">
            {BRAND_POINTS.map(({ icon: Icon, title, description }) => (
              <li key={title} className="login-brand__point">
                <span className="login-brand__point-icon">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className="login-brand__point-text">
                  <span className="login-brand__point-title">{title}</span>
                  <span className="login-brand__point-description">
                    {description}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="login-panel">
        <div className="login-card">
          <div className="login-header">
            <div className="login-header__logo-wrap">
              <img
                src="/assets/Logos/ExaResume_Full.svg"
                alt="ExaResume"
                className="login-header__logo"
              />
            </div>
            <h1 className="login-header__title">Welcome back</h1>
            <p className="login-header__subtitle">
              Enter your credentials to continue.
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="login-form__error">
                <Mail size={14} aria-hidden="true" />
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              size="m"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@exabyting.com"
            />

            <Input
              label="Password"
              type="password"
              size="m"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <div className="login-form__footer">
              <label className="login-form__remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  aria-label="Stay signed in"
                />
                <span>Stay signed in</span>
              </label>
              <Link href="/forgot-password" className="login-form__forgot">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="l"
              className="login-form__submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 size={18} className="button__icon--spin" />
              ) : (
                <LogIn size={18} />
              )}
              {isLoading ? "Signing In…" : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
