import {
  Info,
  AlertTriangle,
  AlertCircle,
  Zap,
  DollarSign,
  MemoryStick,
  Users,
  Clock,
  Wifi,
} from "lucide-react";
import type {
  GuiSystemBlock,
  GuiSystemSubtype,
} from "../../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";

type LevelConfig = {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  border: string;
  bg: string;
  textColor: string;
};

const levelConfig: Record<GuiSystemBlock["level"], LevelConfig> = {
  info: {
    icon: Info,
    border: "border-blue-500/25",
    bg: "bg-blue-500/6",
    textColor: "text-blue-300",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-amber-500/30",
    bg: "bg-amber-500/6",
    textColor: "text-amber-300",
  },
  error: {
    icon: AlertCircle,
    border: "border-red-500/30",
    bg: "bg-red-500/6",
    textColor: "text-red-300",
  },
};

const subtypeIcons: Partial<
  Record<GuiSystemSubtype, React.FC<React.SVGProps<SVGSVGElement>>>
> = {
  skill_loaded: Zap,
  cost_summary: DollarSign,
  memory_saved: MemoryStick,
  agents_killed: Users,
  turn_duration: Clock,
  bridge_status: Wifi,
};

interface SystemBlockProps {
  block: GuiSystemBlock;
}

export function SystemBlock({ block }: SystemBlockProps) {
  const cfg = levelConfig[block.level];
  const SubtypeIcon = subtypeIcons[block.subtype];
  const IconComponent = SubtypeIcon ?? cfg.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5",
        cfg.border,
        cfg.bg,
      )}
    >
      <IconComponent
        className={cn("mt-0.5 h-3.5 w-3.5 flex-shrink-0", cfg.textColor)}
      />
      <p className={cn("text-[12.5px] leading-relaxed", cfg.textColor)}>
        {block.message}
      </p>
    </div>
  );
}
