// @vitest-environment node

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { createMcpSettingsStore } from "./mcp-settings-store";

const testRoots: string[] = [];

afterEach(() => {
  for (const root of testRoots.splice(0)) {
    rmSync(root, {
      force: true,
      recursive: true,
    });
  }
});

describe("createMcpSettingsStore", () => {
  it("writes a stdio MCP server into the global Claude config", () => {
    const root = mkdtempSync(join(tmpdir(), "rwork-mcp-settings-"));
    testRoots.push(root);
    const configPath = join(root, ".claude.json");
    const store = createMcpSettingsStore({ configPath });

    const snapshot = store.save({
      name: "context7",
      enabled: true,
      transport: "stdio",
      command: "npx",
      args: ["-y", "@upstash/context7-mcp"],
      env: [{ key: "API_KEY", value: "ctx7sk-test" }],
    });

    expect(snapshot.servers).toHaveLength(1);
    expect(snapshot.servers[0]).toMatchObject({
      name: "context7",
      enabled: true,
      transport: "stdio",
      command: "npx",
      args: ["-y", "@upstash/context7-mcp"],
    });
    expect(existsSync(configPath)).toBe(true);

    const configFile = JSON.parse(readFileSync(configPath, "utf8")) as {
      mcpServers: {
        context7: {
          type: string;
          command: string;
          args: string[];
          env: { API_KEY: string };
        };
      };
      disabledMcpServers?: string[];
    };

    expect(configFile.mcpServers.context7.type).toBe("stdio");
    expect(configFile.mcpServers.context7.env.API_KEY).toBe("ctx7sk-test");
    expect(configFile.disabledMcpServers).toBeUndefined();
  });

  it("toggles enable state through disabledMcpServers", () => {
    const root = mkdtempSync(join(tmpdir(), "rwork-mcp-settings-"));
    testRoots.push(root);
    const configPath = join(root, ".claude.json");
    const store = createMcpSettingsStore({ configPath });

    store.save({
      name: "pencil",
      enabled: true,
      transport: "stdio",
      command:
        "/Applications/Pencil.app/Contents/Resources/app.asar.unpacked/out/mcp-server-darwin-arm64",
      args: ["--app", "desktop"],
      env: [],
    });

    const disabledSnapshot = store.toggle({
      name: "pencil",
      enabled: false,
    });

    expect(disabledSnapshot.servers[0]?.enabled).toBe(false);

    const configFile = JSON.parse(readFileSync(configPath, "utf8")) as {
      disabledMcpServers: string[];
    };
    expect(configFile.disabledMcpServers).toEqual(["pencil"]);
  });

  it("supports renaming and editing a remote MCP server", () => {
    const root = mkdtempSync(join(tmpdir(), "rwork-mcp-settings-"));
    testRoots.push(root);
    const configPath = join(root, ".claude.json");
    const store = createMcpSettingsStore({ configPath });

    store.save({
      name: "corridor",
      previousName: null,
      enabled: false,
      transport: "http",
      url: "https://app.corridor.dev/api/mcp",
      headers: [{ key: "Authorization", value: "Bearer test-token" }],
    });

    const snapshot = store.save({
      name: "corridor-main",
      previousName: "corridor",
      enabled: true,
      transport: "http",
      url: "https://app.corridor.dev/api/mcp",
      headers: [{ key: "X-Workspace", value: "desktop" }],
    });

    expect(snapshot.servers).toHaveLength(1);
    expect(snapshot.servers[0]).toMatchObject({
      name: "corridor-main",
      enabled: true,
      transport: "http",
      url: "https://app.corridor.dev/api/mcp",
    });

    const configFile = JSON.parse(readFileSync(configPath, "utf8")) as {
      mcpServers: Record<string, unknown>;
      disabledMcpServers?: string[];
    };

    expect(Object.keys(configFile.mcpServers)).toEqual(["corridor-main"]);
    expect(configFile.disabledMcpServers).toBeUndefined();
  });

  it("reports unsupported transports without trying to coerce them", () => {
    const root = mkdtempSync(join(tmpdir(), "rwork-mcp-settings-"));
    testRoots.push(root);
    const configPath = join(root, ".claude.json");

    writeFileSync(
      configPath,
      JSON.stringify(
        {
          mcpServers: {
            figma: {
              type: "ws",
              url: "wss://example.com/mcp",
            },
          },
        },
        null,
        2,
      ),
    );

    const store = createMcpSettingsStore({ configPath });
    const snapshot = store.getSnapshot();

    expect(snapshot.servers).toHaveLength(0);
    expect(snapshot.unsupportedServers).toEqual([
      {
        name: "figma",
        transport: "ws",
      },
    ]);
  });
});
