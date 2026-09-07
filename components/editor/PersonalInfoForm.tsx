"use client";

import { useRef, useState, type ChangeEvent } from "react";
import type { PersonalInfo } from "@/lib/schema/resume";
import { Input, Button } from "@/components/ui";
import { User, Upload, Trash2 } from "lucide-react";
import "./PersonalInfoForm.css";

export interface PersonalInfoFormProps {
  value: PersonalInfo;
  onChange: (patch: Partial<PersonalInfo>) => void;
  className?: string;
}

export function PersonalInfoForm({
  value,
  onChange,
  className,
}: PersonalInfoFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert image to data URL
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange({ photoDataUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value so re-selecting same file triggers onChange
    e.target.value = "";
  };

  const handleRemovePhoto = () => {
    onChange({ photoDataUrl: undefined });
  };

  return (
    <div className={["personal-info-form", className].filter(Boolean).join(" ")}>
      <div className="personal-info-form__header">
        <h3 className="personal-info-form__title">Personal Information</h3>
        <p className="personal-info-form__description">
          Add your contact details and professional links.
        </p>
      </div>

      <div className="personal-info-form__photo-section">
        <div className="personal-info-form__photo-preview">
          {value.photoDataUrl ? (
            <img
              src={value.photoDataUrl}
              alt={value.fullName ? `${value.fullName} headshot` : "Headshot"}
              className="personal-info-form__photo-img"
            />
          ) : (
            <User size={28} />
          )}
        </div>
        <div className="personal-info-form__photo-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="personal-info-form__file-input"
            onChange={handlePhotoUpload}
            aria-label="Upload photo"
          />
          <div className="personal-info-form__photo-btn-row">
            <Button
              type="button"
              variant="secondary"
              size="s"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} />
              {value.photoDataUrl ? "Change Photo" : "Upload Photo"}
            </Button>
            {value.photoDataUrl && (
              <Button
                type="button"
                variant="tertiary"
                size="s"
                onClick={handleRemovePhoto}
                aria-label="Remove photo"
              >
                <Trash2 size={14} />
                Remove
              </Button>
            )}
          </div>
          <span className="personal-info-form__photo-help">
            Recommended: square image, PNG or JPG
          </span>
        </div>
      </div>

      <div className="personal-info-form__grid">
        <div className="personal-info-form__full-width">
          <Input
            label="Full Name"
            placeholder="e.g. Jane Doe"
            value={value.fullName || ""}
            onChange={(e) => handleFieldChange("fullName", e.target.value)}
            required
          />
        </div>

        <div className="personal-info-form__full-width">
          <Input
            label="Professional Headline"
            placeholder="e.g. Senior Software Engineer"
            value={value.headline || ""}
            onChange={(e) => handleFieldChange("headline", e.target.value)}
          />
        </div>

        <Input
          label="Email Address"
          type="email"
          placeholder="e.g. jane@example.com"
          value={value.email || ""}
          onChange={(e) => handleFieldChange("email", e.target.value)}
          onBlur={() => setVisited((prev) => ({ ...prev, email: true }))}
          error={emailError}
        />

        <Input
          label="Phone Number"
          type="tel"
          placeholder="e.g. +1 (555) 000-0000"
          value={value.phone || ""}
          onChange={(e) => handleFieldChange("phone", e.target.value)}
        />

        <div className="personal-info-form__full-width">
          <Input
            label="Location"
            placeholder="e.g. San Francisco, CA"
            value={value.location || ""}
            onChange={(e) => handleFieldChange("location", e.target.value)}
          />
        </div>

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
          onChange={(e) => handleFieldChange("linkedin", e.target.value)}
        />

        <div className="personal-info-form__full-width">
          <Input
            label="GitHub Profile"
            placeholder="e.g. github.com/janedoe"
            value={value.github || ""}
            onChange={(e) => handleFieldChange("github", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

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
