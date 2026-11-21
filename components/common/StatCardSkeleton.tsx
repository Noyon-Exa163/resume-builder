import { Skeleton } from "@/components/ui";
import "./StatCard.css";

/**
 * Loading stand-in for StatCard — the same classes, so `.stat-grid` lays
 * it out identically (icon chip + label line over a large value line).
 */
export function StatCardSkeleton() {
  return (
    <div className="stat-card" aria-hidden="true">
      <span className="stat-card__icon">
        <Skeleton width={16} height={16} />
      </span>
      <span className="stat-card__text">
        <Skeleton width={90} height={12} />
        <Skeleton width={52} height={22} />
      </span>
    </div>
  );
}

export default StatCardSkeleton;
