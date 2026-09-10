"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Tooltip } from "./Tooltip";
import "./Button.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary";
  size?: "l" | "m" | "s";
  iconOnly?: boolean;
  /** Visible hover/focus hint. Icon-only buttons fall back to `aria-label`. */
  tooltip?: string;
  children: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "m",
      iconOnly = false,
      tooltip,
      title,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const classes = [
      "button",
      `button--${variant}`,
      `button--${size}`,
      iconOnly && "button--icon-only",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const ariaLabel = rest["aria-label"];
    const tooltipLabel =
      tooltip ??
      (typeof title === "string" ? title : undefined) ??
      (iconOnly && typeof ariaLabel === "string" ? ariaLabel : undefined);

    const button = (
      <button ref={ref} className={classes} {...rest}>
        {children}
      </button>
    );

    if (!tooltipLabel) return button;

    return <Tooltip label={tooltipLabel}>{button}</Tooltip>;
  },
);

Button.displayName = "Button";
export default Button;
