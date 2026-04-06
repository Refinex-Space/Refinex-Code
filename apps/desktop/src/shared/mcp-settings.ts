export type DesktopMcpTransport = "stdio" | "http" | "sse";

export interface DesktopMcpKeyValuePair {
  key: string;
  value: string;
}

interface DesktopMcpServerSnapshotBase {
  name: string;
  enabled: boolean;
  transport: DesktopMcpTransport;
  transportLabel: string;
  summary: string;
}

export interface DesktopMcpStdioServerSnapshot
  extends DesktopMcpServerSnapshotBase {
  transport: "stdio";
  command: string;
  args: string[];
  env: DesktopMcpKeyValuePair[];
}

export interface DesktopMcpRemoteServerSnapshot
  extends DesktopMcpServerSnapshotBase {
  transport: "http" | "sse";
  url: string;
  headers: DesktopMcpKeyValuePair[];
}

export type DesktopMcpServerSnapshot =
  | DesktopMcpStdioServerSnapshot
  | DesktopMcpRemoteServerSnapshot;

export interface DesktopUnsupportedMcpServer {
  name: string;
  transport: string;
}

export interface DesktopMcpTransportOption {
  value: DesktopMcpTransport;
  label: string;
  description: string;
}

export interface DesktopMcpSettingsSnapshot {
  storagePath: string;
  servers: DesktopMcpServerSnapshot[];
  unsupportedServers: DesktopUnsupportedMcpServer[];
  transportOptions: DesktopMcpTransportOption[];
}

interface DesktopMcpServerSaveInputBase {
  previousName?: string | null;
  name: string;
  enabled: boolean;
  transport: DesktopMcpTransport;
}

export interface DesktopMcpStdioServerSaveInput
  extends DesktopMcpServerSaveInputBase {
  transport: "stdio";
  command: string;
  args: string[];
  env: DesktopMcpKeyValuePair[];
}

export interface DesktopMcpRemoteServerSaveInput
  extends DesktopMcpServerSaveInputBase {
  transport: "http" | "sse";
  url: string;
  headers: DesktopMcpKeyValuePair[];
}

export type DesktopMcpServerSaveInput =
  | DesktopMcpStdioServerSaveInput
  | DesktopMcpRemoteServerSaveInput;

export interface DesktopMcpServerRemoveInput {
  name: string;
}

export interface DesktopMcpServerToggleInput {
  name: string;
  enabled: boolean;
}

export const DESKTOP_MCP_TRANSPORT_OPTIONS: DesktopMcpTransportOption[] = [
  {
    value: "stdio",
    label: "STDIO",
    description: "通过本地命令启动 MCP 进程。",
  },
  {
    value: "http",
    label: "流式 HTTP",
    description: "连接支持 Streamable HTTP 的远程 MCP 服务。",
  },
  {
    value: "sse",
    label: "SSE",
    description: "兼容部分仍使用 SSE 的远程 MCP 服务。",
  },
];

export const MCP_SERVER_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function getDesktopMcpTransportLabel(transport: DesktopMcpTransport) {
  return (
    DESKTOP_MCP_TRANSPORT_OPTIONS.find((option) => option.value === transport)
      ?.label ?? transport
  );
}
