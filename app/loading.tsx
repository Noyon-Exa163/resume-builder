import { FilePlus, FileText, Menu, User } from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import "@/components/common/AppShell.css";
import "@/components/common/AppSidebar.css";
import "@/components/common/AppTopBar.css";
import "@/components/common/AppNavContent.css";
import "./page.css";

/**
 * Shown by the App Router while DashboardPage's server render (auth +
 * resume list) is in flight — e.g. right after the editor's Back button —
 * instead of a blank screen. See
 * docs/guides/investigate-and-fix-slow-nextjs-apps.md §5 Phase 2.
 *
 * AppShell itself can't run here — it's an async Server Component that
 * fetches the user, and awaiting that would defeat the point of an
 * instant fallback. This replicates its static shape (sidebar at desktop
 * width, top bar below it, same classes from AppShell/AppSidebar/
 * AppTopBar/AppNavContent.css) without the data fetch, so the content
 * area is exactly as wide as it is once AppShell mounts for real — the
 * nav items that don't depend on the signed-in user (brand, "Resumes",
 * "Account") render as themselves; the user-specific bits skeleton.
 */
export default function DashboardLoading() {
  return (
    <div className="app-shell">
      <TopBarSkeleton />
      <SidebarSkeleton />
      <div className="app-shell__content">
        <DashboardSkeleton />
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <aside className="app-sidebar">
      <div className="app-nav">
        <span className="app-nav__brand">
          <img
            src="/assets/Logos/ExaResume_Full.svg"
            alt="ExaResume"
            className="app-nav__brand-logo"
          />
        </span>
        <nav className="app-nav__links" aria-hidden="true">
          <span className="app-nav__link">
            <FileText size={18} className="app-nav__link-icon" />
            Resumes
          </span>
          <span className="app-nav__link">
            <User size={18} className="app-nav__link-icon" />
            Account
          </span>
        </nav>
        <div className="app-nav__user" aria-hidden="true">
          <Skeleton width={36} height={36} radius="full" />
          <span className="app-nav__user-identity">
            <Skeleton width="80%" height={14} />
            <Skeleton width="60%" height={12} />
          </span>
        </div>
      </div>
    </aside>
  );
}

function TopBarSkeleton() {
  return (
    <header className="app-topbar">
      <Button type="button" variant="tertiary" size="m" iconOnly disabled>
        <Menu size={20} />
      </Button>
      <span className="app-topbar__brand">
        <img
          src="/assets/Logos/ExaResume_Full.svg"
          alt="ExaResume"
          className="app-topbar__brand-logo"
        />
      </span>
      <span className="app-topbar__account" aria-hidden="true">
        <Skeleton width={32} height={32} radius="full" />
      </span>
    </header>
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
      <ul className="dashboard__list" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index} className="resume-card">
            <div className="resume-card__link">
              <Skeleton height="var(--space-24)" radius="md" />
              <span className="resume-card__text">
                <Skeleton width="70%" height={16} />
                <Skeleton width="45%" height={13} />
              </span>
            </div>
            <div className="resume-card__actions">
              <div className="resume-card__actions-group">
                <Skeleton width={32} height={32} radius="full" />
                <span className="resume-card__inline-actions">
                  <Skeleton width={32} height={32} radius="full" />
                </span>
              </div>
              <div className="resume-card__actions-group resume-card__actions-group--end">
                <Skeleton width={72} height={20} radius="full" />
                <span className="resume-card__inline-actions">
                  <Skeleton width={32} height={32} radius="full" />
                </span>
                <span className="resume-card__menu">
                  <Skeleton width={32} height={32} radius="full" />
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
