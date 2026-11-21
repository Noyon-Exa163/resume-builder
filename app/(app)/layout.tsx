import type { ReactNode } from "react";
import AppShell from "@/components/common/AppShell";

/**
 * The authenticated shell for the dashboard, users, AI settings and account
 * routes. A shared layout — not per-page AppShell wrappers — so the sidebar
 * and top bar mount once and persist across menu switches: navigating
 * between menus swaps only `children`, and the sidebar never reloads.
 * Auth still runs here (AppShell awaits the session), and each page gates
 * its own data server-side.
 */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
