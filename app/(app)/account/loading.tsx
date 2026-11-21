import { KeyRound, Smile } from "lucide-react";
import { StatCardSkeleton } from "@/components/common/StatCardSkeleton";
import { Badge, Button, Skeleton } from "@/components/ui";
import "./page.css";

const DETAILS_ROWS = ["Name", "Email", "Role", "Member Since"] as const;

/**
 * Route-level fallback for /account — mirrors the page's real layout: the
 * profile card (avatar, identity, actions) beside the main column with the
 * stat strip and the account-details card.
 */
export default function AccountLoading() {
  return (
          <div className="account-page">
        <header className="account-page__header">
          <h1 className="account-page__title">Account</h1>
          <p className="account-page__subtitle">
            Manage your profile, avatar and sign-in details.
          </p>
        </header>

        <div className="account-page__layout">
          <section className="account-card account-profile" aria-label="Profile">
            <div className="account-profile__avatar-wrap">
              <Skeleton width={96} height={96} radius="full" />
            </div>
            <div className="account-profile__identity">
              <Skeleton width={120} height={16} />
              <Skeleton width={180} height={13} />
              <Badge variant="secondary">Member</Badge>
            </div>
            <div className="account-profile__actions">
              <Button type="button" variant="secondary" size="m" disabled>
                <Smile size={16} />
                Customize Avatar
              </Button>
              <Button type="button" variant="secondary" size="m" disabled>
                <KeyRound size={16} />
                Change Password
              </Button>
            </div>
          </section>

          <div className="account-page__main">
            <div className="stat-grid">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>

            <section
              className="account-card account-details"
              aria-label="Account Details"
            >
              <h2 className="account-details__title">Account Details</h2>
              <dl className="account-details__list">
                {DETAILS_ROWS.map((label) => (
                  <div key={label} className="account-details__row">
                    <dt className="account-details__label">{label}</dt>
                    <dd className="account-details__value">
                      <Skeleton width={150} height={14} />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>
      </div>
    
  );
}
