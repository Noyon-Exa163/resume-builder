import type { LucideIcon } from "lucide-react";
import "./StatCard.css";

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
}

/**
 * Small bordered summary card (icon chip + label over a large value).
 * Render inside a `.stat-grid` — a responsive 3-column strip.
 */
export function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="stat-card">
      <span className="stat-card__icon">
        <Icon size={16} aria-hidden="true" />
      </span>
      <span className="stat-card__text">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__value">{value}</span>
      </span>
    </div>
  );
}

export default StatCard;
