import { Plus, UserPlus } from "lucide-react";
import { StatCardSkeleton } from "@/components/common/StatCardSkeleton";
import { Button, Skeleton } from "@/components/ui";
import "./page.css";

/**
 * Route-level fallback for /users — mirrors the page's real layout: header
 * with actions, control row (search + role filter), stat strip, user-card
 * grid, and the email-invites aside — so the server render's hand-off
 * doesn't reshuffle the page once data loads.
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

      <div className="users-page__filters">
        <label className="users-page__search">
          <Skeleton width="100%" height={16} />
        </label>
        <Skeleton width="240px" height="40px" radius="lg" />
      </div>

      <div className="users-page__columns">
        <div className="users-page__main">
          <div className="stat-grid" aria-hidden="true">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>

          <ul className="users-page__grid" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index} className="users-page__card">
                <div className="users-page__card-body">
                  <div className="users-page__card-corner">
                    <Skeleton width={16} height={16} radius="md" />
                  </div>
                  <Skeleton width={64} height={64} radius="full" />
                  <div className="users-page__card-identity">
                    <Skeleton width={120} height={16} />
                    <span className="users-page__card-email-row">
                      <Skeleton width="100%" height={13} />
                      <Skeleton width={32} height={32} radius="md" />
                    </span>
                    <Skeleton width={160} height={12} />
                  </div>
                  <div className="users-page__card-stats">
                    <Skeleton width="100%" height={16} />
                  </div>
                </div>
                <footer className="users-page__card-footer">
                  <Skeleton width={48} height={11} />
                </footer>
              </li>
            ))}
          </ul>
        </div>

        <div className="users-page__aside">
          <div className="pending-invites">
            <div className="pending-invites__header">
              <Skeleton width={120} height={20} />
              <Skeleton width={64} height={20} />
              <Skeleton width={180} height={36} radius="md" />
            </div>
            <div className="pending-invites__list">
              {Array.from({ length: 2 }, (_, index) => (
                <div key={index} className="pending-invites__card">
                  <div className="pending-invites__card-body">
                    <div className="pending-invites__identity">
                      <Skeleton width={32} height={32} radius="full" />
                      <div className="pending-invites__identity-text">
                        <Skeleton width="100%" height={14} />
                        <Skeleton width="180" height={12} />
                      </div>
                    </div>
                    <div className="pending-invites__actions-group">
                      <Skeleton width={80} height={20} radius="md" />
                      <div className="pending-invites__actions">
                        <Skeleton width={70} height={32} radius="md" />
                        <Skeleton width={70} height={32} radius="md" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
