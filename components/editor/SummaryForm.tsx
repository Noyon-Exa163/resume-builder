"use client";

import { Textarea } from "@/components/ui";
import "./SummaryForm.css";

export interface SummaryFormProps {
  value: string;
  onChange: (summary: string) => void;
  className?: string;
}

export function SummaryForm({
  value,
  onChange,
  className,
}: SummaryFormProps) {
  return (
    <div className={["summary-form", className].filter(Boolean).join(" ")}>
      <div className="summary-form__header">
        <h3 className="summary-form__title">Professional Summary</h3>
        <p className="summary-form__description">
          Brief 2–4 sentence overview highlighting your background, key expertise, and career impact.
        </p>
      </div>

      <Textarea
        label="Summary"
        placeholder="e.g. Versatile software engineer with 6+ years building distributed web applications..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="summary-form__textarea"
      />
    </div>
  );
}

export default SummaryForm;
