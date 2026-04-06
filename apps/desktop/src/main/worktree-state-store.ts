import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import type {
  SidebarStateSnapshot,
  WorktreeRecord,
  WorktreeSessionRecord,
} from "../shared/contracts";

interface SidebarIndexFile {
  version: 1;
  worktreeIds: string[];
  activeWorktreeId: string | null;
  activeSessionId: string | null;
}

interface StoredWorktreeFile {
  version: 1;
  id: string;
  label: string;
  sourcePath: string;
  worktreePath: string;
  gitRoot: string | null;
  branch: string | null;
  isGitRepository: boolean;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  lastSessionId: string | null;
}

interface StoredSessionFile {
  version: 1;
  id: string;
  worktreeId: string;
  title: string;
  status: "idle";
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
}

interface GitMetadata {
  gitRoot: string | null;
  branch: string | null;
  isGitRepository: boolean;
}

interface CreateWorktreeStateStoreOptions {
  userDataPath: string;
  appName: string;
  resolveGitMetadata?: (projectPath: string) => GitMetadata;
}

const SIDEBAR_SCHEMA_VERSION = 1;

function createDefaultIndex(): SidebarIndexFile {
  return {
    version: SIDEBAR_SCHEMA_VERSION,
    worktreeIds: [],
    activeWorktreeId: null,
    activeSessionId: null,
  };
}

function safeReadJson<T>(pathname: string, fallback: T): T {
  try {
    if (!existsSync(pathname)) {
      return fallback;
    }

    return JSON.parse(readFileSync(pathname, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(pathname: string, value: unknown) {
  const tempPath = `${pathname}.tmp`;
  writeFileSync(tempPath, JSON.stringify(value, null, 2), "utf8");
  renameSync(tempPath, pathname);
}

function ensureDirectory(pathname: string) {
  mkdirSync(pathname, {
    recursive: true,
  });
}

function isDirectory(pathname: string) {
  try {
    return existsSync(pathname) && statSync(pathname).isDirectory();
  } catch {
    return false;
  }
}

function normalizeDirectory(pathname: string) {
  const resolvedPath = resolve(pathname);
  if (!isDirectory(resolvedPath)) {
    throw new Error(`Project path does not exist: ${resolvedPath}`);
  }

  return resolvedPath;
}

function defaultResolveGitMetadata(projectPath: string): GitMetadata {
  const rootResult = spawnSync("git", ["-C", projectPath, "rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  });

  if (rootResult.status !== 0) {
    return {
      gitRoot: null,
      branch: null,
      isGitRepository: false,
    };
  }

  const gitRoot = rootResult.stdout.trim();
  const branchResult = spawnSync("git", ["-C", gitRoot, "branch", "--show-current"], {
    encoding: "utf8",
  });

  return {
    gitRoot,
    branch: branchResult.status === 0 ? branchResult.stdout.trim() || null : null,
    isGitRepository: true,
  };
}

export function createWorktreeStateStore({
  userDataPath,
  resolveGitMetadata = defaultResolveGitMetadata,
}: CreateWorktreeStateStoreOptions) {
  const storageRoot = join(userDataPath, "sidebar-state");
  const worktreesRoot = join(storageRoot, "worktrees");
  const indexPath = join(storageRoot, "index.json");

  function ensureRoots() {
    ensureDirectory(storageRoot);
    ensureDirectory(worktreesRoot);
  }

  function getWorktreeDirectory(worktreeId: string) {
    return join(worktreesRoot, worktreeId);
  }

  function getWorktreeFilePath(worktreeId: string) {
    return join(getWorktreeDirectory(worktreeId), "worktree.json");
  }

  function getSessionsDirectory(worktreeId: string) {
    return join(getWorktreeDirectory(worktreeId), "sessions");
  }

  function getSessionFilePath(worktreeId: string, sessionId: string) {
    return join(getSessionsDirectory(worktreeId), `${sessionId}.json`);
  }

  function readIndex() {
    ensureRoots();
    const index = safeReadJson(indexPath, createDefaultIndex());
    if (index.version !== SIDEBAR_SCHEMA_VERSION) {
      return createDefaultIndex();
    }

    return index;
  }

  function writeIndex(index: SidebarIndexFile) {
    ensureRoots();
    writeJson(indexPath, index);
  }

  function readStoredWorktree(worktreeId: string): StoredWorktreeFile | null {
    const worktree = safeReadJson<StoredWorktreeFile | null>(getWorktreeFilePath(worktreeId), null);
    if (!(worktree && worktree.version === SIDEBAR_SCHEMA_VERSION)) {
      return null;
    }

    return worktree;
  }

  function writeStoredWorktree(worktree: StoredWorktreeFile) {
    ensureDirectory(getWorktreeDirectory(worktree.id));
    ensureDirectory(getSessionsDirectory(worktree.id));
    writeJson(getWorktreeFilePath(worktree.id), worktree);
  }

  function readStoredSessions(worktreeId: string): StoredSessionFile[] {
    const sessionsDirectory = getSessionsDirectory(worktreeId);
    if (!existsSync(sessionsDirectory)) {
      return [];
    }

    return safeReadJson<string[]>(
      join(sessionsDirectory, ".index.json"),
      [],
    )
      .map((sessionId) =>
        safeReadJson<StoredSessionFile | null>(getSessionFilePath(worktreeId, sessionId), null),
      )
      .filter((session): session is StoredSessionFile => {
        return Boolean(session && session.version === SIDEBAR_SCHEMA_VERSION);
      });
  }

  function writeStoredSession(session: StoredSessionFile) {
    const sessionsDirectory = getSessionsDirectory(session.worktreeId);
    ensureDirectory(sessionsDirectory);
    writeJson(getSessionFilePath(session.worktreeId, session.id), session);

    const sessionIds = readStoredSessions(session.worktreeId)
      .map((entry) => entry.id)
      .filter((entry) => entry !== session.id);
    writeJson(join(sessionsDirectory, ".index.json"), [session.id, ...sessionIds]);
  }

  function deleteStoredSession(worktreeId: string, sessionId: string) {
    rmSync(getSessionFilePath(worktreeId, sessionId), {
      force: true,
    });

    const sessionsDirectory = getSessionsDirectory(worktreeId);
    if (!existsSync(sessionsDirectory)) {
      return;
    }

    const remainingSessionIds = safeReadJson<string[]>(join(sessionsDirectory, ".index.json"), []).filter(
      (entry) => entry !== sessionId,
    );
    writeJson(join(sessionsDirectory, ".index.json"), remainingSessionIds);
  }

  function toSessionRecord(worktreeId: string, session: StoredSessionFile): WorktreeSessionRecord {
    return {
      ...session,
      worktreeId,
      storagePath: getSessionFilePath(worktreeId, session.id),
    };
  }

  function toWorktreeRecord(worktree: StoredWorktreeFile, sessions: StoredSessionFile[]): WorktreeRecord {
    return {
      ...worktree,
      storagePath: getWorktreeDirectory(worktree.id),
      sessions: [...sessions]
        .sort((left, right) => {
          return new Date(right.lastOpenedAt).getTime() - new Date(left.lastOpenedAt).getTime();
        })
        .map((session) => toSessionRecord(worktree.id, session)),
    };
  }

  function sanitizeIndex(index: SidebarIndexFile, worktrees: WorktreeRecord[]) {
    const nextIndex = {
      ...index,
      worktreeIds: worktrees.map((worktree) => worktree.id),
    };

    const activeWorktreeId = worktrees.some((worktree) => worktree.id === index.activeWorktreeId)
      ? index.activeWorktreeId
      : (worktrees[0]?.id ?? null);
    const activeWorktree = worktrees.find((worktree) => worktree.id === activeWorktreeId) ?? null;
    const activeSessionId =
      activeWorktree?.sessions.some((session) => session.id === index.activeSessionId)
        ? index.activeSessionId
        : activeWorktree?.lastSessionId ?? activeWorktree?.sessions[0]?.id ?? null;

    nextIndex.activeWorktreeId = activeWorktreeId;
    nextIndex.activeSessionId = activeSessionId;
    return nextIndex;
  }

  function getSnapshot(): SidebarStateSnapshot {
    ensureRoots();
    const index = readIndex();
    const worktrees = index.worktreeIds
      .map((worktreeId) => {
        const storedWorktree = readStoredWorktree(worktreeId);
        if (!storedWorktree) {
          return null;
        }

        return toWorktreeRecord(storedWorktree, readStoredSessions(worktreeId));
      })
      .filter((worktree): worktree is WorktreeRecord => worktree !== null)
      .sort((left, right) => {
        return new Date(right.lastOpenedAt).getTime() - new Date(left.lastOpenedAt).getTime();
      });

    const sanitizedIndex = sanitizeIndex(index, worktrees);
    if (JSON.stringify(index) !== JSON.stringify(sanitizedIndex)) {
      writeIndex(sanitizedIndex);
    }

    return {
      worktrees,
      activeWorktreeId: sanitizedIndex.activeWorktreeId,
      activeSessionId: sanitizedIndex.activeSessionId,
      storageRoot,
    };
  }

  function getActiveWorktreePath(): string | null {
    const snapshot = getSnapshot();
    const activeWorktree =
      snapshot.worktrees.find((worktree) => worktree.id === snapshot.activeWorktreeId) ?? null;

    return activeWorktree?.worktreePath ?? null;
  }

  function createWorktreeId(worktreePath: string) {
    return createHash("sha1").update(worktreePath).digest("hex").slice(0, 12);
  }

  function buildDefaultSessionTitle() {
    return "新线程";
  }

  function openWorktree(projectPath: string) {
    ensureRoots();
    const sourcePath = normalizeDirectory(projectPath);
    const gitMetadata = resolveGitMetadata(sourcePath);
    const worktreePath = gitMetadata.gitRoot ?? sourcePath;
    const worktreeId = createWorktreeId(worktreePath);
    const now = new Date().toISOString();
    const existing = readStoredWorktree(worktreeId);
    const sessions = readStoredSessions(worktreeId);

    writeStoredWorktree({
      version: SIDEBAR_SCHEMA_VERSION,
      id: worktreeId,
      label: basename(worktreePath),
      sourcePath,
      worktreePath,
      gitRoot: gitMetadata.gitRoot,
      branch: gitMetadata.branch,
      isGitRepository: gitMetadata.isGitRepository,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      lastOpenedAt: now,
      lastSessionId: existing?.lastSessionId ?? sessions[0]?.id ?? null,
    });

    const index = readIndex();
    writeIndex({
      ...index,
      worktreeIds: [worktreeId, ...index.worktreeIds.filter((entry) => entry !== worktreeId)],
      activeWorktreeId: worktreeId,
      activeSessionId: existing?.lastSessionId ?? sessions[0]?.id ?? null,
    });

    return getSnapshot();
  }

  function selectWorktree(worktreeId: string) {
    const worktree = readStoredWorktree(worktreeId);
    if (!worktree) {
      throw new Error(`Unknown worktree: ${worktreeId}`);
    }

    const sessions = readStoredSessions(worktreeId).sort((left, right) => {
      return new Date(right.lastOpenedAt).getTime() - new Date(left.lastOpenedAt).getTime();
    });
    const activeSessionId = worktree.lastSessionId ?? sessions[0]?.id ?? null;
    const now = new Date().toISOString();

    writeStoredWorktree({
      ...worktree,
      lastOpenedAt: now,
    });

    const index = readIndex();
    writeIndex({
      ...index,
      activeWorktreeId: worktreeId,
      activeSessionId,
    });

    return getSnapshot();
  }

  function createSession(worktreeId: string, title: string | null = null) {
    const worktree = readStoredWorktree(worktreeId);
    if (!worktree) {
      throw new Error(`Unknown worktree: ${worktreeId}`);
    }

    const sessions = readStoredSessions(worktreeId);
    const now = new Date().toISOString();
    const sessionId = `session_${randomUUID()}`;

    writeStoredSession({
      version: SIDEBAR_SCHEMA_VERSION,
      id: sessionId,
      worktreeId,
      title: title?.trim() || buildDefaultSessionTitle(),
      status: "idle",
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
    });

    writeStoredWorktree({
      ...worktree,
      updatedAt: now,
      lastOpenedAt: now,
      lastSessionId: sessionId,
    });

    const index = readIndex();
    writeIndex({
      ...index,
      activeWorktreeId: worktreeId,
      activeSessionId: sessionId,
    });

    return getSnapshot();
  }

  function prepareSession(worktreeId: string) {
    const worktree = readStoredWorktree(worktreeId);
    if (!worktree) {
      throw new Error(`Unknown worktree: ${worktreeId}`);
    }

    const now = new Date().toISOString();
    writeStoredWorktree({
      ...worktree,
      updatedAt: now,
      lastOpenedAt: now,
    });

    const index = readIndex();
    writeIndex({
      ...index,
      activeWorktreeId: worktreeId,
      activeSessionId: null,
    });

    return getSnapshot();
  }

  function selectSession(worktreeId: string, sessionId: string) {
    const worktree = readStoredWorktree(worktreeId);
    if (!worktree) {
      throw new Error(`Unknown worktree: ${worktreeId}`);
    }

    const session = readStoredSessions(worktreeId).find((entry) => entry.id === sessionId);
    if (!session) {
      throw new Error(`Unknown session: ${sessionId}`);
    }

    const now = new Date().toISOString();
    writeStoredSession({
      ...session,
      lastOpenedAt: now,
    });

    writeStoredWorktree({
      ...worktree,
      updatedAt: now,
      lastOpenedAt: now,
      lastSessionId: sessionId,
    });

    const index = readIndex();
    writeIndex({
      ...index,
      activeWorktreeId: worktreeId,
      activeSessionId: sessionId,
    });

    return getSnapshot();
  }

  function removeSession(worktreeId: string, sessionId: string) {
    const worktree = readStoredWorktree(worktreeId);
    if (!worktree) {
      throw new Error(`Unknown worktree: ${worktreeId}`);
    }

    deleteStoredSession(worktreeId, sessionId);
    const remainingSessions = readStoredSessions(worktreeId).sort((left, right) => {
      return new Date(right.lastOpenedAt).getTime() - new Date(left.lastOpenedAt).getTime();
    });
    const nextSessionId = remainingSessions[0]?.id ?? null;
    const now = new Date().toISOString();

    writeStoredWorktree({
      ...worktree,
      updatedAt: now,
      lastOpenedAt: now,
      lastSessionId: nextSessionId,
    });

    const index = readIndex();
    writeIndex({
      ...index,
      activeWorktreeId: worktreeId,
      activeSessionId: index.activeSessionId === sessionId ? nextSessionId : index.activeSessionId,
    });

    return getSnapshot();
  }

  function removeWorktree(worktreeId: string) {
    rmSync(getWorktreeDirectory(worktreeId), {
      force: true,
      recursive: true,
    });

    const index = readIndex();
    const remainingWorktreeIds = index.worktreeIds.filter((entry) => entry !== worktreeId);
    writeIndex({
      ...index,
      worktreeIds: remainingWorktreeIds,
      activeWorktreeId: index.activeWorktreeId === worktreeId ? null : index.activeWorktreeId,
      activeSessionId:
        index.activeWorktreeId === worktreeId ? null : index.activeSessionId,
    });

    return getSnapshot();
  }

  return {
    getSnapshot,
    getActiveWorktreePath,
    openWorktree,
    selectWorktree,
    prepareSession,
    createSession,
    selectSession,
    removeSession,
    removeWorktree,
    getStorageRoot: () => storageRoot,
  };
}
