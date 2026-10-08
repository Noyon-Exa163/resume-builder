import { Skeleton } from "@/components/ui";
import "@/app/page.css";

/**
 * Stands in for a loaded resume-card — same classes as the real card
 * (app/page.css) so the sm-breakpoint collapse (icons -> overflow menu)
 * applies here too, instead of a second copy of that media query.
 */
export function ResumeCardSkeleton() {
  return (
    <li className="resume-card" aria-hidden="true">
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
  );
}
