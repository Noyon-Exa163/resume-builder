import { Skeleton } from "@/components/ui";
import "./ResumeCardSkeleton.css";

export function ResumeCardSkeleton() {
  return (
    <li className="resume-card" aria-hidden="true">
      <Skeleton radius="md" className="resume-card-skeleton__preview" />
      <span className="resume-card-skeleton__text">
        <Skeleton height={16} width="70%" />
        <Skeleton height={13} width="45%" />
      </span>
      <div className="resume-card-skeleton__actions">
        <Skeleton radius="full" width={32} height={32} />
        <Skeleton radius="full" width={32} height={32} />
      </div>
    </li>
  );
}
