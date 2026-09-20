"use client";

import { useState } from "react";
import type { NameCasing, PersonalInfo } from "@/lib/schema/resume";
import { Input, SwitchField, Tooltip } from "@/components/ui";
import { formatBangladeshiPhone } from "@/lib/contact";
import "./PersonalInfoForm.css";

export interface PersonalInfoFormProps {
  value: PersonalInfo;
  onChange: (patch: Partial<PersonalInfo>) => void;
  /** How the name renders in the resume document itself — a display
   *  preference, not part of `value`, which holds the raw typed contact
   *  fields (see lib/schema/personalInfo.ts). */
  nameCasing: NameCasing;
  onNameCasingChange: (casing: NameCasing) => void;
  /** Whether the company alternate number prints after the personal one. */
  showAlternatePhone: boolean;
  onShowAlternatePhoneChange: (show: boolean) => void;
  className?: string;
}

export function PersonalInfoForm({
  value,
  onChange,
  nameCasing,
  onNameCasingChange,
  showAlternatePhone,
  onShowAlternatePhoneChange,
  className,
}: PersonalInfoFormProps) {
  // Format problems are only worth raising once someone has left the field —
  // flagging "j" as a bad email address while they type is just noise.
  const [visited, setVisited] = useState({ email: false, website: false });

  const handleFieldChange = (field: keyof PersonalInfo, val: string) => {
    onChange({ [field]: val });
  };

  const emailError =
    visited.email && !isEmailLike(value.email)
      ? "Enter an email address like jane@example.com."
      : undefined;

  const websiteError =
    visited.website && !isWebAddressLike(value.website)
      ? "Enter a web address like https://janedoe.dev."
      : undefined;

  return (
    <div className={["personal-info-form", className].filter(Boolean).join(" ")}>
      <div className="personal-info-form__header">
        <h3 className="personal-info-form__title">Personal Information</h3>
        <p className="personal-info-form__description">
          Add your contact details and professional links.
        </p>
      </div>

      <div className="personal-info-form__grid">
        <Input
          label="Full Name"
          placeholder="e.g. Jane Doe"
          value={value.fullName || ""}
          onChange={(e) => handleFieldChange("fullName", e.target.value)}
          required
          trailingAddon={
            <div
              className="personal-info-form__casing-toggle"
              role="radiogroup"
              aria-label="Name casing in the resume"
            >
              <Tooltip label="All Caps">
                <button
                  type="button"
                  role="radio"
                  aria-checked={nameCasing === "uppercase"}
                  aria-label="All Caps"
                  className={[
                    "personal-info-form__casing-option",
                    nameCasing === "uppercase" &&
                      "personal-info-form__casing-option--active",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onNameCasingChange("uppercase")}
                >
                  AA
                </button>
              </Tooltip>
              <Tooltip label="Title Case">
                <button
                  type="button"
                  role="radio"
                  aria-checked={nameCasing === "titleCase"}
                  aria-label="Title Case"
                  className={[
                    "personal-info-form__casing-option",
                    nameCasing === "titleCase" &&
                      "personal-info-form__casing-option--active",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onNameCasingChange("titleCase")}
                >
                  Aa
                </button>
              </Tooltip>
            </div>
          }
        />

        <Input
          label="Professional Headline"
          placeholder="e.g. Senior Software Engineer"
          value={value.headline || ""}
          onChange={(e) => handleFieldChange("headline", e.target.value)}
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="e.g. jane@example.com"
          value={value.email || ""}
          onChange={(e) => handleFieldChange("email", e.target.value)}
          onBlur={() => setVisited((prev) => ({ ...prev, email: true }))}
          error={emailError}
        />
        <div className="personal-info-form__email-chips">
          {EMAIL_DOMAINS.map((domain) => (
            <button
              key={domain}
              type="button"
              className="personal-info-form__email-chip"
              onClick={() => {
                const local = (value.email ?? "").split("@")[0];
                onChange({ email: `${local}${domain}` });
              }}
            >
              {domain}
            </button>
          ))}
        </div>

        <Input
          label="Phone Number"
          type="tel"
          placeholder="e.g. +880 1712 345 678"
          helperText="Separate more than one number with |, e.g. 01712-345678 | 01812-345678."
          value={value.phone || ""}
          onChange={(e) => handleFieldChange("phone", e.target.value)}
          onBlur={() => {
            const formatted = formatBangladeshiPhone(value.phone || "");
            if (formatted !== (value.phone || "")) {
              handleFieldChange("phone", formatted);
            }
          }}
        />
        <SwitchField
          checked={showAlternatePhone}
          onCheckedChange={onShowAlternatePhoneChange}
          label="Show Alternate Phone Number"
          className="personal-info-form__alternate-phone-toggle"
        />

        <Input
          label="Location"
          placeholder="e.g. San Francisco, CA"
          value={value.location || ""}
          onChange={(e) => handleFieldChange("location", e.target.value)}
        />

        <Input
          label="Portfolio / Website"
          type="url"
          placeholder="e.g. https://janedoe.dev"
          value={value.website || ""}
          onChange={(e) => handleFieldChange("website", e.target.value)}
          onBlur={() => setVisited((prev) => ({ ...prev, website: true }))}
          error={websiteError}
        />

        <Input
          label="LinkedIn Profile"
          placeholder="e.g. linkedin.com/in/janedoe"
          value={value.linkedin || ""}
          stripWhitespace
          onChange={(e) => handleFieldChange("linkedin", e.target.value)}
        />

        <Input
          label="GitHub Profile"
          placeholder="e.g. github.com/janedoe"
          value={value.github || ""}
          stripWhitespace
          onChange={(e) => handleFieldChange("github", e.target.value)}
        />
      </div>
    </div>
  );
}

const EMAIL_DOMAINS = ["@exabyting.com", "@gmail.com"] as const;

/** Empty is always acceptable — these fields are optional. */
function isEmailLike(value: string | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/** Accepts a bare host too, since the LinkedIn and GitHub fields alongside
 *  this one are written without a scheme. */
function isWebAddressLike(value: string | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "") return true;
  try {
    const url = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
    return url.hostname.includes(".");
  } catch {
    return false;
  }
}

export default PersonalInfoForm;
