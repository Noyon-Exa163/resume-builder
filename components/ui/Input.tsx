"use client";

import {
  forwardRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import { Tooltip } from "./Tooltip";
import "./Input.css";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "l" | "m" | "s";
  label?: string;
  error?: string;
  helperText?: string;
  /** Drop whitespace as the user types. Implied for `type="url"`. */
  stripWhitespace?: boolean;
  /** A compact control rendered inside the input's own box, right-aligned
   *  (e.g. a small casing toggle) — the input gets extra right padding to
   *  make room, the same treatment as the built-in password show/hide
   *  button. Ignored for `type="password"`, which already uses this slot. */
  trailingAddon?: ReactNode;
  /** Noun in the show/hide control for `type="password"` fields.
   *  API keys use "API Key"; login and account fields keep "Password". */
  revealLabel?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = "m",
      label,
      error,
      helperText,
      className,
      id,
      type,
      stripWhitespace,
      trailingAddon,
      revealLabel = "Password",
      onChange,
      onKeyDown,
      ...rest
    },
    ref,
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const isPassword = type === "password";
    const shouldStripWhitespace = Boolean(stripWhitespace) || type === "url";
    const [showPassword, setShowPassword] = useState(false);
    const toggleLabel = showPassword
      ? `Hide ${revealLabel}`
      : `Show ${revealLabel}`;

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (
        shouldStripWhitespace &&
        event.key === " " &&
        !event.nativeEvent.isComposing
      ) {
        event.preventDefault();
      }
      onKeyDown?.(event);
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      if (shouldStripWhitespace) {
        const stripped = event.target.value.replace(/\s/g, "");
        if (stripped !== event.target.value) {
          event.target.value = stripped;
        }
      }
      onChange?.(event);
    };

    return (
      <div className={["input-field", className].filter(Boolean).join(" ")}>
        {label && (
          <label className="input-field__label" htmlFor={inputId}>
            {label}
          </label>
        )}
        <div className="input-field__wrapper">
          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? "text" : type}
            className={[
              "input-field__input",
              `input-field__input--${size}`,
              isPassword && "input-field__input--has-toggle",
              !isPassword && trailingAddon && "input-field__input--has-addon",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-invalid={error ? true : undefined}
            {...rest}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
          />
          {isPassword ? (
            <Tooltip label={toggleLabel}>
              <button
                type="button"
                className="input-field__toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={toggleLabel}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </Tooltip>
          ) : trailingAddon ? (
            <div className="input-field__addon">{trailingAddon}</div>
          ) : null}
        </div>
        {error && <span className="input-field__error">{error}</span>}
        {!error && helperText && (
          <span className="input-field__helper">{helperText}</span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
export default Input;
