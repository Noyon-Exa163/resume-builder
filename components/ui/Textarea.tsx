import { forwardRef, type TextareaHTMLAttributes } from "react";
import "./Textarea.css";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: "l" | "m" | "s";
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ size = "m", label, error, helperText, className, id, ...rest }, ref) => {
    const textareaId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className={["textarea-field", className].filter(Boolean).join(" ")}>
        {label && (
          <label className="textarea-field__label" htmlFor={textareaId}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`textarea-field__textarea textarea-field__textarea--${size}`}
          aria-invalid={error ? true : undefined}
          {...rest}
        />
        {error && <span className="textarea-field__error">{error}</span>}
        {!error && helperText && (
          <span className="textarea-field__helper">{helperText}</span>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
export default Textarea;
