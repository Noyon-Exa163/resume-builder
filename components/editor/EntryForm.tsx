"use client";

import { useState, type KeyboardEvent } from "react";
import type { ResumeEntry, SectionKind } from "@/lib/schema/resume";
import {
  Input,
  DateInput,
  Textarea,
  Button,
  SwitchField,
} from "@/components/ui";
import { Plus, Trash2, X } from "lucide-react";
import "./EntryForm.css";

export interface EntryFormProps {
  value: ResumeEntry;
  onChange: (patch: Partial<ResumeEntry>) => void;
  sectionKind?: SectionKind;
  className?: string;
}

export function EntryForm({
  value,
  onChange,
  sectionKind = "experience",
  className,
}: EntryFormProps) {
  const [newTagText, setNewTagText] = useState("");

  const handleFieldChange = (field: keyof ResumeEntry, val: unknown) => {
    onChange({ [field]: val });
  };

  // Bullet point handlers
  const handleBulletChange = (index: number, text: string) => {
    const updated = [...value.bullets];
    updated[index] = text;
    onChange({ bullets: updated });
  };

  const handleAddBullet = () => {
    onChange({ bullets: [...value.bullets, ""] });
  };

  const handleRemoveBullet = (index: number) => {
    onChange({ bullets: value.bullets.filter((_, i) => i !== index) });
  };

  // Tag handlers
  const handleAddTag = () => {
    const trimmed = newTagText.trim();
    if (!trimmed) return;
    if (!value.tags.includes(trimmed)) {
      onChange({ tags: [...value.tags, trimmed] });
    }
    setNewTagText("");
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange({ tags: value.tags.filter((t) => t !== tagToRemove) });
  };

  // Determine smart field labels based on section kind
  const titleLabel =
    sectionKind === "education"
      ? "Degree / Field of Study"
      : sectionKind === "skills"
        ? "Skill Category / Topic"
        : sectionKind === "certifications"
          ? "Certification Name"
          : sectionKind === "languages"
            ? "Language"
            : sectionKind === "awards"
              ? "Award Title"
              : sectionKind === "projects"
                ? "Project Name"
                : "Job Title / Role";

  const subtitleLabel =
    sectionKind === "education"
      ? "School / University"
      : sectionKind === "experience"
        ? "Company / Organization"
        : sectionKind === "certifications"
          ? "Issuing Organization"
          : sectionKind === "languages"
            ? "Proficiency Level"
            : sectionKind === "awards"
              ? "Issuer / Conference"
              : "Organization / Context";

  const showDates = !["skills", "languages"].includes(sectionKind);
  const showBullets = !["languages"].includes(sectionKind);
  const showTags = ["skills", "projects", "experience"].includes(sectionKind);

  return (
    <div className={["entry-form", className].filter(Boolean).join(" ")}>
      <div className="entry-form__grid">
        <Input
          label={titleLabel}
          placeholder={`Enter ${titleLabel.toLowerCase()}`}
          value={value.title || ""}
          onChange={(e) => handleFieldChange("title", e.target.value)}
          required
        />

        <Input
          label={subtitleLabel}
          placeholder={`Enter ${subtitleLabel.toLowerCase()}`}
          value={value.subtitle || ""}
          onChange={(e) => handleFieldChange("subtitle", e.target.value)}
        />

        <Input
          label="Location"
          placeholder="e.g. Remote / City, Country"
          value={value.location || ""}
          onChange={(e) => handleFieldChange("location", e.target.value)}
        />

        {showDates && (
          <div className="entry-form__dates-row">
            <div className="entry-form__date-field">
              <DateInput
                label="Start Date"
                helperText="Type DD/MM/YYYY, or stop at MM/YYYY or YYYY."
                value={value.startDate}
                onChange={(next) => handleFieldChange("startDate", next)}
              />
            </div>

            <div className="entry-form__end-date-group">
              <div className="entry-form__date-field">
                <DateInput
                  label="End Date"
                  placeholder={value.isCurrent ? "Present" : "DD/MM/YYYY"}
                  value={value.isCurrent ? "" : value.endDate}
                  disabled={value.isCurrent}
                  onChange={(next) => handleFieldChange("endDate", next)}
                />
              </div>

              <div className="entry-form__current-toggle">
                <SwitchField
                  checked={value.isCurrent ?? false}
                  onCheckedChange={(checked) => {
                    handleFieldChange("isCurrent", checked);
                    if (checked) handleFieldChange("endDate", undefined);
                  }}
                  label="Current / Present"
                />
              </div>
            </div>
          </div>
        )}

        <Input
          label="Link / URL"
          type="url"
          placeholder="https://..."
          value={value.link || ""}
          onChange={(e) => handleFieldChange("link", e.target.value)}
        />

        <Textarea
          label="Description / Overview"
          placeholder="Optional overview or summary of this entry..."
          value={value.description || ""}
          onChange={(e) => handleFieldChange("description", e.target.value)}
          rows={2}
        />
      </div>

      {showBullets && (
        <div className="entry-form__bullets-section">
          <div className="entry-form__section-label">
            <span>Bullet Points / Accomplishments</span>
            <Button
              type="button"
              variant="tertiary"
              size="s"
              onClick={handleAddBullet}
            >
              <Plus size={14} />
              Add Bullet
            </Button>
          </div>

          {value.bullets.map((bullet, idx) => (
            <div key={idx} className="entry-form__bullet-item">
              <Input
                value={bullet}
                onChange={(e) => handleBulletChange(idx, e.target.value)}
                placeholder="Action verb + context + measurable result..."
                className="entry-form__bullet-input"
              />
              <button
                type="button"
                className="entry-form__icon-btn"
                onClick={() => handleRemoveBullet(idx)}
                aria-label={`Remove bullet ${idx + 1}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {value.bullets.length === 0 && (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 13,
                color: "var(--color-text-tertiary)",
                margin: 0,
              }}
            >
              No bullet points added yet.
            </p>
          )}
        </div>
      )}

      {showTags && (
        <div className="entry-form__tags-section">
          <div className="entry-form__section-label">
            <span>Tags / Technologies / Skills</span>
          </div>

          <div className="entry-form__tags-wrap">
            {value.tags.map((tag) => (
              <span key={tag} className="entry-form__tag-pill">
                {tag}
                <button
                  type="button"
                  className="entry-form__tag-remove"
                  onClick={() => handleRemoveTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          <div className="entry-form__tag-input-row">
            <Input
              size="s"
              placeholder="Add tag and press Enter"
              value={newTagText}
              onChange={(e) => setNewTagText(e.target.value)}
              onKeyDown={handleTagKeyDown}
              className="entry-form__tag-input"
            />
            <Button
              type="button"
              variant="secondary"
              size="s"
              onClick={handleAddTag}
              disabled={!newTagText.trim()}
            >
              <Plus size={14} />
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EntryForm;
