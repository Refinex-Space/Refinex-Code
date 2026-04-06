import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type {
  DesktopMcpKeyValuePair,
  DesktopMcpServerSaveInput,
  DesktopMcpServerSnapshot,
  DesktopMcpServerToggleInput,
  DesktopMcpSettingsSnapshot,
  DesktopMcpTransport,
  DesktopUnsupportedMcpServer,
} from "../shared/mcp-settings";
import {
  DESKTOP_MCP_TRANSPORT_OPTIONS,
  MCP_SERVER_NAME_PATTERN,
  getDesktopMcpTransportLabel,
} from "../shared/mcp-settings";

interface RawMcpStdioConfig {
  type?: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface RawMcpRemoteConfig {
  type: "http" | "sse";
  url: string;
  headers?: Record<string, string>;
}

type RawMcpServerConfig = RawMcpStdioConfig | RawMcpRemoteConfig;

interface ClaudeGlobalConfigFile {
  mcpServers?: Record<string, unknown>;
  disabledMcpServers?: unknown;
  [key: string]: unknown;
}

interface CreateMcpSettingsStoreOptions {
  configPath?: string;
}

const RESERVED_SERVER_NAMES = new Set(["claude-in-chrome"]);

function getGlobalConfigPath(override?: string) {
  return (override ?? join(homedir(), ".claude.json")).normalize("NFC");
}

function ensureDirectory(pathname: string) {
  mkdirSync(pathname, {
    recursive: true,
  });
}

function safeReadJson<T>(pathname: string, fallback: T): T {
  try {
    if (!existsSync(pathname)) {
      return fallback;
    }

    const content = readFileSync(pathname, "utf8");
    if (!content.trim()) {
      return fallback;
    }

    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

function writeJson(pathname: string, value: unknown) {
  const tempPath = `${pathname}.tmp`;
  ensureDirectory(dirname(pathname));
  writeFileSync(tempPath, JSON.stringify(value, null, 2) + "\n", "utf8");
  renameSync(tempPath, pathname);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePairs(
  pairs: DesktopMcpKeyValuePair[],
  label: string,
) {
  return pairs.reduce<Record<string, string>>((result, pair) => {
    const key = pair.key.trim();
    const value = pair.value.trim();

    if (!key && !value) {
      return result;
    }

    if (!key) {
      throw new Error(`${label}名称不能为空。`);
    }

    result[key] = value;
    return result;
  }, {});
}

function toPairs(record: Record<string, string> | undefined) {
  return Object.entries(record ?? {}).map(([key, value]) => ({
    key,
    value,
  }));
}

function normalizeArgs(args: string[]) {
  return args
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function getDisabledServers(value: unknown) {
  return new Set(
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [],
  );
}

function sortRecord<T>(value: Record<string, T>) {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
  ) as Record<string, T>;
}

function parseSupportedServer(
  name: string,
  config: unknown,
  disabledServers: Set<string>,
): DesktopMcpServerSnapshot | null {
  if (!isRecord(config)) {
    return null;
  }

  if (
    (config.type === undefined || config.type === "stdio") &&
    typeof config.command === "string" &&
    config.command.trim().length > 0
  ) {
    const args = Array.isArray(config.args)
      ? config.args.filter((value): value is string => typeof value === "string")
      : [];
    const env = isRecord(config.env)
      ? Object.fromEntries(
          Object.entries(config.env)
            .filter((entry): entry is [string, string] => typeof entry[1] === "string"),
        )
      : undefined;

    return {
      name,
      enabled: !disabledServers.has(name),
      transport: "stdio",
      transportLabel: getDesktopMcpTransportLabel("stdio"),
      summary: [config.command.trim(), ...args].join(" "),
      command: config.command.trim(),
      args,
      env: toPairs(env),
    };
  }

  if (
    (config.type === "http" || config.type === "sse") &&
    typeof config.url === "string" &&
    config.url.trim().length > 0
  ) {
    const headers = isRecord(config.headers)
      ? Object.fromEntries(
          Object.entries(config.headers)
            .filter((entry): entry is [string, string] => typeof entry[1] === "string"),
        )
      : undefined;

    return {
      name,
      enabled: !disabledServers.has(name),
      transport: config.type,
      transportLabel: getDesktopMcpTransportLabel(config.type),
      summary: config.url.trim(),
      url: config.url.trim(),
      headers: toPairs(headers),
    };
  }

  return null;
}

function parseUnsupportedServer(
  name: string,
  config: unknown,
): DesktopUnsupportedMcpServer | null {
  if (!isRecord(config)) {
    return null;
  }

  const transport =
    typeof config.type === "string" && config.type.trim().length > 0
      ? config.type.trim()
      : "unknown";

  return {
    name,
    transport,
  };
}

function validateServerName(name: string) {
  if (!name.trim()) {
    throw new Error("服务器名称不能为空。");
  }

  if (!MCP_SERVER_NAME_PATTERN.test(name)) {
    throw new Error("服务器名称只能包含字母、数字、连字符和下划线。");
  }

  if (RESERVED_SERVER_NAMES.has(name)) {
    throw new Error("这个名称已被系统保留，请换一个名称。");
  }
}

function validateRemoteUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error();
    }
  } catch {
    throw new Error("服务器地址必须是有效的 HTTP 或 HTTPS URL。");
  }
}

function buildServerConfig(input: DesktopMcpServerSaveInput): RawMcpServerConfig {
  if (input.transport === "stdio") {
    const command = input.command.trim();
    if (!command) {
      throw new Error("启动命令不能为空。");
    }

    return {
      type: "stdio",
      command,
      args: normalizeArgs(input.args),
      env: normalizePairs(input.env, "环境变量"),
    };
  }

  const url = input.url.trim();
  if (!url) {
    throw new Error("服务器地址不能为空。");
  }

  validateRemoteUrl(url);

  return {
    type: input.transport,
    url,
    headers: normalizePairs(input.headers, "请求头"),
  };
}

function buildNextConfigFile(
  current: ClaudeGlobalConfigFile,
  servers: Record<string, RawMcpServerConfig>,
  disabledServers: Set<string>,
): ClaudeGlobalConfigFile {
  const nextConfig: ClaudeGlobalConfigFile = {
    ...current,
  };

  if (Object.keys(servers).length > 0) {
    nextConfig.mcpServers = sortRecord(servers);
  } else {
    delete nextConfig.mcpServers;
  }

  if (disabledServers.size > 0) {
    nextConfig.disabledMcpServers = Array.from(disabledServers).sort((left, right) =>
      left.localeCompare(right),
    );
  } else {
    delete nextConfig.disabledMcpServers;
  }

  return nextConfig;
}

export function createMcpSettingsStore({
  configPath,
}: CreateMcpSettingsStoreOptions = {}) {
  const storagePath = getGlobalConfigPath(configPath);

  function readConfigFile() {
    return safeReadJson<ClaudeGlobalConfigFile>(storagePath, {});
  }

  function getSnapshot(): DesktopMcpSettingsSnapshot {
    const config = readConfigFile();
    const rawServers = isRecord(config.mcpServers) ? config.mcpServers : {};
    const disabledServers = getDisabledServers(config.disabledMcpServers);
    const servers: DesktopMcpServerSnapshot[] = [];
    const unsupportedServers: DesktopUnsupportedMcpServer[] = [];

    for (const [name, serverConfig] of Object.entries(rawServers)) {
      const supported = parseSupportedServer(name, serverConfig, disabledServers);
      if (supported) {
        servers.push(supported);
        continue;
      }

      const unsupported = parseUnsupportedServer(name, serverConfig);
      if (unsupported) {
        unsupportedServers.push(unsupported);
      }
    }

    servers.sort((left, right) => left.name.localeCompare(right.name));
    unsupportedServers.sort((left, right) => left.name.localeCompare(right.name));

    return {
      storagePath,
      servers,
      unsupportedServers,
      transportOptions: DESKTOP_MCP_TRANSPORT_OPTIONS,
    };
  }

  function save(input: DesktopMcpServerSaveInput) {
    const config = readConfigFile();
    const rawServers = isRecord(config.mcpServers)
      ? ({ ...config.mcpServers } as Record<string, RawMcpServerConfig>)
      : {};
    const disabledServers = getDisabledServers(config.disabledMcpServers);
    const name = input.name.trim();
    const previousName = input.previousName?.trim() || null;

    validateServerName(name);

    if (previousName && previousName !== name) {
      delete rawServers[previousName];
      disabledServers.delete(previousName);
    }

    if (previousName !== name && rawServers[name]) {
      throw new Error("已存在同名 MCP 服务器。");
    }

    rawServers[name] = buildServerConfig(input);

    if (input.enabled) {
      disabledServers.delete(name);
    } else {
      disabledServers.add(name);
    }

    writeJson(
      storagePath,
      buildNextConfigFile(config, rawServers, disabledServers),
    );

    return getSnapshot();
  }

  function remove(name: string) {
    const trimmedName = name.trim();
    const config = readConfigFile();
    const rawServers = isRecord(config.mcpServers)
      ? ({ ...config.mcpServers } as Record<string, RawMcpServerConfig>)
      : {};
    const disabledServers = getDisabledServers(config.disabledMcpServers);

    if (!rawServers[trimmedName]) {
      throw new Error("未找到要删除的 MCP 服务器。");
    }

    delete rawServers[trimmedName];
    disabledServers.delete(trimmedName);

    writeJson(
      storagePath,
      buildNextConfigFile(config, rawServers, disabledServers),
    );

    return getSnapshot();
  }

  function toggle({
    name,
    enabled,
  }: DesktopMcpServerToggleInput) {
    const trimmedName = name.trim();
    const config = readConfigFile();
    const rawServers = isRecord(config.mcpServers)
      ? ({ ...config.mcpServers } as Record<string, RawMcpServerConfig>)
      : {};
    const disabledServers = getDisabledServers(config.disabledMcpServers);

    if (!rawServers[trimmedName]) {
      throw new Error("未找到要更新的 MCP 服务器。");
    }

    if (enabled) {
      disabledServers.delete(trimmedName);
    } else {
      disabledServers.add(trimmedName);
    }

    writeJson(
      storagePath,
      buildNextConfigFile(config, rawServers, disabledServers),
    );

    return getSnapshot();
  }

  return {
    getSnapshot,
    save,
    remove,
    toggle,
  };
}
