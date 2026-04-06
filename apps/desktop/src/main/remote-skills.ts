import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import type { RemoteSkillCatalog, RemoteSkillRecord } from "../shared/contracts";

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com";
const REMOTE_OWNER = "anthropics";
const REMOTE_REPO = "skills";
const REMOTE_REF = "main";
const REMOTE_SKILLS_ROOT = "skills";
const CATALOG_CACHE_TTL_MS = 10 * 60 * 1000;

type GitHubTreeEntry = {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
};

type GitHubTreeResponse = {
  sha: string;
  tree: GitHubTreeEntry[];
  truncated: boolean;
};

type CatalogCache = {
  expiresAt: number;
  value: RemoteSkillCatalog;
  tree: GitHubTreeEntry[];
};

let catalogCache: CatalogCache | null = null;

function normalizeFrontmatterKey(key: string): string {
  return key.trim().toLowerCase().replaceAll("_", "-");
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseFrontmatter(content: string): Record<string, string | boolean> {
  if (!content.startsWith("---\n")) {
    return {};
  }

  const lines = content.split("\n");
  const data: Record<string, string | boolean> = {};
  let index = 1;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (line.trim() === "---") {
      return data;
    }

    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) {
      index += 1;
      continue;
    }

    const key = normalizeFrontmatterKey(match[1] ?? "");
    const rawValue = match[2] ?? "";
    if (rawValue === ">" || rawValue === "|") {
      index += 1;
      const blockLines: string[] = [];
      while (index < lines.length) {
        const nextLine = lines[index] ?? "";
        if (nextLine.startsWith("  ") || nextLine.startsWith("\t")) {
          blockLines.push(nextLine.replace(/^(  |\t)/, ""));
          index += 1;
          continue;
        }
        if (nextLine.trim().length === 0) {
          blockLines.push("");
          index += 1;
          continue;
        }
        break;
      }

      data[key] = blockLines.join(rawValue === ">" ? " " : "\n").trim();
      continue;
    }

    const cleanedValue = stripQuotes(rawValue);
    data[key] =
      cleanedValue === "true" || cleanedValue === "false"
        ? cleanedValue === "true"
        : cleanedValue;
    index += 1;
  }

  return data;
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function extractDescriptionFromBody(content: string): string {
  const body = content.startsWith("---\n")
    ? content.replace(/^---\n[\s\S]*?\n---\n?/, "")
    : content;

  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  return lines[0] ?? "";
}

function parseRemoteSkillRecord(filePath: string, content: string): RemoteSkillRecord {
  const skillName = basename(dirname(filePath));
  const frontmatter = parseFrontmatter(content);

  return {
    id: skillName,
    name: toStringValue(frontmatter.name) ?? skillName,
    description:
      toStringValue(frontmatter.description) ?? extractDescriptionFromBody(content),
    sourceLabel: "Anthropic & Partners",
    providerLabel: "Anthropic",
  };
}

async function fetchGitHubJson<T>(pathname: string): Promise<T> {
  const token = process.env.GITHUB_TOKEN?.trim();
  const response = await fetch(`${GITHUB_API_BASE}${pathname}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "RWork Desktop",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw await buildGitHubRequestError(response);
  }

  return (await response.json()) as T;
}

async function buildGitHubRequestError(response: Response) {
  if (response.status === 403 || response.status === 429) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    const resetAt = response.headers.get("x-ratelimit-reset");
    const resetSuffix =
      resetAt && !Number.isNaN(Number(resetAt))
        ? `，可在 ${new Date(Number(resetAt) * 1000).toLocaleString("zh-CN")} 后重试`
        : "";

    if (remaining === "0" || response.status === 429) {
      return new Error(
        `GitHub API 限流，请稍后重试或配置 GITHUB_TOKEN${resetSuffix}。`,
      );
    }
  }

  return new Error(`GitHub 请求失败：${response.status}`);
}

function buildRawContentUrl(pathname: string) {
  return `${GITHUB_RAW_BASE}/${REMOTE_OWNER}/${REMOTE_REPO}/${REMOTE_REF}/${pathname}`;
}

async function fetchRawContentText(pathname: string): Promise<string> {
  const response = await fetch(buildRawContentUrl(pathname), {
    headers: {
      "User-Agent": "RWork Desktop",
    },
  });

  if (!response.ok) {
    throw new Error(`远程 Skill 内容获取失败：${response.status}`);
  }

  return response.text();
}

async function fetchRawContentBuffer(pathname: string): Promise<Buffer> {
  const response = await fetch(buildRawContentUrl(pathname), {
    headers: {
      "User-Agent": "RWork Desktop",
    },
  });

  if (!response.ok) {
    throw new Error(`远程 Skill 文件获取失败：${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function loadRemoteTree(): Promise<GitHubTreeEntry[]> {
  const response = await fetchGitHubJson<GitHubTreeResponse>(
    `/repos/${REMOTE_OWNER}/${REMOTE_REPO}/git/trees/${REMOTE_REF}?recursive=1`,
  );

  if (response.truncated) {
    throw new Error("GitHub skills 目录结果过大，当前无法完整读取。");
  }

  return response.tree;
}

export async function getRemoteSkillCatalog(): Promise<RemoteSkillCatalog> {
  if (catalogCache && catalogCache.expiresAt > Date.now()) {
    return catalogCache.value;
  }

  const tree = await loadRemoteTree();
  const skillMdEntries = tree.filter(
    (entry) =>
      entry.type === "blob" &&
      /^skills\/[^/]+\/SKILL\.md$/.test(entry.path),
  );

  const skills = (
    await Promise.all(
      skillMdEntries.map(async (entry) =>
        parseRemoteSkillRecord(entry.path, await fetchRawContentText(entry.path)),
      ),
    )
  ).sort((left, right) => left.name.localeCompare(right.name));

  const value = {
    skills,
    fetchedAt: new Date().toISOString(),
  };

  catalogCache = {
    expiresAt: Date.now() + CATALOG_CACHE_TTL_MS,
    value,
    tree,
  };

  return value;
}

async function getCatalogTree() {
  if (!catalogCache || catalogCache.expiresAt <= Date.now()) {
    await getRemoteSkillCatalog();
  }

  return catalogCache?.tree ?? [];
}

export async function installRemoteSkill(
  skillId: string,
  destinationRoot: string,
  overwrite = false,
) {
  const tree = await getCatalogTree();
  const prefix = `${REMOTE_SKILLS_ROOT}/${skillId}/`;
  const entries = tree.filter(
    (entry) => entry.type === "blob" && entry.path.startsWith(prefix),
  );

  if (entries.length === 0) {
    throw new Error("未找到目标远程 Skill。");
  }

  const targetRoot = join(destinationRoot, skillId);
  const existing = await stat(targetRoot).catch(() => null);
  if (existing && !overwrite) {
    throw new Error(`Skill ${skillId} 已存在。`);
  }

  if (existing) {
    await rm(targetRoot, { recursive: true, force: true });
  }

  await mkdir(targetRoot, { recursive: true });

  await Promise.all(
    entries.map(async (entry) => {
      const relativePath = entry.path.slice(prefix.length);
      const targetPath = join(targetRoot, relativePath);
      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, await fetchRawContentBuffer(entry.path));
    }),
  );

  return {
    skillRoot: targetRoot,
    overwritten: Boolean(existing),
  };
}

export function __resetRemoteSkillCatalogCacheForTests() {
  catalogCache = null;
}

export function parseRemoteSkillRecordForTests(filePath: string, content: string) {
  return parseRemoteSkillRecord(filePath, content);
}
