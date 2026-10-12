"use client";

import { Sparkles } from "lucide-react";
import { AiProviderMark } from "@/components/ai/AiProviderMark";
import { SelectField } from "@/components/ui";
import { CHAT_MODEL_OPTIONS, describeChatModel } from "@/lib/ai/chatModels";
import type { ChatModelChoice } from "@/lib/import/aiChat";
import "./AiModelPicker.css";

export interface AiModelPickerProps {
  /** What the server allows — anything else in the catalog is left out. */
  models: ChatModelChoice[];
  /** The admin's default model — the one that carries the Recommended chip. */
  recommendedModelId: string;
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}

function RecommendedChip() {
  return (
    <span className="ai-model-picker__recommended">
      <Sparkles
        size={12}
        aria-hidden="true"
        className="ai-model-picker__recommended-icon"
      />
      Recommended
    </span>
  );
}

/** Chooses which AI model the chat box sends resume imports and edits to. */
export function AiModelPicker({
  models,
  recommendedModelId,
  value,
  onChange,
  disabled,
}: AiModelPickerProps) {
  const options = CHAT_MODEL_OPTIONS.flatMap((option) => {
    const choice = models.find((model) => model.id === option.id);
    return choice ? [{ option, choice }] : [];
  }).map(({ option, choice }) => ({
    value: option.id,
    label: option.name,
    description: describeChatModel(option, choice.estimatedCostUsd),
    badge: option.id === recommendedModelId ? <RecommendedChip /> : undefined,
    icon: (
      <AiProviderMark id={option.markId} className="ai-model-picker__mark" />
    ),
  }));

  return (
    <SelectField
      variant="inline"
      className="ai-model-picker"
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
