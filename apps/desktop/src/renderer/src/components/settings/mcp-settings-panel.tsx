import {
  ArrowLeft,
  Cog,
  Link2,
  PlugZap,
  Plus,
  Save,
  Server,
  SquareTerminal,
  Trash2,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@renderer/components/ui/button";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { cn } from "@renderer/lib/cn";
import type {
  DesktopMcpKeyValuePair,
  DesktopMcpServerSaveInput,
  DesktopMcpServerSnapshot,
  DesktopMcpSettingsSnapshot,
  DesktopMcpTransport,
} from "../../../../shared/mcp-settings";
import { DESKTOP_MCP_TRANSPORT_OPTIONS } from "../../../../shared/mcp-settings";

interface DraftPair {
  id: string;
  key: string;
  value: string;
}

interface McpFormDraft {
  previousName: string | null;
  name: string;
  enabled: boolean;
  transport: DesktopMcpTransport;
  command: string;
  argsText: string;
  env: DraftPair[];
  url: string;
  headers: DraftPair[];
}

type ViewState =
  | {
      type: "list";
    }
  | {
      type: "create";
    }
  | {
      type: "edit";
      serverName: string;
    };

function supportsMcpBridge() {
  return (
    typeof window !== "undefined" &&
    typeof window.desktopApp?.getMcpSettings === "function" &&
    typeof window.desktopApp?.saveMcpServer === "function" &&
    typeof window.desktopApp?.removeMcpServer === "function" &&
    typeof window.desktopApp?.toggleMcpServer === "function"
  );
}

function createDraftPair(
  key = "",
  value = "",
): DraftPair {
  return {
    id: `${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`,
    key,
    value,
  };
}

function ensureDraftPairs(pairs: DesktopMcpKeyValuePair[]) {
  return pairs.length > 0
    ? pairs.map((pair) => createDraftPair(pair.key, pair.value))
    : [createDraftPair()];
}

function createEmptyDraft(
  transport: DesktopMcpTransport = "stdio",
): McpFormDraft {
  return {
    previousName: null,
    name: "",
    enabled: true,
    transport,
    command: "",
    argsText: "",
    env: [createDraftPair()],
    url: "",
    headers: [createDraftPair()],
  };
}

function createDraftFromServer(server: DesktopMcpServerSnapshot): McpFormDraft {
  if (server.transport === "stdio") {
    return {
      previousName: server.name,
      name: server.name,
      enabled: server.enabled,
      transport: "stdio",
      command: server.command,
      argsText: server.args.join("\n"),
      env: ensureDraftPairs(server.env),
      url: "",
      headers: [createDraftPair()],
    };
  }

  return {
    previousName: server.name,
    name: server.name,
    enabled: server.enabled,
    transport: server.transport,
    command: "",
    argsText: "",
    env: [createDraftPair()],
    url: server.url,
    headers: ensureDraftPairs(server.headers),
  };
}

function draftPairsToSave(pairs: DraftPair[]) {
  return pairs.map(({ key, value }) => ({
    key,
    value,
  }));
}

function buildSaveInput(draft: McpFormDraft): DesktopMcpServerSaveInput {
  if (draft.transport === "stdio") {
    return {
      previousName: draft.previousName,
      name: draft.name,
      enabled: draft.enabled,
      transport: "stdio",
      command: draft.command,
      args: draft.argsText
        .split("\n")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
      env: draftPairsToSave(draft.env),
    };
  }

  return {
    previousName: draft.previousName,
    name: draft.name,
    enabled: draft.enabled,
    transport: draft.transport,
    url: draft.url,
    headers: draftPairsToSave(draft.headers),
  };
}

export function McpSettingsPanel() {
  const [snapshot, setSnapshot] = useState<DesktopMcpSettingsSnapshot | null>(null);
  const [view, setView] = useState<ViewState>({
    type: "list",
  });
  const [draft, setDraft] = useState<McpFormDraft>(createEmptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [togglingName, setTogglingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supportsMcpBridge()) {
      setError("当前桌面桥接尚未暴露 MCP 设置接口，请重启桌面开发进程后再试。");
      setLoading(false);
      return;
    }

    let cancelled = false;

    void window.desktopApp
      .getMcpSettings()
      .then((nextSnapshot) => {
        if (cancelled) {
          return;
        }

        setSnapshot(nextSnapshot);
        setError(null);
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "加载 MCP 设置失败。");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleStartCreate = (transport: DesktopMcpTransport = "stdio") => {
    setDraft(createEmptyDraft(transport));
    setView({
      type: "create",
    });
    setError(null);
  };

  const handleStartEdit = (server: DesktopMcpServerSnapshot) => {
    setDraft(createDraftFromServer(server));
    setView({
      type: "edit",
      serverName: server.name,
    });
    setError(null);
  };

  const handleBackToList = () => {
    setView({
      type: "list",
    });
    setDraft(createEmptyDraft());
    setError(null);
  };

  const handleSave = async () => {
    if (!supportsMcpBridge()) {
      toast.error("MCP 设置接口不可用，请重启桌面进程。");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const nextSnapshot = await window.desktopApp.saveMcpServer(
        buildSaveInput(draft),
      );

      setSnapshot(nextSnapshot);
      setView({
        type: "list",
      });
      setDraft(createEmptyDraft());
      toast.success(
        draft.previousName
          ? `已保存 ${draft.name || draft.previousName}`
          : `已添加 ${draft.name}`,
      );
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "保存 MCP 设置失败。";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!supportsMcpBridge()) {
      toast.error("MCP 设置接口不可用，请重启桌面进程。");
      return;
    }

    const targetName = draft.previousName ?? draft.name.trim();
    if (!targetName) {
      return;
    }

    try {
      setRemoving(true);
      setError(null);

      const nextSnapshot = await window.desktopApp.removeMcpServer(targetName);
      setSnapshot(nextSnapshot);
      setView({
        type: "list",
      });
      setDraft(createEmptyDraft());
      toast.success(`已移除 ${targetName}`);
    } catch (removeError) {
      const message =
        removeError instanceof Error ? removeError.message : "卸载 MCP 服务器失败。";
      setError(message);
      toast.error(message);
    } finally {
      setRemoving(false);
    }
  };

  const handleToggle = async (server: DesktopMcpServerSnapshot) => {
    if (!supportsMcpBridge()) {
      toast.error("MCP 设置接口不可用，请重启桌面进程。");
      return;
    }

    try {
      setTogglingName(server.name);
      setError(null);

      const nextSnapshot = await window.desktopApp.toggleMcpServer({
        name: server.name,
        enabled: !server.enabled,
      });

      setSnapshot(nextSnapshot);

      if (view.type === "edit" && view.serverName === server.name) {
        const nextServer =
          nextSnapshot.servers.find((item) => item.name === server.name) ?? null;
        if (nextServer) {
          setDraft(createDraftFromServer(nextServer));
        }
      }
    } catch (toggleError) {
      const message =
        toggleError instanceof Error ? toggleError.message : "更新启用状态失败。";
      setError(message);
      toast.error(message);
    } finally {
      setTogglingName(null);
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-var(--titlebar-height))]">
      <div className="mx-auto flex w-full max-w-[920px] flex-col gap-6 px-6 pt-4 pb-10">
        <div className="space-y-1">
          <h1 className="text-[length:var(--ui-font-size-xl)] font-semibold tracking-[-0.03em] text-[var(--color-fg)]">
            MCP 服务器
          </h1>
          <p className="text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
            连接外部工具和数据源。{" "}
            <a
              href="https://code.claude.com/docs/en/mcp"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-accent)] underline underline-offset-4"
            >
              Learn more.
            </a>
          </p>
        </div>

        {view.type === "list" ? (
          <ListView
            snapshot={snapshot}
            loading={loading}
            error={error}
            togglingName={togglingName}
            onCreate={handleStartCreate}
            onEdit={handleStartEdit}
            onToggle={handleToggle}
          />
        ) : (
          <EditorView
            draft={draft}
            loading={loading}
            error={error}
            saving={saving}
            removing={removing}
            mode={view.type}
            onBack={handleBackToList}
            onDraftChange={setDraft}
            onSave={handleSave}
            onRemove={handleRemove}
          />
        )}
      </div>
    </ScrollArea>
  );
}

function ListView({
  snapshot,
  loading,
  error,
  togglingName,
  onCreate,
  onEdit,
  onToggle,
}: {
  snapshot: DesktopMcpSettingsSnapshot | null;
  loading: boolean;
  error: string | null;
  togglingName: string | null;
  onCreate: (transport?: DesktopMcpTransport) => void;
  onEdit: (server: DesktopMcpServerSnapshot) => void;
  onToggle: (server: DesktopMcpServerSnapshot) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--color-panel)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5">
        <div className="space-y-1">
          <div className="text-[length:var(--ui-font-size-md)] font-semibold text-[var(--color-fg)]">
            自定义服务器
          </div>
          <div className="text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
            管理当前账户下可直接在桌面端使用的 MCP 服务。
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={() => onCreate("stdio")}
          className="rounded-xl"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          添加服务器
        </Button>
      </div>

      {loading ? (
        <div className="px-5 py-8 text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
          正在加载 MCP 配置…
        </div>
      ) : null}

      {!loading && error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

      {!loading && snapshot?.unsupportedServers.length ? (
        <InlineNotice>
          以下服务器使用了桌面端暂未开放的 transport，仅保留在原配置文件中：
          {snapshot.unsupportedServers
            .map((server) => `${server.name}（${server.transport}）`)
            .join("、")}
          。
        </InlineNotice>
      ) : null}

      {!loading && snapshot && snapshot.servers.length === 0 ? (
        <div className="px-5 py-10">
          <div className="rounded-[20px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-panel)] text-[var(--color-muted)]">
              <Server className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="mt-4 text-[length:var(--ui-font-size-md)] font-medium text-[var(--color-fg)]">
              还没有自定义 MCP 服务器
            </div>
            <div className="mt-2 text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
              你可以添加本地命令型服务器，或接入远程 MCP 地址。
            </div>
            <div className="mt-5 flex justify-center">
              <Button
                variant="secondary"
                onClick={() => onCreate("stdio")}
                className="rounded-xl"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                添加服务器
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && snapshot?.servers.length ? (
        <div>
          {snapshot.servers.map((server) => (
            <ServerRow
              key={server.name}
              server={server}
              toggling={togglingName === server.name}
              onEdit={() => onEdit(server)}
              onToggle={() => onToggle(server)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function EditorView({
  draft,
  loading,
  error,
  saving,
  removing,
  mode,
  onBack,
  onDraftChange,
  onSave,
  onRemove,
}: {
  draft: McpFormDraft;
  loading: boolean;
  error: string | null;
  saving: boolean;
  removing: boolean;
  mode: "create" | "edit";
  onBack: () => void;
  onDraftChange: (draft: McpFormDraft) => void;
  onSave: () => void;
  onRemove: () => void;
}) {
  const updateDraft = (patch: Partial<McpFormDraft>) => {
    onDraftChange({
      ...draft,
      ...patch,
    });
  };

  return (
    <section className="overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--color-panel)]">
      <div className="border-b border-[var(--color-border)] px-5 py-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl px-2.5 py-2 text-[length:var(--ui-font-size-sm)] font-medium text-[var(--color-muted)] transition-colors duration-150 hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>返回 MCP 列表</span>
        </button>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[length:var(--ui-font-size-md)] font-semibold text-[var(--color-fg)]">
              {mode === "create" ? "添加服务器" : "编辑服务器"}
            </div>
            <div className="text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
              {mode === "create"
                ? "填写连接方式、启动信息或远程地址，然后保存到当前账户配置。"
                : "调整这台 MCP 服务器的名称、连接方式和启用状态。"}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mode === "edit" ? (
              <Button
                variant="secondary"
                onClick={() => void onRemove()}
                disabled={removing || saving}
                className="rounded-xl"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {removing ? "卸载中…" : "卸载"}
              </Button>
            ) : null}

            <Button
              variant="primary"
              onClick={() => void onSave()}
              disabled={saving || removing || loading}
              className="rounded-xl shadow-none"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {saving ? "保存中…" : "保存"}
            </Button>
          </div>
        </div>
      </div>

      {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

      <SettingRow
        icon={Server}
        label="服务器名称"
        description="建议使用易读、稳定的名称；名称会作为 MCP 标识写入配置。"
        control={
          <TextInput
            ariaLabel="MCP 服务器名称"
            value={draft.name}
            onChange={(value) => updateDraft({ name: value })}
            placeholder="例如 context7"
          />
        }
      />

      <SettingRow
        icon={PlugZap}
        label="连接方式"
        description="根据服务器提供的接入方式选择本地命令启动，或远程 HTTP / SSE 地址。"
        control={
          <TransportPicker
            value={draft.transport}
            onChange={(transport) => updateDraft({ transport })}
          />
        }
      />

      <SettingRow
        icon={Cog}
        label="启用状态"
        description="关闭后会保留配置，但桌面端和 CLI 默认不再启用这台服务器。"
        control={
          <SwitchControl
            label="启用 MCP 服务器"
            checked={draft.enabled}
            onCheckedChange={(enabled) => updateDraft({ enabled })}
          />
        }
      />

      {draft.transport === "stdio" ? (
        <>
          <SettingRow
            icon={SquareTerminal}
            label="启动命令"
            description="填写可直接启动 MCP 进程的命令，例如 npx、node 或本地可执行文件路径。"
            control={
              <TextInput
                ariaLabel="MCP 启动命令"
                value={draft.command}
                onChange={(value) => updateDraft({ command: value })}
                placeholder="例如 npx"
              />
            }
          />

          <SettingRow
            icon={SquareTerminal}
            label="启动参数"
            description="每行填写一个参数，保存时会按参数数组写入配置。"
            control={
              <TextAreaInput
                ariaLabel="MCP 启动参数"
                value={draft.argsText}
                onChange={(value) => updateDraft({ argsText: value })}
                placeholder={"-y\n@upstash/context7-mcp"}
              />
            }
          />

          <SettingBlock
            icon={Cog}
            label="环境变量"
            description="用于为本地命令注入凭证或运行参数；留空的行不会写入配置。"
          >
            <KeyValueEditor
              ariaLabel="环境变量"
              pairs={draft.env}
              addLabel="添加环境变量"
              emptyKeyLabel="变量名"
              emptyValueLabel="变量值"
              onChange={(env) => updateDraft({ env })}
            />
          </SettingBlock>
        </>
      ) : (
        <>
          <SettingRow
            icon={Link2}
            label="服务器地址"
            description="填写远程 MCP 的完整地址，支持 HTTP 与 HTTPS。"
            control={
              <TextInput
                ariaLabel="MCP 服务器地址"
                value={draft.url}
                onChange={(value) => updateDraft({ url: value })}
                placeholder="https://example.com/mcp"
              />
            }
          />

          <SettingBlock
            icon={Cog}
            label="请求头"
            description="用于附带鉴权或工作区标识；留空的行不会写入配置。"
          >
            <KeyValueEditor
              ariaLabel="请求头"
              pairs={draft.headers}
              addLabel="添加请求头"
              emptyKeyLabel="Header 名称"
              emptyValueLabel="Header 值"
              onChange={(headers) => updateDraft({ headers })}
            />
          </SettingBlock>
        </>
      )}
    </section>
  );
}

function ServerRow({
  server,
  toggling,
  onEdit,
  onToggle,
}: {
  server: DesktopMcpServerSnapshot;
  toggling: boolean;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <div className="grid gap-4 border-t border-[var(--color-border)] px-5 py-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface)] text-[var(--color-muted)]">
          <Server className="h-4 w-4" aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[length:var(--ui-font-size-md)] font-medium text-[var(--color-fg)]">
              {server.name}
            </div>
            <TransportBadge>{server.transportLabel}</TransportBadge>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`编辑 ${server.name}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] transition-colors duration-150 hover:text-[var(--color-fg)]"
        >
          <Cog className="h-4 w-4" aria-hidden="true" />
        </button>
        <SwitchControl
          label={`${server.name} 启用状态`}
          checked={server.enabled}
          disabled={toggling}
          onCheckedChange={onToggle}
        />
      </div>
    </div>
  );
}

function SettingRow({
  icon: Icon,
  label,
  description,
  control,
}: {
  icon: typeof Server;
  label: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <div className="grid gap-4 border-t border-[var(--color-border)] px-5 py-4 sm:grid-cols-[minmax(0,1fr)_320px] sm:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface)] text-[var(--color-muted)]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-[length:var(--ui-font-size-md)] font-medium text-[var(--color-fg)]">
            {label}
          </div>
          <div className="mt-1 text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
            {description}
          </div>
        </div>
      </div>

      <div className="w-full min-w-0 sm:w-[320px]">{control}</div>
    </div>
  );
}

function SettingBlock({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: typeof Server;
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-[var(--color-border)] px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface)] text-[var(--color-muted)]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-[length:var(--ui-font-size-md)] font-medium text-[var(--color-fg)]">
            {label}
          </div>
          <div className="mt-1 text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
            {description}
          </div>
        </div>
      </div>

      <div className="mt-4">{children}</div>
    </div>
  );
}

function TextInput({
  ariaLabel,
  value,
  onChange,
  placeholder,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[length:var(--ui-font-size-sm)] text-[var(--color-fg)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]"
    />
  );
}

function TextAreaInput({
  ariaLabel,
  value,
  onChange,
  placeholder,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={4}
      className="min-h-[104px] w-full resize-y rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-[length:var(--ui-font-size-sm)] text-[var(--color-fg)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]"
    />
  );
}

function TransportPicker({
  value,
  onChange,
}: {
  value: DesktopMcpTransport;
  onChange: (transport: DesktopMcpTransport) => void;
}) {
  return (
    <div
      className="grid grid-cols-3 gap-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
      role="group"
      aria-label="MCP 连接方式"
    >
      {DESKTOP_MCP_TRANSPORT_OPTIONS.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            aria-label={option.label}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-[14px] border px-2 py-2 text-center text-[length:var(--ui-font-size-xs)] font-medium transition-colors duration-150",
              active
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-fg)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function KeyValueEditor({
  ariaLabel,
  pairs,
  addLabel,
  emptyKeyLabel,
  emptyValueLabel,
  onChange,
}: {
  ariaLabel: string;
  pairs: DraftPair[];
  addLabel: string;
  emptyKeyLabel: string;
  emptyValueLabel: string;
  onChange: (pairs: DraftPair[]) => void;
}) {
  const updatePair = (id: string, patch: Partial<DraftPair>) => {
    onChange(
      pairs.map((pair) => (pair.id === id ? { ...pair, ...patch } : pair)),
    );
  };

  const removePair = (id: string) => {
    if (pairs.length === 1) {
      onChange([createDraftPair()]);
      return;
    }

    onChange(pairs.filter((pair) => pair.id !== id));
  };

  const addPair = () => {
    onChange([...pairs, createDraftPair()]);
  };

  return (
    <div
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
      aria-label={ariaLabel}
    >
      <div className="space-y-2">
        {pairs.map((pair) => (
          <div
            key={pair.id}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_36px] items-center gap-2"
          >
            <input
              type="text"
              value={pair.key}
              onChange={(event) =>
                updatePair(pair.id, { key: event.target.value })
              }
              placeholder={emptyKeyLabel}
              className="h-10 min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-[length:var(--ui-font-size-sm)] text-[var(--color-fg)] outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]"
            />
            <input
              type="text"
              value={pair.value}
              onChange={(event) =>
                updatePair(pair.id, { value: event.target.value })
              }
              placeholder={emptyValueLabel}
              className="h-10 min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-[length:var(--ui-font-size-sm)] text-[var(--color-fg)] outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]"
            />
            <button
              type="button"
              aria-label={`移除${emptyKeyLabel}`}
              onClick={() => removePair(pair.id)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-muted)] transition-colors duration-150 hover:bg-[var(--color-panel)] hover:text-[var(--color-fg)]"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={addPair}
          className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-[length:var(--ui-font-size-sm)] font-medium text-[var(--color-accent)] transition-opacity duration-150 hover:opacity-80"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {addLabel}
        </button>
      </div>
    </div>
  );
}

function SwitchControl({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-8 w-14 items-center rounded-full border transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60",
        checked
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)]",
      )}
    >
      <span
        className={cn(
          "inline-block h-6 w-6 rounded-full bg-white shadow-[0_4px_14px_rgba(15,23,42,0.22)] transition-transform duration-150",
          checked ? "translate-x-7" : "translate-x-1",
        )}
      />
    </button>
  );
}

function InlineNotice({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "danger";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-t border-[var(--color-border)] px-5 py-4 text-[length:var(--ui-font-size-sm)]",
        tone === "danger"
          ? "bg-[rgba(239,68,68,0.08)] text-[#dc2626]"
          : "bg-[var(--color-surface)] text-[var(--color-muted)]",
      )}
    >
      {children}
    </div>
  );
}

function TransportBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[length:var(--ui-font-size-2xs)] font-medium uppercase tracking-[0.08em] text-[var(--color-muted)]">
      {children}
    </span>
  );
}
