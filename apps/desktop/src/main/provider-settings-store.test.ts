// @vitest-environment node

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { createProviderSettingsStore } from "./provider-settings-store";

const testRoots: string[] = [];

afterEach(() => {
  for (const root of testRoots.splice(0)) {
    rmSync(root, {
      force: true,
      recursive: true,
    });
  }
});

describe("createProviderSettingsStore", () => {
  it("hydrates Codex provider settings from the Claude config directory", () => {
    const root = mkdtempSync(join(tmpdir(), "rwork-provider-settings-"));
    testRoots.push(root);

    const store = createProviderSettingsStore({
      claudeConfigDir: root,
    });

    const result = store.save({
      providerId: "codex",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "sk-test-codex",
      defaultModel: "gpt-5.4",
      defaultVerbosity: "high",
      defaultReasoningEffort: "medium",
      modelContextWindow: 1_050_000,
      modelAutoCompactTokenLimit: 700_000,
    });

    expect(result.snapshot.activeProviderId).toBe("codex");
    expect(result.snapshot.codex.baseUrl).toBe("https://api.openai.com/v1");
    expect(result.snapshot.codex.defaultVerbosity).toBe("high");
    expect(result.snapshot.codex.hasStoredCredential).toBe(true);
    expect(result.createdFiles).toContain(result.snapshot.paths.providersPath);
    expect(result.createdFiles).toContain(result.snapshot.paths.authPath);
    expect(result.createdFiles).toContain(result.snapshot.paths.settingsPath);

    expect(existsSync(result.snapshot.paths.providersPath)).toBe(true);
    const authFile = JSON.parse(readFileSync(result.snapshot.paths.authPath, "utf8")) as {
      providers: { codex: { apiKey: string } };
    };
    expect(authFile.providers.codex.apiKey).toBe("sk-test-codex");
  });

  it("switches back to Anthropic and clears provider-specific user settings", () => {
    const root = mkdtempSync(join(tmpdir(), "rwork-provider-settings-"));
    testRoots.push(root);

    const store = createProviderSettingsStore({
      claudeConfigDir: root,
    });

    store.save({
      providerId: "codex",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "sk-test-codex",
      defaultModel: "gpt-5.4",
      defaultVerbosity: "medium",
      defaultReasoningEffort: "high",
    });

    const result = store.save({
      providerId: "anthropic",
    });
    const settingsFile = JSON.parse(
      readFileSync(result.snapshot.paths.settingsPath, "utf8"),
    ) as {
      modelProvider: string;
      model?: string;
      modelVerbosity?: string;
      effortLevel?: string;
    };

    expect(result.snapshot.activeProviderId).toBe("anthropic");
    expect(settingsFile.modelProvider).toBe("anthropic");
    expect(settingsFile.model).toBeUndefined();
    expect(settingsFile.modelVerbosity).toBeUndefined();
    expect(settingsFile.effortLevel).toBeUndefined();
  });

  it("rejects a blank api key when Codex has no stored credential", () => {
    const root = mkdtempSync(join(tmpdir(), "rwork-provider-settings-"));
    testRoots.push(root);

    const store = createProviderSettingsStore({
      claudeConfigDir: root,
    });

    expect(() =>
      store.save({
        providerId: "codex",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "",
        defaultModel: "gpt-5.4",
        defaultVerbosity: "medium",
        defaultReasoningEffort: "medium",
      }),
    ).toThrow("API key is required.");
  });
});
