import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@renderer/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "default" | "icon" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const variantClassNames: Record<ButtonVariant, string> = {
  primary:
    "border border-[var(--color-accent)] bg-[var(--color-accent)] text-white shadow-[0_16px_32px_rgba(37,99,235,0.22)] hover:border-[var(--color-accent-strong)] hover:bg-[var(--color-accent-strong)]",
  secondary:
    "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)] hover:bg-[var(--color-surface-strong)]",
  ghost:
    "border border-transparent bg-transparent text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]",
};

const sizeClassNames: Record<ButtonSize, string> = {
  default: "h-10 gap-2 px-4 text-sm",
  icon: "h-10 w-10 justify-center p-0",
  sm: "h-8 gap-2 px-3 text-xs",
};

export function Button({
  className,
  children,
  variant = "secondary",
  size = "default",
  type,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={cn(
        "inline-flex items-center rounded-2xl font-medium transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-[rgba(37,99,235,0.35)]",
        variantClassNames[variant],
        sizeClassNames[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
