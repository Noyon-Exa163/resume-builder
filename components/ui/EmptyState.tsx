import type { ComponentType, HTMLAttributes, ReactNode } from "react";
import "./EmptyState.css";

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  /** Spot illustration (image URL); takes the place of `icon`. */
  illustration?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  title,
  description,
  icon: Icon,
  illustration,
  action,
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <div
      className={["empty-state", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {illustration ? (
        <img
          className="empty-state__illustration"
          src={illustration}
          alt=""
          height={128}
        />
      ) : (
        Icon && (
          <div className="empty-state__icon">
            <Icon size={36} />
          </div>
        )
      )}
      <p className="empty-state__title">{title}</p>
      {description && <p className="empty-state__description">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
