import { Blobatar } from "@blobatar/react";
import { useGaze } from "@blobatar/react/gaze";
import "blobatar/motion.css";
import "blobatar/gaze.css";
import {
  AVATAR_EXPRESSIONS,
  AVATAR_TONE,
  getAvatarBodyColor,
  type AvatarExpressionKey,
} from "@/lib/avatar";
import "./Avatar.css";

/** Trait position that lands in blobatar's "round" silhouette. */
const ROUND_SHAPE = 0.11;

/** How far the eyes travel toward the cursor, in viewBox units. */
const GAZE_TRAVEL = 3;

export interface AvatarProps {
  /** Any stable string (an email works well) — the same value always yields the same avatar. */
  name: string;
  size?: number;
  className?: string;
  /** Eyes follow the cursor instead of animating on hover. */
  followPointer?: boolean;
  /** Drops the tinted circle behind the blobatar. */
  bare?: boolean;
  /** Locks the color, in degrees; null or omitted derives it from `name`. */
  hue?: number | null;
  /** Pose to hold; null or omitted is the default idle look. */
  expression?: AvatarExpressionKey | null;
}

type BlobProps = Pick<AvatarProps, "name" | "hue" | "expression"> & {
  size: number;
};

/** Props shared by both blobatar variants, so they can't drift apart. */
function toBlobatarProps({ name, size, hue, expression }: BlobProps) {
  const pose = expression ? AVATAR_EXPRESSIONS[expression] : undefined;
  const bodyColor = hue == null ? undefined : getAvatarBodyColor(hue);

  return {
    name,
    size,
    hue: hue ?? undefined,
    tone: hue == null ? undefined : AVATAR_TONE,
    // A chosen color is the body, exactly: skip the pose's own tint (mad,
    // love, shy, sick) so it can't shift it. Eyes stay blobatar's own.
    palette: bodyColor ? { head: bodyColor } : undefined,
    expression: pose && bodyColor ? { ...pose, tint: undefined } : pose,
    traits: { shape: ROUND_SHAPE },
    "aria-hidden": true as const,
  };
}

function PointerBlobatar(props: BlobProps) {
  const { ref } = useGaze({ travel: GAZE_TRAVEL, lookAt: "pointer" });

  return <Blobatar ref={ref} animate="always" {...toBlobatarProps(props)} />;
}

export default function Avatar({
  name,
  size = 32,
  className,
  followPointer = false,
  bare = false,
  hue,
  expression,
}: AvatarProps) {
  const classes = ["avatar", bare && "avatar--bare", className]
    .filter(Boolean)
    .join(" ");
  const blobProps = { name, size, hue, expression };

  return (
    <span className={classes} style={{ width: size, height: size }}>
      {followPointer ? (
        <PointerBlobatar {...blobProps} />
      ) : (
        <Blobatar animate="hover" {...toBlobatarProps(blobProps)} />
      )}
    </span>
  );
}
