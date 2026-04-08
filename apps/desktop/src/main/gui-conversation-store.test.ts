import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createGuiConversationStore } from "./gui-conversation-store";

describe("createGuiConversationStore", () => {
  it("creates an empty snapshot and keeps the same backing session id", () => {
    const root = mkdtempSync(join(tmpdir(), "rwork-gui-conversation-"));
    const store = createGuiConversationStore({
      userDataPath: root,
      runConversation: vi.fn(),
      createCliSessionId: () => "11111111-1111-4111-8111-111111111111",
    });

    const first = store.getSnapshot("session_alpha");
    const second = store.getSnapshot("session_alpha");

    expect(first.sessionId).toBe("session_alpha");
    expect(first.messages).toEqual([]);
    expect(second).toEqual(first);
  });

  it("persists user and assistant messages and resumes the same CLI session", async () => {
    const root = mkdtempSync(join(tmpdir(), "rwork-gui-conversation-"));
    const runConversation = vi
      .fn()
      .mockResolvedValueOnce({
        outputText: "第一次响应",
        isError: false,
      })
      .mockResolvedValueOnce({
        outputText: "第二次响应",
        isError: false,
      });
    const store = createGuiConversationStore({
      userDataPath: root,
      runConversation,
      createCliSessionId: () => "22222222-2222-4222-8222-222222222222",
    });

    const first = await store.submitMessage({
      sessionId: "session_alpha",
      worktreePath: root,
      prompt: "你好",
      providerId: "anthropic",
      model: "claude-sonnet-4-6",
      effort: "high",
    });
    const second = await store.submitMessage({
      sessionId: "session_alpha",
      worktreePath: root,
      prompt: "继续",
      providerId: "codex",
      model: "gpt-5.4",
      effort: "medium",
    });

    expect(first.messages).toHaveLength(2);
    expect(first.messages[0]?.role).toBe("user");
    expect(first.messages[1]?.text).toBe("第一次响应");
    expect(second.messages).toHaveLength(4);
    expect(second.messages[3]?.text).toBe("第二次响应");
    expect(runConversation).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        cliSessionId: "22222222-2222-4222-8222-222222222222",
        resume: false,
        worktreePath: root,
        prompt: "你好",
        providerId: "anthropic",
        model: "claude-sonnet-4-6",
        effort: "high",
      }),
    );
    expect(runConversation).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        cliSessionId: "22222222-2222-4222-8222-222222222222",
        resume: true,
        worktreePath: root,
        prompt: "继续",
        providerId: "codex",
        model: "gpt-5.4",
        effort: "medium",
      }),
    );
  });
});
