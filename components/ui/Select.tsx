"use client";

import { Select } from "@base-ui/react/select";
import { ChevronDown } from "lucide-react";
import { forwardRef } from "react";
import "./Select.css";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  size?: "l" | "m" | "s";
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string | null) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  name?: string;
  className?: string;
  id?: string;
}

const SelectField = forwardRef<HTMLButtonElement, SelectFieldProps>(
  (
    {
      size = "m",
      label,
      placeholder = "Select an option",
      options,
      value,
      defaultValue,
      onValueChange,
      error,
      helperText,
      disabled,
      name,
      className,
      id,
    },
    ref,
  ) => {
    return (
      <Select.Root
        value={value ?? null}
        defaultValue={defaultValue}
        onValueChange={(next) => onValueChange?.(next)}
        disabled={disabled}
        items={options}
      >
        <div className={["select", className].filter(Boolean).join(" ")}>
          {label && (
            <Select.Label className="select__label">{label}</Select.Label>
          )}
          <Select.Trigger
            ref={ref}
            id={id}
            className={`select__trigger select__trigger--${size}`}
          >
            <Select.Value className="select__value" placeholder={placeholder}>
              {(selected: string | null) =>
                selected
                  ? (options.find((opt) => opt.value === selected)?.label ??
                    selected)
                  : placeholder
              }
            </Select.Value>
            <Select.Icon className="select__icon">
              <ChevronDown size={16} />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner className="select__positioner" sideOffset={4}>
              <Select.Popup className="select__popup">
                {options.map((opt) => (
                  <Select.Item
                    key={opt.value}
                    value={opt.value}
                    className="select__item"
                  >
                    <Select.ItemIndicator className="select__item-indicator">
                      <CheckIcon />
                    </Select.ItemIndicator>
                    <Select.ItemText>{opt.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
          {error && <span className="select__error">{error}</span>}
          {!error && helperText && (
            <span className="select__helper">{helperText}</span>
          )}
        </div>
        {name && <input type="hidden" name={name} value={value ?? ""} />}
      </Select.Root>
    );
  },
);

SelectField.displayName = "SelectField";

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M11.5 3.5L5.5 10.5L2.5 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default SelectField;
