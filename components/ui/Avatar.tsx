import { Blobatar } from "@blobatar/react";
import "blobatar/motion.css";
import "./Avatar.css";

/** Trait position that lands in blobatar's "round" silhouette. */
const ROUND_SHAPE = 0.11;

export interface AvatarProps {
  /** Any stable string (an email works well) — the same value always yields the same avatar. */
  name: string;
  size?: number;
  className?: string;
}

export default function Avatar({ name, size = 32, className }: AvatarProps) {
  const classes = ["avatar", className].filter(Boolean).join(" ");

  return (
    <span className={classes} style={{ width: size, height: size }}>
      <Blobatar
        name={name}
        size={size}
        animate="hover"
        traits={{ shape: ROUND_SHAPE }}
        aria-hidden="true"
      />
    </span>
  );
}
