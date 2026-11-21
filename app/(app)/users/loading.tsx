import { Plus, UserPlus } from "lucide-react";
import { StatCardSkeleton } from "@/components/common/StatCardSkeleton";
import { UsersTabs } from "./UsersTabs";
import { Button, Skeleton, TabsField } from "@/components/ui";
import "./page.css";

/**
 * Route-level fallback for /users — mirrors the page's real layout: header
 * with actions, stat strip, the real segmented tabs strip, the role-filter
 * toolbar, and user cards in their loaded shape (centered avatar and
 * identity, role footer) so the server render's hand-off doesn't reshuffle
 * the page.
 */
export default function UsersLoading() {
  return (
          <div className="users-page">
        <div className="users-page__header">
          <div className="users-page__header-text">
            <h1 className="users-page__title">User Management</h1>
            <p className="users-page__subtitle">
              Manage who can sign in and what they can do.
            </p>
          </div>
          <div className="users-page__header-actions">
            <Button type="button" variant="secondary" size="m" disabled>
              <UserPlus size={16} />
              Invite by Email
            </Button>
            <Button type="button" variant="primary" size="m" disabled>
              <Plus size={16} />
              New User
            </Button>
          </div>
        </div>

        <div className="stat-grid">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* The real tabs strip, rendered inert (content-less) so the
            segmented bar matches the loaded page exactly. */}
        <UsersTabs />

        <section className="users-page__panel" aria-label="All Users">
          <div className="users-page__toolbar">
            <div className="users-page__toolbar-main">
              <TabsField
                className="tabs--filter"
                value="all"
                tabs={[
                  { value: "all", label: "All", content: null },
                  { value: "admins", label: "Admins", content: null },
                  { value: "members", label: "Members", content: null },
                ]}
              />
              <Skeleton width={64} height={13} />
            </div>
            <label className="users-page__search">
              <Skeleton width="100%" height={16} />
            </label>
          </div>

          <div className="users-page__grid">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="users-page__card">
                <div className="users-page__card-body">
                  <div className="users-page__card-corner">
                    <Skeleton width={32} height={32} radius="full" />
                  </div>
                  <Skeleton width={64} height={64} radius="full" />
                  <div className="users-page__card-identity">
                    <Skeleton width={110} height={15} />
                    <Skeleton width={170} height={12} />
                    <Skeleton width={92} height={11} />
                  </div>
                </div>
                <footer className="users-page__card-footer">
                  <span className="users-page__card-role">Member</span>
                </footer>
              </div>
            ))}
          </div>
        </section>
      </div>
    
  );
}
