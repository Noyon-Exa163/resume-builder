import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./Input.css";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "l" | "m" | "s";
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ size = "m", label, error, helperText, className, id, type, ...rest }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const isPassword = type === "password";
    const [showPassword, setShowPassword] = useState(false);

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
