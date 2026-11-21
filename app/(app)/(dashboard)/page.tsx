import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listResumesForUser } from "@/lib/db/resumeQueries";
import DashboardClient from "./DashboardClient";

/**
 * Server-rendered so the resume list loads in the same request as
 * AppShell's auth check (getCurrentUser() is React.cache()-deduped, so this
 * costs one DB round trip, not two) instead of painting an empty shell and
 * waiting on a follow-up browser -> API -> DB hop. See
 * docs/guides/investigate-and-fix-slow-nextjs-apps.md §4.2 / Phase 2.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const entries = await listResumesForUser(user);
  entries.sort((a, b) =>
    b.resume.meta.updatedAt.localeCompare(a.resume.meta.updatedAt),
  );

  return <DashboardClient initialEntries={entries} />;
}
