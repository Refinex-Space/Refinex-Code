import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  DesktopGuiConversationMessage,
  DesktopGuiConversationSendInput,
  DesktopGuiConversationSnapshot,
} from "../shared/contracts";

interface StoredGuiConversationSnapshot extends DesktopGuiConversationSnapshot {
  version: 1;
  cliSessionId: string;
}

interface GuiConversationRunnerInput {
  cliSessionId: string;
  resume: boolean;
  worktreePath: string;
  prompt: string;
  providerId: DesktopGuiConversationSendInput["providerId"];
  model: string;
  effort: DesktopGuiConversationSendInput["effort"];
}

interface GuiConversationRunnerResult {
  outputText: string;
  isError: boolean;
}

interface CreateGuiConversationStoreOptions {
  userDataPath: string;
  runConversation: (
    input: GuiConversationRunnerInput,
  ) => Promise<GuiConversationRunnerResult>;
  createCliSessionId?: () => string;
  now?: () => Date;
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

function toPublicSnapshot(
  snapshot: StoredGuiConversationSnapshot,
): DesktopGuiConversationSnapshot {
  return {
    sessionId: snapshot.sessionId,
    messages: snapshot.messages,
    updatedAt: snapshot.updatedAt,
  };
}

function recoverPendingMessages(
  snapshot: StoredGuiConversationSnapshot,
): StoredGuiConversationSnapshot {
  let changed = false;
  const messages = snapshot.messages.map((message) => {
    if (message.status !== "pending") {
      return message;
    }

    changed = true;
    return {
      ...message,
      status: "error" as const,
      text: message.text.trim() || "上一次 GUI 请求未完成。",
    };
  });

  if (!changed) {
    return snapshot;
  }

  return {
    ...snapshot,
    messages,
    updatedAt: new Date().toISOString(),
  };
}

export function createGuiConversationStore({
  userDataPath,
  runConversation,
  createCliSessionId = () => randomUUID(),
  now = () => new Date(),
}: CreateGuiConversationStoreOptions) {
  const storageRoot = join(userDataPath, "gui-conversations");
  const inFlightSessions = new Set<string>();

  function getConversationPath(sessionId: string) {
    return join(storageRoot, `${sessionId}.json`);
  }

  function createEmptySnapshot(sessionId: string): StoredGuiConversationSnapshot {
    const createdAt = now().toISOString();
    return {
      version: 1,
      sessionId,
      cliSessionId: createCliSessionId(),
      messages: [],
      updatedAt: createdAt,
    };
  }

  function readSnapshot(sessionId: string): StoredGuiConversationSnapshot {
    ensureDirectory(storageRoot);
    const pathname = getConversationPath(sessionId);
    const snapshot = safeReadJson<StoredGuiConversationSnapshot | null>(
      pathname,
      null,
    );
    const hydrated =
      snapshot && snapshot.version === 1 && snapshot.sessionId === sessionId
        ? snapshot
        : createEmptySnapshot(sessionId);
    const repaired = recoverPendingMessages(hydrated);

    if (repaired !== hydrated || !snapshot) {
      writeJson(pathname, repaired);
    }

    return repaired;
  }

  function writeSnapshot(snapshot: StoredGuiConversationSnapshot) {
    writeJson(getConversationPath(snapshot.sessionId), snapshot);
  }

  function createMessage(
    input: Pick<
      DesktopGuiConversationMessage,
      "role" | "text" | "status" | "providerId" | "model" | "effort"
    >,
  ): DesktopGuiConversationMessage {
    return {
      id: randomUUID(),
      createdAt: now().toISOString(),
      ...input,
    };
  }

  async function submitMessage(
    input: DesktopGuiConversationSendInput,
  ): Promise<DesktopGuiConversationSnapshot> {
    const prompt = input.prompt.trim();
    if (!prompt) {
      throw new Error("Prompt is required.");
    }

    if (inFlightSessions.has(input.sessionId)) {
      throw new Error("当前线程已有正在进行的 GUI 请求。");
    }

    inFlightSessions.add(input.sessionId);
    const snapshot = readSnapshot(input.sessionId);
    const nextSnapshot: StoredGuiConversationSnapshot = {
      ...snapshot,
      messages: [
        ...snapshot.messages,
        createMessage({
          role: "user",
          text: prompt,
          status: "completed",
          providerId: input.providerId,
          model: input.model,
          effort: input.effort,
        }),
        createMessage({
          role: "assistant",
          text: "",
          status: "pending",
          providerId: input.providerId,
          model: input.model,
          effort: input.effort,
        }),
      ],
      updatedAt: now().toISOString(),
    };
    writeSnapshot(nextSnapshot);

    try {
      const result = await runConversation({
        cliSessionId: snapshot.cliSessionId,
        resume: snapshot.messages.length > 0,
        worktreePath: input.worktreePath,
        prompt,
        providerId: input.providerId,
        model: input.model,
        effort: input.effort,
      });

      const assistantIndex = nextSnapshot.messages.length - 1;
      const settledSnapshot: StoredGuiConversationSnapshot = {
        ...nextSnapshot,
        messages: nextSnapshot.messages.map((message, index) =>
          index === assistantIndex
            ? {
                ...message,
                status: result.isError ? "error" : "completed",
                text: result.outputText,
              }
            : message,
        ),
        updatedAt: now().toISOString(),
      };
      writeSnapshot(settledSnapshot);
      return toPublicSnapshot(settledSnapshot);
    } catch (error) {
      const assistantIndex = nextSnapshot.messages.length - 1;
      const settledSnapshot: StoredGuiConversationSnapshot = {
        ...nextSnapshot,
        messages: nextSnapshot.messages.map((message, index) =>
          index === assistantIndex
            ? {
                ...message,
                status: "error",
                text:
                  error instanceof Error
                    ? error.message
                    : "GUI 对话请求失败。",
              }
            : message,
        ),
        updatedAt: now().toISOString(),
      };
      writeSnapshot(settledSnapshot);
      return toPublicSnapshot(settledSnapshot);
    } finally {
      inFlightSessions.delete(input.sessionId);
    }
  }

  function getSnapshot(sessionId: string): DesktopGuiConversationSnapshot {
    return toPublicSnapshot(readSnapshot(sessionId));
  }

  function deleteConversation(sessionId: string) {
    const pathname = getConversationPath(sessionId);
    if (!existsSync(pathname)) {
      return;
    }

    rmSync(pathname, {
      force: true,
    });
  }

  return {
    getSnapshot,
    submitMessage,
    deleteConversation,
  };
}
