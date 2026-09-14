"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import type { AccentColor, ResumeData } from "@/lib/schema/resume";
import {
  computeThumbnailKey,
  getResumeThumbnailDataUrl,
} from "@/lib/export/resumeThumbnail";
import { templateRegistry } from "@/templates";
import {
  ACCENT_PRESETS,
  DEFAULT_ACCENT_COLOR,
  resolveAccent,
} from "@/templates/cyan/accents";
import { CircleCheck } from "lucide-react";
import { Skeleton, SwitchField, Tooltip } from "@/components/ui";
import "./ThemePicker.css";

export interface ThemePickerProps {
  resume: ResumeData;
  value: string;
  onChange: (templateId: string) => void;
  accentColor: AccentColor;
  onAccentColorChange: (accentColor: AccentColor) => void;
  showAlternatePhone: boolean;
  onShowAlternatePhoneChange: (show: boolean) => void;
  /** Skip PDF work while another sidebar tab is showing. */
  active?: boolean;
}

const UNIVERSAL_TEMPLATE_ID = "cyan";
const templates = Object.values(templateRegistry);
const PREVIEW_DEBOUNCE_MS = 400;

/** Top ~35% of page 1 — enough for the header and summary, without the
 *  empty band a half-page crop leaves under the text. */
const THEME_PICKER_CROP_ASPECT: Record<ResumeData["meta"]["pageSize"], string> = {
  A4: "210 / 105",
  Letter: "8.5 / 3.9",
};

/**
 * Theme cards styled like the dashboard resume cards. Previews use the same
 * cached header+summary PNG (lib/export/resumeThumbnail.ts) — editing
 * sections does not redraw them.
 */
export function ThemePicker({
  resume,
  value,
  onChange,
  accentColor,
  onAccentColorChange,
  showAlternatePhone,
  onShowAlternatePhoneChange,
  active = true,
}: ThemePickerProps) {
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const previewKey = computeThumbnailKey({
    ...resume,
    meta: { ...resume.meta, templateId: "" },
  });

  useEffect(() => {
    if (!active) return;
    let isStale = false;
    const timer = window.setTimeout(() => {
      void Promise.all(
        templates.map(async (template) => {
          const previewResume: ResumeData = {
            ...resume,
            meta: { ...resume.meta, templateId: template.meta.id },
            sections: [],
          };
          const dataUrl = await getResumeThumbnailDataUrl(previewResume);
          return [template.meta.id, dataUrl] as const;
        }),
      )
        .then((results) => {
          if (isStale) return;
          const next: Record<string, string> = {};
          for (const [id, dataUrl] of results) next[id] = dataUrl;
          setPreviews(next);
        })
        .catch((error) => {
          if (!isStale) console.error("Theme preview render failed:", error);
        });
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      isStale = true;
      window.clearTimeout(timer);
    };
    // resume is read inside the timeout; previewKey fingerprints header+summary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey, active]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const ids = templates.map((template) => template.meta.id);
    const index = Math.max(0, ids.indexOf(value));
    let next = value;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      next = ids[(index + 1) % ids.length];
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      next = ids[(index - 1 + ids.length) % ids.length];
    } else if (event.key === "Home") {
      event.preventDefault();
      next = ids[0];
    } else if (event.key === "End") {
      event.preventDefault();
      next = ids[ids.length - 1];
    } else {
      return;
    }
    onChange(next);
    const group = event.currentTarget;
    requestAnimationFrame(() => {
      const node = group.querySelector<HTMLButtonElement>(
        `[data-template-id="${next}"]`,
      );
      node?.focus();
    });
  }

  const cropAspect = THEME_PICKER_CROP_ASPECT[resume.meta.pageSize];
  const selectedAccent = accentColor ?? DEFAULT_ACCENT_COLOR;

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="theme-picker"
      onKeyDown={handleKeyDown}
    >
      {templates.map((template) => {
        const selected = template.meta.id === value;
        const preview = previews[template.meta.id];
        const isUniversal = template.meta.id === UNIVERSAL_TEMPLATE_ID;
        return (
          <div
            key={template.meta.id}
            className="theme-picker__card"
            data-selected={selected ? "true" : undefined}
          >
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              data-template-id={template.meta.id}
              className="theme-picker__select"
              onClick={() => onChange(template.meta.id)}
            >
              <span
                className="theme-picker__preview"
                style={
                  isUniversal
                    ? { backgroundColor: resolveAccent(selectedAccent).previewBg }
                    : undefined
                }
              >
                <span
                  className="theme-picker__canvas-host"
                  style={{ aspectRatio: cropAspect }}
                >
                  {preview ? (
                    // Generated data URL — next/image cannot optimize it.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="theme-picker__canvas" src={preview} alt="" />
                  ) : (
                    <Skeleton className="theme-picker__skeleton" />
                  )}
                </span>
              </span>
              <span className="theme-picker__label">
                <span className="theme-picker__name">{template.meta.name}</span>
                {selected ? (
                  <CircleCheck
                    className="theme-picker__check"
                    size={16}
                    aria-hidden="true"
                  />
                ) : null}
              </span>
            </button>
            {isUniversal ? (
              <AccentSwatches
                value={selectedAccent}
                onChange={(next) => {
                  if (value !== UNIVERSAL_TEMPLATE_ID) {
                    onChange(UNIVERSAL_TEMPLATE_ID);
                  }
                  onAccentColorChange(next);
                }}
              />
            ) : null}
            {isUniversal && selected ? (
              <SwitchField
                checked={showAlternatePhone}
                onCheckedChange={onShowAlternatePhoneChange}
                label="Show Alternate Phone Number"
                className="theme-picker__alternate-phone-toggle"
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function AccentSwatches({
  value,
  onChange,
}: {
  value: AccentColor;
  onChange: (accentColor: AccentColor) => void;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = Math.max(
      0,
      ACCENT_PRESETS.findIndex((preset) => preset.id === value),
    );
    let next = value;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      next = ACCENT_PRESETS[(index + 1) % ACCENT_PRESETS.length].id;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      next =
        ACCENT_PRESETS[
          (index - 1 + ACCENT_PRESETS.length) % ACCENT_PRESETS.length
        ].id;
    } else {
      return;
    }
    onChange(next);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Accent Color"
      className="theme-picker__swatches"
      onKeyDown={handleKeyDown}
      onClick={(event) => event.stopPropagation()}
    >
      {ACCENT_PRESETS.map((preset) => {
        const selected = preset.id === value;
        return (
          <Tooltip key={preset.id} label={preset.name}>
            <button
              type="button"
              role="radio"
              aria-label={preset.name}
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              className="theme-picker__swatch"
              onClick={() => onChange(preset.id)}
            >
              <span
                className="theme-picker__swatch-dot"
                style={{ backgroundColor: preset.brand }}
              />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
