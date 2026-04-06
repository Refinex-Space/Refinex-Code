import { motion } from "framer-motion";
import { ArrowLeft, PlugZap, SunMedium } from "lucide-react";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { cn } from "@renderer/lib/cn";
import type { SettingsSection } from "@renderer/stores/ui";

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSelectSection: (section: SettingsSection) => void;
  onBackToApp: () => void;
}

export function SettingsSidebar({
  activeSection,
  onSelectSection,
  onBackToApp,
}: SettingsSidebarProps) {
  return (
    <div className="flex h-[calc(100vh-var(--titlebar-height))] flex-col">
      <div className="px-3 pt-2 pb-3">
        <button
          type="button"
          onClick={onBackToApp}
          className="inline-flex items-center gap-2 rounded-xl px-2.5 py-2 text-[length:var(--ui-font-size-sm)] font-medium text-[var(--color-muted)] transition-colors duration-150 hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-fg)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>返回应用</span>
        </button>
      </div>

      <div className="px-4 pb-3">
        <h2 className="text-[length:var(--ui-font-size-xs)] font-semibold tracking-[0.08em] text-[var(--color-muted)]">
          设置
        </h2>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-2 pb-4">
        <nav className="space-y-1">
          <SettingsNavItem
            active={activeSection === "appearance"}
            label="Appearance"
            icon={SunMedium}
            onClick={() => onSelectSection("appearance")}
          />
          <SettingsNavItem
            active={activeSection === "provider"}
            label="供应商"
            icon={PlugZap}
            onClick={() => onSelectSection("provider")}
          />
        </nav>
      </ScrollArea>
    </div>
  );
}

interface SettingsNavItemProps {
  active: boolean;
  label: string;
  icon: typeof SunMedium;
  onClick: () => void;
}

function SettingsNavItem({
  active,
  label,
  icon: Icon,
  onClick,
}: SettingsNavItemProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ x: 1 }}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.14, ease: "easeOut" }}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2 text-left transition-colors duration-150",
        active
          ? "bg-[var(--color-sidebar-active)] text-[var(--color-fg)]"
          : "text-[var(--color-fg)]/82 hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-fg)]",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          active ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]",
        )}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate text-[length:var(--ui-font-size-md)] font-medium">
        {label}
      </span>
    </motion.button>
  );
}
