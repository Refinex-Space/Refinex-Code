import { DropdownMenu } from "@radix-ui/themes";
import { Blocks, ChevronRight, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { DesktopMcpServerSnapshot } from "../../../../shared/mcp-settings";
import { Button } from "@renderer/components/ui/button";
import { cn } from "@renderer/lib/cn";

interface McpQuickAccessMenuProps {
  onOpenSettings: () => void;
}

function supportsMcpBridge() {
  return (
    typeof window !== "undefined" &&
    typeof window.desktopApp?.getMcpSettings === "function" &&
    typeof window.desktopApp?.toggleMcpServer === "function"
  );
}

export function McpQuickAccessMenu({
  onOpenSettings,
}: McpQuickAccessMenuProps) {
  const [open, setOpen] = useState(false);
  const [servers, setServers] = useState<DesktopMcpServerSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingName, setTogglingName] = useState<string | null>(null);

  const loadServers = async () => {
    if (!supportsMcpBridge()) {
      setError("MCP 接口暂不可用");
      setServers([]);
      return;
    }

    try {
      setLoading(true);
      const snapshot = await window.desktopApp.getMcpSettings();
      setServers(snapshot.servers);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载 MCP 失败");
      setServers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    void loadServers();
  }, [open]);

  const handleToggle = async (server: DesktopMcpServerSnapshot) => {
    if (!supportsMcpBridge()) {
      setError("MCP 接口暂不可用");
      return;
    }

    try {
      setTogglingName(server.name);
      const snapshot = await window.desktopApp.toggleMcpServer({
        name: server.name,
        enabled: !server.enabled,
      });
      setServers(snapshot.servers);
      setError(null);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "更新 MCP 状态失败");
    } finally {
      setTogglingName(null);
    }
  };

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger
        onClick={(event) => {
          event.preventDefault();
          setOpen((current) => !current);
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open MCP quick menu"
          title="MCP"
          className="h-8 w-8 rounded-lg"
        >
          <Blocks className="h-4 w-4" />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        side="bottom"
        align="end"
        sideOffset={8}
        className="z-40 w-[280px] overflow-hidden rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-0 shadow-[var(--shadow-panel)] outline-none"
      >
        <div className="border-b border-[var(--color-border)] px-3.5 py-2">
          <div className="text-[13px] font-semibold text-[var(--color-fg)]">
            MCP
          </div>
        </div>

        <div className="max-h-[236px] overflow-y-auto px-2 py-1">
          {loading ? (
            <div className="px-2 py-6 text-center text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
              正在加载…
            </div>
          ) : error ? (
            <div className="px-2 py-3 text-[length:var(--ui-font-size-sm)] text-[#dc2626]">
              {error}
            </div>
          ) : servers.length === 0 ? (
            <div className="px-2 py-6 text-center text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
              还没有可快速切换的 MCP 服务器
            </div>
          ) : (
            <div className="space-y-0.5">
              {servers.map((server) => (
                <div
                  key={server.name}
                  className="flex items-center gap-2.5 rounded-[12px] px-2 py-1.5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-surface)] text-[var(--color-muted)]">
                    <Blocks className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium leading-5 text-[var(--color-fg)]">
                      {server.name}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
                      {server.transportLabel}
                    </div>
                  </div>
                  <MiniSwitch
                    label={`${server.name} quick toggle`}
                    checked={server.enabled}
                    disabled={togglingName === server.name}
                    onCheckedChange={() => void handleToggle(server)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--color-border)] px-2.5 py-1">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
            className="flex w-full items-center justify-between rounded-[12px] px-2 py-1 text-left text-[10px] text-[var(--color-muted)] transition-colors duration-150 hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]"
          >
            <span className="inline-flex items-center gap-2">
              <Settings2 className="h-3 w-3" aria-hidden="true" />
              打开 MCP 设置
            </span>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

function MiniSwitch({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onCheckedChange}
      className={cn(
        "relative inline-flex h-6.5 w-11 items-center rounded-full border transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60",
        checked
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)]",
      )}
    >
      <span
        className={cn(
          "inline-block h-4.5 w-4.5 rounded-full bg-white transition-transform duration-150",
          checked ? "translate-x-[22px]" : "translate-x-1",
        )}
      />
    </button>
  );
}
