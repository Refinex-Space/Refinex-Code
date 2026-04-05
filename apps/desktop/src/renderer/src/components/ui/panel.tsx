import type { HTMLAttributes } from "react";
import { cn } from "@renderer/lib/cn";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel)] shadow-[var(--shadow-panel)] backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  );
}
