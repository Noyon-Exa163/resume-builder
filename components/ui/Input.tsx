import {
  forwardRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import "./Input.css";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "l" | "m" | "s";
  label?: string;
  error?: string;
  helperText?: string;
  /** Drop whitespace as the user types. Implied for `type="url"`. */
  stripWhitespace?: boolean;
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
            className={`input-field__input input-field__input--${size}${isPassword ? " input-field__input--has-toggle" : ""}`}
            aria-invalid={error ? true : undefined}
            {...rest}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
          />
          {isPassword && (
            <button
              type="button"
              className="input-field__toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
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
