import { FilePlus } from "lucide-react";
import { AppSidebar } from "@/components/common/AppSidebar";
import { AppTopBar } from "@/components/common/AppTopBar";
import { ResumeCardSkeleton } from "@/components/dashboard/ResumeCardSkeleton";
import { Button, Skeleton } from "@/components/ui";
import "@/components/common/AppShell.css";
import "./page.css";

/**
 * Shown by the App Router while DashboardPage's server render (auth +
 * resume list) is in flight — e.g. right after the editor's Back button —
 * instead of a blank screen. See
 * docs/guides/investigate-and-fix-slow-nextjs-apps.md §5 Phase 2.
 *
 * AppShell itself can't run here — it's an async Server Component that
 * fetches the user, and awaiting that would defeat the point of an
 * instant fallback. AppSidebar and AppTopBar don't fetch anything
 * themselves, though, so rendering them directly (with placeholder props
 * for the user data this fallback doesn't have yet) reserves the exact
 * same width/height AppShell's real chrome will, and never drifts from
 * it — there's nothing here to keep in sync by hand.
 */
export default function DashboardLoading() {
  return (
    <div className="app-shell">
      <AppTopBar isAdmin={false} user={null} />
      <AppSidebar isAdmin={false} user={null} />
      <div className="app-shell__content">
        <DashboardSkeleton />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <main className="dashboard">
      <div className="dashboard__toolbar">
        <header className="dashboard__header">
          <h1 className="dashboard__title">Resumes</h1>
          <Button type="button" variant="primary" size="m" disabled>
            <FilePlus size={16} />
            New Resume
          </Button>
        </header>
        <div className="dashboard__filters">
          <div className="dashboard__search">
            <Skeleton width="100%" height={16} />
          </div>
          <div className="dashboard__owner-filter">
            <Skeleton width="100%" height={40} radius="lg" />
          </div>
          <div className="dashboard__sort">
            <Skeleton width="100%" height={40} radius="lg" />
          </div>
        </div>
      </div>
      <ul className="dashboard__list">
        {Array.from({ length: 8 }, (_, index) => (
          <ResumeCardSkeleton key={index} />
        ))}
      </ul>
    </main>
  );
}
