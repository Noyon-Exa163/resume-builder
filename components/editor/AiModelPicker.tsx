"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { AiProviderMark } from "@/components/ai/AiProviderMark";
import { Badge, SelectField, type SelectOption } from "@/components/ui";
import {
  CHAT_MODEL_OPTIONS,
  describeChatModel,
  type ChatModelEstimate,
} from "@/lib/ai/chatModels";
import "./AiModelPicker.css";

function RecommendedChip() {
  return (
    <Badge variant="outline" className="ai-model-picker__recommended">
      <Sparkles
        size={12}
        aria-hidden="true"
        className="ai-model-picker__recommended-icon"
      />
      Recommended
    </Badge>
  );
}

/**
 * The chat models as select options — maker's mark, name, and a cost/detail
 * line — shared by the chat box picker and the Default Model setting.
 * `recommendedModelId` adds the Recommended chip to that one option.
 */
export function chatModelSelectOptions(
  estimates: ChatModelEstimate[],
  recommendedModelId?: string,
): SelectOption[] {
  return CHAT_MODEL_OPTIONS.map((option) => ({
    value: option.id,
    label: option.name,
    description: describeChatModel(
      option,
      estimates.find((estimate) => estimate.id === option.id)?.estimatedCostUsd,
    ),
    icon: <AiProviderMark id={option.markId} />,
    badge: option.id === recommendedModelId ? <RecommendedChip /> : undefined,
  }));
}

export interface AiModelPickerProps {
  /** Cost estimates from the server, one per offered model. */
  models: ChatModelEstimate[];
  /** The admin's default model — the one that carries the Recommended chip. */
  recommendedModelId: string;
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}

/** Chooses which AI model the chat box sends resume imports and edits to. */
export function AiModelPicker({
  models,
  recommendedModelId,
  value,
  onChange,
  disabled,
}: AiModelPickerProps) {
  const options = useMemo(
    () => chatModelSelectOptions(models, recommendedModelId),
    [models, recommendedModelId],
  );

  return (
    <SelectField
      variant="inline"
      className="ai-model-picker"
      popupClassName="ai-model-picker__popup"
      ariaLabel="AI Model"
      options={options}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next) onChange(next);
      }}
    />
  );
}
