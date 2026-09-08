import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { AppSidebar } from "./AppSidebar";
import "./AppShell.css";

interface AppShellProps {
  children: ReactNode;
}

/**
 * Wraps every authenticated page (dashboard, Account, Manage Users) with
 * the persistent left nav — one place decides the sidebar + its admin
 * visibility, so pages don't each re-derive it. The editor page opts out
 * (its own full-screen chrome, with a "← Resumes" back link instead).
 */
export default async function AppShell({ children }: AppShellProps) {
  const user = await getCurrentUser();

  return (
    <div className="app-shell">
      <AppSidebar isAdmin={user?.role === "admin"} />
      <div className="app-shell__content">{children}</div>
    </div>
  );
}
