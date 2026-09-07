import type { ComponentType, HTMLAttributes, ReactNode } from "react";
import "./EmptyState.css";

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <div
      className={["empty-state", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {Icon && (
        <div className="empty-state__icon">
          <Icon size={36} />
        </div>
      )}
      <p className="empty-state__title">{title}</p>
      {description && (
        <p className="empty-state__description">{description}</p>
      )}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
