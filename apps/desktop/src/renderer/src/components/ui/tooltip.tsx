import { Tooltip as RadixTooltip } from "@radix-ui/themes";
import type { ReactNode } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <RadixTooltip content={content} delayDuration={160} side="bottom">
      {children}
    </RadixTooltip>
  );
}
