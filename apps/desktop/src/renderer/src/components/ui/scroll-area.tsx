import type { HTMLAttributes } from "react";
import { cn } from "@renderer/lib/cn";

export function ScrollArea({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("overflow-y-auto [scrollbar-gutter:stable]", className)}
      {...props}
    />
  );
}
