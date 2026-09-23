import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { AppSidebar } from "./AppSidebar";
import { AppTopBar } from "./AppTopBar";
import "./AppShell.css";

interface AppShellProps {
  children: ReactNode;
}

/**
 * Wraps every authenticated page (dashboard, Account, Manage Users) with
 * the account navigation — a left sidebar, or a top bar + drawer on narrow
 * screens — so pages don't each re-derive it or its admin visibility. The
 * editor page opts out (its own full-screen chrome, with a "← Resumes"
 * back link instead).
 */
export default async function AppShell({ children }: AppShellProps) {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  const navUser = user
    ? { name: user.name, email: user.email, avatar: user.avatar }
    : null;

  // Both navs are always rendered and CSS picks one by viewport width, so
  // the server markup is identical for every device.
  return (
    <div className="app-shell">
      <AppTopBar isAdmin={isAdmin} user={navUser} />
      <AppSidebar isAdmin={isAdmin} user={navUser} />
      <div className="app-shell__content">{children}</div>
    </div>
  );
}
