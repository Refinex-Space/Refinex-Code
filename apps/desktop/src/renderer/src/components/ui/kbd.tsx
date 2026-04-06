import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@renderer/lib/cn";

interface KbdProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export function Kbd({ children, className, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-6 items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 font-mono text-[length:var(--code-font-size-xs)] uppercase tracking-[0.12em] text-[var(--color-muted)]",
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
