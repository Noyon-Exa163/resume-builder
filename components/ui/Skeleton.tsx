import type { CSSProperties } from "react";
import "./Skeleton.css";

export interface SkeletonProps {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  radius?: "none" | "xs" | "sm" | "md" | "lg" | "full";
  className?: string;
  style?: CSSProperties;
}

export default function Skeleton({
  width,
  height,
  radius = "sm",
  className,
  style,
}: SkeletonProps) {
  const classes = ["skeleton", `skeleton--radius-${radius}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={classes}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}
