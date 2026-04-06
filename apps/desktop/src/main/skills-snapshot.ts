import { createHash } from "node:crypto";
import { lstat, readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, isAbsolute, join, relative, resolve } from "node:path";
import type {
  SkillFilePreview,
  SkillRecord,
  SkillSnapshot,
  SkillSourceKind,
  SkillTreeNode,
} from "../shared/contracts";

const MAX_PREVIEW_BYTES = 128 * 1024;
const IGNORED_ENTRY_NAMES = new Set([".DS_Store", ".git", ".hg", ".svn"]);

type SkillScanSource = {
  kind: SkillSourceKind;
  label: string;
  addedBy: string;
  pluginName?: string;
};

type PluginSkillSource = {
  pluginName: string;
  pluginDisplayName: string;
  roots: string[];
};

type BuilderSkillSource = SkillScanSource & {
  rootPath: string;
  resolveName: (skillDirName: string) => string;
};

type BuildDesktopSkillSnapshotOptions = {
  activeWorktreePath: string | null;
  personalSkillRoots: string[];
  projectSkillRoot: string | null;
  pluginSources: PluginSkillSource[];
};

type ParsedFrontmatterFields = {
  displayName?: string;
  description: string;
  whenToUse?: string;
  version?: string;
  userInvocable: boolean;
  disableModelInvocation: boolean;
};

type PluginInstallationV1 = {
  installPath?: string;
};

type PluginInstallationV2 = {
  scope?: string;
  projectPath?: string;
  installPath?: string;
};

type InstalledPluginsFile =
  | {
      version?: 1;
      plugins?: Record<string, PluginInstallationV1>;
    }
  | {
      version: 2;
      plugins?: Record<string, PluginInstallationV2[]>;
    };

function inferLanguage(filePath: string): string | null {
  const extension = extname(filePath).toLowerCase();

  switch (extension) {
    case ".md":
    case ".markdown":
      return "markdown";
    case ".ts":
    case ".tsx":
      return "typescript";
    case ".js":
    case ".jsx":
    case ".mjs":
    case ".cjs":
      return "javascript";
    case ".json":
      return "json";
    case ".toml":
      return "toml";
    case ".yaml":
    case ".yml":
      return "yaml";
    case ".sh":
    case ".zsh":
    case ".bash":
      return "bash";
    case ".py":
      return "python";
    case ".txt":
      return "text";
    default:
      return basename(filePath).toLowerCase() === "skill.md" ? "markdown" : null;
  }
}

function isMarkdownFile(filePath: string): boolean {
  const extension = extname(filePath).toLowerCase();
  return (
    extension === ".md" ||
    extension === ".markdown" ||
    basename(filePath).toLowerCase() === "skill.md"
  );
}

function isProbablyText(content: Buffer): boolean {
  if (content.includes(0)) {
    return false;
  }

  let controlCount = 0;
  const sample = content.subarray(0, Math.min(content.length, 1024));
  for (const byte of sample) {
    if (byte < 7 || (byte > 13 && byte < 32)) {
      controlCount += 1;
    }
  }

  return controlCount < sample.length * 0.1;
}

function normalizePath(targetPath: string): string {
  return resolve(targetPath);
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await lstat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function isDirectoryLike(targetPath: string): Promise<boolean> {
  try {
    return (await lstat(targetPath)).isDirectory();
  } catch {
    return false;
  }
}

async function isRegularFile(targetPath: string): Promise<boolean> {
  try {
    return (await lstat(targetPath)).isFile();
  } catch {
    return false;
  }
}

function hashId(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 10);
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toBooleanValue(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return fallback;
}

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

function parseFrontmatter(content: string): {
  data: Record<string, string | boolean>;
  body: string;
} {
  if (!content.startsWith("---\n")) {
    return {
      data: {},
      body: content,
    };
  }

  const lines = content.split("\n");
  const data: Record<string, string | boolean> = {};
  let index = 1;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (line.trim() === "---") {
      return {
        data,
        body: lines.slice(index + 1).join("\n"),
      };
    }

    if (line.trim().length === 0) {
      index += 1;
      continue;
    }

    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) {
      index += 1;
      continue;
    }

    const rawKey = match[1];
    const rawValue = match[2] ?? "";
    const key = normalizeFrontmatterKey(rawKey);

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
    if (cleanedValue === "true" || cleanedValue === "false") {
      data[key] = cleanedValue === "true";
    } else {
      data[key] = cleanedValue;
    }
    index += 1;
  }

  return {
    data,
    body: content,
  };
}

function extractDescriptionFromBody(body: string): string {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  return lines[0] ?? "";
}

function parseSkillFrontmatterFields(
  content: string,
  fallbackDisplayName: string,
): ParsedFrontmatterFields {
  const { data, body } = parseFrontmatter(content);
  const description =
    toStringValue(data.description) ?? extractDescriptionFromBody(body);

  return {
    displayName:
      toStringValue(data.name) ??
      toStringValue(data["display-name"]) ??
      fallbackDisplayName,
    description,
    whenToUse:
      toStringValue(data["when-to-use"]) ??
      toStringValue(data.whentouse) ??
      undefined,
    version: toStringValue(data.version),
    userInvocable: toBooleanValue(data["user-invocable"], true),
    disableModelInvocation: toBooleanValue(
      data["disable-model-invocation"],
      false,
    ),
  };
}

function sortTreeEntries(a: SkillTreeNode, b: SkillTreeNode): number {
  if (a.name === "SKILL.md") return -1;
  if (b.name === "SKILL.md") return 1;
  if (a.type !== b.type) {
    return a.type === "directory" ? -1 : 1;
  }
  return a.name.localeCompare(b.name);
}

async function buildSkillTree(
  targetDir: string,
  skillRoot: string,
): Promise<SkillTreeNode[]> {
  const entries = await readdir(targetDir, { withFileTypes: true });
  const nodes = await Promise.all(
    entries.map(async (entry): Promise<SkillTreeNode | null> => {
      if (IGNORED_ENTRY_NAMES.has(entry.name)) {
        return null;
      }

      const fullPath = join(targetDir, entry.name);
      const relativePath = relative(skillRoot, fullPath) || entry.name;

      if (entry.isDirectory()) {
        const children = await buildSkillTree(fullPath, skillRoot);
        return {
          id: relativePath,
          name: entry.name,
          path: fullPath,
          relativePath,
          type: "directory",
          children,
        };
      }

      if (!entry.isFile()) {
        return null;
      }

      return {
        id: relativePath,
        name: entry.name,
        path: fullPath,
        relativePath,
        type: "file",
      };
    }),
  );

  return nodes.filter((node): node is SkillTreeNode => node !== null).sort(sortTreeEntries);
}

function buildInvokedBy(
  userInvocable: boolean,
  disableModelInvocation: boolean,
): string {
  if (!userInvocable) {
    return "RWork";
  }

  return disableModelInvocation ? "User" : "User or RWork";
}

async function buildSkillRecord(
  skillRoot: string,
  source: SkillScanSource,
  resolvedName: string,
): Promise<SkillRecord | null> {
  const skillMdPath = join(skillRoot, "SKILL.md");
  if (!(await isRegularFile(skillMdPath))) {
    return null;
  }

  try {
    const content = await readFile(skillMdPath, "utf8");
    const parsedFrontmatter = parseSkillFrontmatterFields(
      content,
      basename(skillRoot),
    );
    const skillStats = await stat(skillMdPath);
    const tree = await buildSkillTree(skillRoot, skillRoot);

    return {
      id: `${source.kind}:${resolvedName}:${hashId(skillRoot)}`,
      name: resolvedName,
      displayName: parsedFrontmatter.displayName ?? basename(skillRoot),
      sourceKind: source.kind,
      sourceLabel: source.label,
      pluginName: source.pluginName,
      skillRoot,
      skillMdPath,
      description: parsedFrontmatter.description,
      whenToUse: parsedFrontmatter.whenToUse,
      version: parsedFrontmatter.version,
      userInvocable: parsedFrontmatter.userInvocable,
      disableModelInvocation: parsedFrontmatter.disableModelInvocation,
      invokedBy: buildInvokedBy(
        parsedFrontmatter.userInvocable,
        parsedFrontmatter.disableModelInvocation,
      ),
      addedBy: source.addedBy,
      lastUpdated: skillStats.mtime.toISOString(),
      tree,
    };
  } catch {
    return null;
  }
}

async function collectSkillRecordsFromRoot(
  source: BuilderSkillSource,
): Promise<SkillRecord[]> {
  if (!(await pathExists(source.rootPath))) {
    return [];
  }

  const directSkillPath = join(source.rootPath, "SKILL.md");
  if (await isRegularFile(directSkillPath)) {
    const directSkill = await buildSkillRecord(
      source.rootPath,
      source,
      source.resolveName(basename(source.rootPath)),
    );
    return directSkill ? [directSkill] : [];
  }

  const entries = await readdir(source.rootPath, { withFileTypes: true });
  const skills = await Promise.all(
    entries.map(async (entry) => {
      if (IGNORED_ENTRY_NAMES.has(entry.name) || !entry.isDirectory()) {
        return null;
      }

      const skillRoot = join(source.rootPath, entry.name);
      if (!(await isRegularFile(join(skillRoot, "SKILL.md")))) {
        return null;
      }

      return buildSkillRecord(
        skillRoot,
        source,
        source.resolveName(entry.name),
      );
    }),
  );

  return skills.filter((skill): skill is SkillRecord => skill !== null);
}

export async function buildDesktopSkillSnapshot({
  activeWorktreePath,
  personalSkillRoots,
  projectSkillRoot,
  pluginSources,
}: BuildDesktopSkillSnapshotOptions): Promise<SkillSnapshot> {
  const personalSources = personalSkillRoots.map<BuilderSkillSource>((rootPath) => ({
    kind: "personal",
    label: "Personal skills",
    addedBy: "User",
    rootPath,
    resolveName: (skillDirName) => skillDirName,
  }));

  const projectSources =
    projectSkillRoot === null
      ? []
      : [
          {
            kind: "project" as const,
            label: "Project skills",
            addedBy: "Project",
            rootPath: projectSkillRoot,
            resolveName: (skillDirName: string) => skillDirName,
          },
        ];

  const pluginSkillSources = pluginSources.flatMap<BuilderSkillSource>((pluginSource) =>
    pluginSource.roots.map((rootPath) => ({
      kind: "plugin" as const,
      label: "Plugin skills",
      addedBy: pluginSource.pluginDisplayName,
      pluginName: pluginSource.pluginDisplayName,
      rootPath,
      resolveName: (skillDirName: string) =>
        `${pluginSource.pluginName}:${skillDirName}`,
    })),
  );

  const allSources = [...personalSources, ...projectSources, ...pluginSkillSources];
  const records = (
    await Promise.all(allSources.map((source) => collectSkillRecordsFromRoot(source)))
  )
    .flat()
    .sort((a, b) => {
      const sourceOrder =
        (a.sourceKind === "personal" ? 0 : a.sourceKind === "project" ? 1 : 2) -
        (b.sourceKind === "personal" ? 0 : b.sourceKind === "project" ? 1 : 2);

      if (sourceOrder !== 0) {
        return sourceOrder;
      }

      return a.displayName.localeCompare(b.displayName);
    });

  return {
    skills: records,
    activeWorktreePath,
    generatedAt: new Date().toISOString(),
  };
}

export function getDefaultPersonalSkillRoots(): string[] {
  const home = homedir();
  const claudeConfigDir =
    process.env.CLAUDE_CONFIG_DIR ?? join(home, ".claude");

  return [...new Set([
    join(home, ".agents", "skills"),
    join(claudeConfigDir, "skills"),
  ].map(normalizePath))];
}

function getInstalledPluginsFilePath(): string {
  const home = homedir();
  const claudeConfigDir =
    process.env.CLAUDE_CONFIG_DIR ?? join(home, ".claude");
  return join(claudeConfigDir, "plugins", "installed_plugins.json");
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function parsePluginName(pluginId: string): string {
  return pluginId.split("@")[0] ?? pluginId;
}

async function readPluginManifest(installPath: string): Promise<{
  displayName: string;
  skillPaths: string[];
}> {
  const candidates = [
    join(installPath, ".claude-plugin", "plugin.json"),
    join(installPath, "plugin.json"),
  ];

  for (const candidate of candidates) {
    const manifest = await readJsonFile<Record<string, unknown>>(candidate);
    if (!manifest) {
      continue;
    }

    const rawSkillPaths = Array.isArray(manifest.skills)
      ? manifest.skills
      : manifest.skills
        ? [manifest.skills]
        : [];

    const skillPaths = rawSkillPaths
      .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
      .map((entry) => (isAbsolute(entry) ? entry : resolve(installPath, entry)));

    return {
      displayName: toStringValue(manifest.name) ?? basename(installPath),
      skillPaths,
    };
  }

  return {
    displayName: basename(installPath),
    skillPaths: [],
  };
}

function shouldIncludePluginInstallation(
  installation: PluginInstallationV2,
  activeWorktreePath: string,
): boolean {
  const scope = installation.scope;
  if (scope === "user" || scope === "managed" || scope === undefined) {
    return true;
  }

  if (scope === "project" || scope === "local") {
    return installation.projectPath
      ? normalizePath(installation.projectPath) === normalizePath(activeWorktreePath)
      : false;
  }

  return false;
}

async function getPluginSources(
  activeWorktreePath: string | null,
): Promise<PluginSkillSource[]> {
  if (!activeWorktreePath) {
    return [];
  }

  const installedPluginsFilePath = getInstalledPluginsFilePath();
  const installedPlugins = await readJsonFile<InstalledPluginsFile>(
    installedPluginsFilePath,
  );
  if (!installedPlugins?.plugins) {
    return [];
  }

  const sources: PluginSkillSource[] = [];
  const seenRoots = new Set<string>();

  for (const [pluginId, entry] of Object.entries(installedPlugins.plugins)) {
    const installations =
      installedPlugins.version === 2
        ? (Array.isArray(entry) ? entry : []).filter((installation) =>
            shouldIncludePluginInstallation(installation, activeWorktreePath),
          )
        : entry && typeof entry === "object"
          ? [entry as PluginInstallationV1]
          : [];

    for (const installation of installations) {
      const installPath = installation.installPath;
      if (!(installPath && (await isDirectoryLike(installPath)))) {
        continue;
      }

      const manifest = await readPluginManifest(installPath);
      const candidateRoots = [
        join(installPath, "skills"),
        ...manifest.skillPaths,
      ]
        .map(normalizePath)
        .filter((rootPath, index, list) => list.indexOf(rootPath) === index);

      const roots: string[] = [];
      for (const rootPath of candidateRoots) {
        if (!(await isDirectoryLike(rootPath))) {
          continue;
        }
        if (seenRoots.has(rootPath)) {
          continue;
        }

        seenRoots.add(rootPath);
        roots.push(rootPath);
      }

      if (roots.length === 0) {
        continue;
      }

      sources.push({
        pluginName: parsePluginName(pluginId),
        pluginDisplayName: manifest.displayName,
        roots,
      });
    }
  }

  return sources;
}

export async function loadDesktopSkillSnapshot(
  activeWorktreePath: string | null,
): Promise<SkillSnapshot> {
  const personalSkillRoots = getDefaultPersonalSkillRoots();
  const resolvedActiveWorktreePath =
    activeWorktreePath && (await isDirectoryLike(activeWorktreePath))
      ? normalizePath(activeWorktreePath)
      : null;
  const projectSkillRoot = resolvedActiveWorktreePath
    ? join(resolvedActiveWorktreePath, ".claude", "skills")
    : null;
  const pluginSources = resolvedActiveWorktreePath
    ? await getPluginSources(resolvedActiveWorktreePath)
    : [];

  return buildDesktopSkillSnapshot({
    activeWorktreePath: resolvedActiveWorktreePath,
    personalSkillRoots,
    projectSkillRoot,
    pluginSources,
  });
}

export async function readSkillFilePreview(
  filePath: string,
): Promise<SkillFilePreview> {
  const fileStats = await stat(filePath);
  const size = fileStats.size;

  if (!fileStats.isFile()) {
    return {
      path: filePath,
      kind: "unsupported",
      size,
      language: inferLanguage(filePath),
    };
  }

  if (size > MAX_PREVIEW_BYTES) {
    return {
      path: filePath,
      kind: "too_large",
      size,
      language: inferLanguage(filePath),
    };
  }

  const content = await readFile(filePath);
  if (!isProbablyText(content)) {
    return {
      path: filePath,
      kind: "unsupported",
      size,
      language: inferLanguage(filePath),
    };
  }

  return {
    path: filePath,
    kind: isMarkdownFile(filePath) ? "markdown" : "text",
    size,
    content: content.toString("utf8"),
    language: inferLanguage(filePath),
  };
}
