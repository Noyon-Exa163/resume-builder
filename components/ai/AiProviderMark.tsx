import {
  PROVIDER_MARK_INK,
  PROVIDER_MARK_SRC,
  type AIMarkId,
} from "@/lib/ai/providerMarks";
import "./AiProviderMark.css";

export interface AiProviderMarkProps {
  id: AIMarkId;
  className?: string;
}

/** Decorative brand mark for an AI provider. Alt is empty — the name sits next to it. */
export function AiProviderMark({ id, className }: AiProviderMarkProps) {
  return (
    <img
      src={PROVIDER_MARK_SRC[id]}
      alt=""
      className={[
        "ai-provider-mark",
        PROVIDER_MARK_INK.has(id) && "ai-provider-mark--ink",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
