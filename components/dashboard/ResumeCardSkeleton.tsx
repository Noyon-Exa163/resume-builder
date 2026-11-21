import { Skeleton } from "@/components/ui";
import "@/app/(app)/(dashboard)/page.css";
// The preview well's own styling (height, inset background, radius) lives
// here — without it the skeleton card collapses to a bare text row.
import "./ResumeCardPreview.css";

/**
 * Stands in for a loaded resume-card — same classes as the real card
 * (app/page.css) so the layout matches: preview well, title row with the
 * kebab slot, and the meta footer.
 */
export function ResumeCardSkeleton() {
  return (
    <li className="resume-card" aria-hidden="true">
      <div className="resume-card__preview-link">
        <div className="resume-card__preview">
          <Skeleton height="100%" radius="md" />
        </div>
      </div>
      <div className="resume-card__body">
        <span className="resume-card__title">
          <Skeleton width="70%" height={16} />
        </span>
        <Skeleton width={32} height={32} radius="full" />
      </div>
      <div className="resume-card__footer">
        <span className="resume-card__meta">
          <Skeleton width="80%" height={12} />
        </span>
        <span className="resume-card__owner">
          <Skeleton width={20} height={20} radius="full" />
          <Skeleton width={64} height={11} />
        </span>
      </div>
    </li>
  );
}
