import { FilePlus } from "lucide-react";
import { StatCardSkeleton } from "@/components/common/StatCardSkeleton";
import { ResumeCardSkeleton } from "@/components/dashboard/ResumeCardSkeleton";
import { Button, Skeleton } from "@/components/ui";
import "./page.css";

/**
 * Shown by the App Router while DashboardPage's server render (auth +
 * resume list) is in flight — e.g. right after the editor's Back button —
 * instead of a blank screen. Mirrors the dashboard's real layout: header
 * with actions, filter row, the stat strip, and the resume-card grid.
 */
export default function DashboardLoading() {
  return (
          <DashboardSkeleton />
    
  );
}

function DashboardSkeleton() {
  return (
    <main className="dashboard">
      <div className="dashboard__toolbar">
        <header className="dashboard__header">
          <div className="dashboard__header-text">
            <h1 className="dashboard__title">Resumes</h1>
            <p className="dashboard__subtitle">
              Browse, create and share your resumes.
            </p>
          </div>
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
      <div className="stat-grid">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <ul className="dashboard__list">
        {Array.from({ length: 9 }, (_, index) => (
          <ResumeCardSkeleton key={index} />
        ))}
      </ul>
    </main>
  );
}
