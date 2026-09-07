"use client";

import { Switch } from "@base-ui/react/switch";
import { forwardRef, type ReactNode } from "react";
import "./Switch.css";

export interface SwitchFieldProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  name?: string;
  className?: string;
  id?: string;
}

const SwitchField = forwardRef<HTMLButtonElement, SwitchFieldProps>(
  (
    {
      checked,
      defaultChecked,
      onCheckedChange,
      label,
      disabled,
      name,
      className,
      id,
    },
    ref,
  ) => {
    return (
      <Switch.Root
        ref={ref}
        id={id}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        name={name}
        className={["switch", className].filter(Boolean).join(" ")}
      >
        <Switch.Thumb className="switch__track">
          <span className="switch__thumb" />
        </Switch.Thumb>
        {label && <span className="switch__label">{label}</span>}
      </Switch.Root>
    );
  },
);

SwitchField.displayName = "SwitchField";
export default SwitchField;
