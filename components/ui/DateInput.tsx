"use client";

import { forwardRef, type ChangeEvent } from "react";
import Input, { type InputProps } from "./Input";
import { commitDateInput, maskDateDigits, toMaskedInput } from "@/lib/date";
import "./DateInput.css";

export interface DateInputProps
  extends Omit<InputProps, "value" | "onChange" | "type"> {
  /** A stored date. Canonical (YYYY-MM-DD) or any text the user typed. */
  value: string | undefined;
  /** Receives the canonical date, or the raw text while it's incomplete. */
  onChange: (value: string) => void;
}

/**
 * Collects a date as DD/MM/YYYY, inserting the slashes as the user types.
 * Stops short happily: a month and year, or a bare year, are both accepted,
 * since that is how resume dates are usually written.
 *
 * Fully controlled — the text shown is derived from `value` every render, so
 * there is no second copy of the date to fall out of sync.
 */
const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  (
    { value, onChange, className, placeholder = "DD/MM/YYYY", ...rest },
    ref,
  ) => {
    const display = toMaskedInput(value);

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      const typed = event.target.value;
      let digits = typed.replace(/\D/g, "");

      // Backspacing onto an auto-inserted slash has to take the digit in front
      // of it too, or the mask puts the slash straight back and the caret
      // never moves.
      if (typed.length < display.length && display.endsWith("/")) {
        digits = digits.slice(0, -1);
      }

      onChange(commitDateInput(maskDateDigits(digits)));
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        className={["date-input", className].filter(Boolean).join(" ")}
        value={display}
        onChange={handleChange}
        {...rest}
      />
    );
  },
);

DateInput.displayName = "DateInput";
export default DateInput;
