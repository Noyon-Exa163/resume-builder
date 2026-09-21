"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar, Input, Button } from "@/components/ui";
import { Loader2, LogIn } from "lucide-react";
import "./page.css";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Incorrect email or password.");
        return;
      }

      router.push(nextPath);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <img
            src="/assets/Logos/ExaResume_Full.svg"
            alt="ExaResume"
            className="login-header__logo"
          />
          <Avatar name={email.trim() || "ExaResume"} size={64} />
          <h1 className="login-header__title">Sign In</h1>
          <p className="login-header__subtitle">
            Enter your credentials to continue.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-form__error">{error}</div>}

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

          <Button
            type="submit"
            variant="primary"
            size="m"
            className="login-form__submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 size={16} className="button__icon--spin" />
            ) : (
              <LogIn size={16} />
            )}
            {isLoading ? "Signing In..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}
