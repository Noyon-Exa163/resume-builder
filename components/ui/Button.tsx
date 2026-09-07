import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import "./Button.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary";
  size?: "l" | "m" | "s";
  iconOnly?: boolean;
  children: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "m",
      iconOnly = false,
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

    return (
      <button ref={ref} className={classes} {...rest}>
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
export default Button;
