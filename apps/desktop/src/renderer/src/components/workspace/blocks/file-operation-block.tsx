import { useState, useCallback, useMemo } from "react";
import {
  FileEdit,
  FilePlus2,
  FileSearch,
  ChevronRight,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import type {
  GuiToolUseBlock,
  GuiToolStatus,
} from "../../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";

// ─── File operation type detection ────────────────────────────────────────────

type FileOpKind = "edit" | "create" | "read";

function detectFileOpKind(toolName: string): FileOpKind {
  const lower = toolName.toLowerCase();
  if (lower === "write") return "create";
  if (lower === "read") return "read";
  return "edit"; // Edit, str_replace, etc.
}

/** Check whether a tool_use block represents a file operation (Edit/Write/Read). */
export function isFileOperationTool(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower === "edit" ||
    lower === "write" ||
    lower === "read" ||
    lower.includes("str_replace") ||
    lower.includes("file_edit")
  );
}

// ─── Status label logic ───────────────────────────────────────────────────────

const STATUS_LABELS: Record<FileOpKind, Record<string, string>> = {
  edit: {
    pending: "编辑",
    running: "正在编辑",
    completed: "已编辑",
    error: "编辑失败",
    cancelled: "已取消编辑",
    rejected: "已拒绝编辑",
  },
  create: {
    pending: "创建",
    running: "正在创建",
    completed: "已创建",
    error: "创建失败",
    cancelled: "已取消创建",
    rejected: "已拒绝创建",
  },
  read: {
    pending: "查看",
    running: "正在查看",
    completed: "已查看",
    error: "查看失败",
    cancelled: "已取消查看",
    rejected: "已拒绝查看",
  },
};

function getStatusLabel(kind: FileOpKind, status: GuiToolStatus): string {
  return STATUS_LABELS[kind][status] ?? status;
}

// ─── Icon per operation kind ──────────────────────────────────────────────────

const KIND_ICONS: Record<
  FileOpKind,
  React.FC<React.SVGProps<SVGSVGElement>>
> = {
  edit: FileEdit,
  create: FilePlus2,
  read: FileSearch,
};

// ─── Diff generation from tool input ──────────────────────────────────────────

interface DiffStats {
  additions: number;
  deletions: number;
}

interface DiffLine {
  type: "add" | "del" | "ctx" | "hunk-header";
  text: string;
  oldLine?: number;
  newLine?: number;
}

function computeDiff(
  kind: FileOpKind,
  input: Record<string, unknown>,
): { lines: DiffLine[]; stats: DiffStats } | null {
  if (kind === "read") return null;

  if (kind === "create") {
    const content = (input.content as string) ?? (input.file_text as string);
    if (!content) return null;
    const contentLines = content.split("\n");
    const lines: DiffLine[] = contentLines.map((l, i) => ({
      type: "add" as const,
      text: l,
      newLine: i + 1,
    }));
    return { lines, stats: { additions: contentLines.length, deletions: 0 } };
  }

  // kind === "edit" — str_replace style
  const oldStr = (input.old_string as string) ?? (input.old_str as string);
  const newStr = (input.new_string as string) ?? (input.new_str as string);
  if (!oldStr && !newStr) return null;

  const oldLines = (oldStr ?? "").split("\n");
  const newLines = (newStr ?? "").split("\n");
  const diffLines: DiffLine[] = [];

  // Simple: show all old as deletions, all new as additions
  // Could do proper LCS later, but this is clear and matches the data we have
  diffLines.push({
    type: "hunk-header",
    text: `@@ -1,${oldLines.length} +1,${newLines.length} @@`,
  });
  for (let i = 0; i < oldLines.length; i++) {
    diffLines.push({ type: "del", text: oldLines[i], oldLine: i + 1 });
  }
  for (let i = 0; i < newLines.length; i++) {
    diffLines.push({ type: "add", text: newLines[i], newLine: i + 1 });
  }

  return {
    lines: diffLines,
    stats: { additions: newLines.length, deletions: oldLines.length },
  };
}

// ─── Extract filename ─────────────────────────────────────────────────────────

function extractFilePath(input: Record<string, unknown>): string | null {
  const p =
    (input.file_path as string) ??
    (input.path as string) ??
    (input.filePath as string);
  return p || null;
}

/**
 * Fallback: extract file path from a result content string like
 * "The file /path/to/file.md has been updated successfully."
 */
function extractFilePathFromResult(
  content: string | unknown[] | undefined,
): string | null {
  if (typeof content !== "string") return null;
  // Match "The file <path> has been ..." or "Created file <path>" etc.
  const m = content.match(
    /(?:file|created|wrote|updated|read)\s+([/\\][^\s]+)/i,
  );
  return m?.[1] ?? null;
}

/** Shorten an absolute path to just the filename (or last 2 segments). */
function shortenPath(fullPath: string): string {
  const segments = fullPath.replace(/\\/g, "/").split("/").filter(Boolean);
  if (segments.length <= 2) return segments.join("/");
  return segments.slice(-2).join("/");
}

/**
 * Smart path for code block header: keep first meaningful dir + … + last 2 segments.
 * e.g. "/Users/refinex/develop/code/refinex/Refinex-Skills/README.zh.md"
 *   → "Refinex-Skills/README.zh.md"
 * Long: "/a/b/c/d/e/src/components/workspace/blocks/file.tsx"
 *   → "src/…/blocks/file.tsx"
 */
function smartPath(fullPath: string): string {
  const segments = fullPath.replace(/\\/g, "/").split("/").filter(Boolean);
  if (segments.length <= 3) return segments.join("/");

  // Drop common prefixes: Users, home, develop, code, etc.
  const boring = new Set([
    "users",
    "home",
    "var",
    "tmp",
    "opt",
    "develop",
    "code",
    "projects",
    "workspace",
    "workspaces",
  ]);
  let start = 0;
  while (
    start < segments.length - 3 &&
    boring.has(segments[start].toLowerCase())
  ) {
    start++;
  }
  // Also skip username-like segment right after Users/home
  if (start > 0 && start < segments.length - 3) start++;

  const meaningful = segments.slice(start);
  if (meaningful.length <= 3) return meaningful.join("/");

  // first-dir/…/parent/file
  return `${meaningful[0]}/…/${meaningful.slice(-2).join("/")}`;
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-md p-1.5 text-[#6e7681] hover:bg-[#30363d] hover:text-[#e6edf3] transition-colors"
      title="复制"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

// ─── Diff code view ───────────────────────────────────────────────────────────

function DiffCodeView({
  lines,
  fileName,
}: {
  lines: DiffLine[];
  fileName: string | null;
}) {
  const rawText = lines
    .filter((l) => l.type !== "hunk-header")
    .map((l) => {
      const prefix = l.type === "add" ? "+" : l.type === "del" ? "-" : " ";
      return `${prefix}${l.text}`;
    })
    .join("\n");

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[#0d1117] overflow-hidden">
      {/* Code block header */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[#161b22] border-b border-[var(--color-border)]">
        <span className="font-mono text-[11px] text-[#8b949e] truncate min-w-0">
          {fileName ?? "file"}
        </span>
        <CopyButton text={rawText} />
      </div>

      {/* Diff lines */}
      <div className="overflow-x-auto">
        <pre className="py-1 font-mono text-[12px] leading-[1.6]">
          {lines.map((line, i) => {
            if (line.type === "hunk-header") {
              return (
                <div
                  key={i}
                  className="px-3 py-0.5 text-[11px] text-[var(--color-muted)] bg-[#1c2333] select-none"
                >
                  {line.text}
                </div>
              );
            }

            const prefix =
              line.type === "add" ? "+" : line.type === "del" ? "-" : " ";
            const lineNum =
              line.type === "add"
                ? line.newLine
                : line.type === "del"
                  ? line.oldLine
                  : undefined;

            return (
              <div
                key={i}
                className={cn(
                  "flex whitespace-pre",
                  line.type === "add" && "bg-[#12261e] text-[#7ee787]",
                  line.type === "del" && "bg-[#2d1216] text-[#f47067]",
                  line.type === "ctx" && "text-[#8b949e]",
                )}
              >
                {/* Line number gutter */}
                <span className="w-10 flex-shrink-0 select-none text-right pr-2 text-[11px] text-[#484f58]">
                  {lineNum ?? ""}
                </span>
                {/* Prefix (+/-/space) */}
                <span className="w-4 flex-shrink-0 select-none text-center">
                  {prefix}
                </span>
                {/* Content */}
                <span className="flex-1 pr-3">{line.text}</span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}

// ─── Line count badges ────────────────────────────────────────────────────────

function LineBadges({ stats }: { stats: DiffStats }) {
  return (
    <span className="flex items-center gap-1.5 ml-1.5">
      {stats.additions > 0 && (
        <span className="text-[11.5px] font-medium text-green-400">
          +{stats.additions}
        </span>
      )}
      {stats.deletions > 0 && (
        <span className="text-[11.5px] font-medium text-red-400">
          -{stats.deletions}
        </span>
      )}
    </span>
  );
}

// ─── Status indicator (spinner for running) ──────────────────────────────────

function StatusIndicator({
  status,
  kind,
}: {
  status: GuiToolStatus;
  kind: FileOpKind;
}) {
  if (status === "running") {
    return (
      <Loader2
        className={cn(
          "h-3.5 w-3.5 animate-spin flex-shrink-0",
          kind === "create" ? "text-emerald-400" : "text-blue-400",
        )}
      />
    );
  }
  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface FileOperationBlockProps {
  block: GuiToolUseBlock;
}

export function FileOperationBlock({ block }: FileOperationBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const kind = detectFileOpKind(block.name);

  // Extract file path: prefer input, fallback to result content text.
  const inputFilePath = extractFilePath(block.input);
  const filePath =
    inputFilePath ?? extractFilePathFromResult(block.result?.content);
  const displayName = filePath ? shortenPath(filePath) : null;
  const statusLabel = getStatusLabel(kind, block.status);
  const KindIcon = KIND_ICONS[kind];

  const diff = useMemo(
    () => computeDiff(kind, block.input),
    [kind, block.input],
  );
  const hasContent = diff !== null && diff.lines.length > 0;

  // For result.content fallback — show the text result if no diff data
  const resultText = block.result?.content;
  const hasResultText =
    typeof resultText === "string" && resultText.trim().length > 0;

  const isExpandable = hasContent || hasResultText;

  const handleFileNameClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: implement file opening
  }, []);

  return (
    <div className="group">
      {/* Collapsed summary row */}
      <button
        type="button"
        onClick={() => isExpandable && setExpanded((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 py-1.5 px-1 text-left rounded-md",
          isExpandable &&
            "hover:bg-[var(--color-hover)] transition-colors cursor-pointer",
          !isExpandable && "cursor-default",
        )}
      >
        {/* Status indicator (spinner) or icon */}
        {block.status === "running" ? (
          <StatusIndicator status={block.status} kind={kind} />
        ) : (
          <KindIcon
            className={cn(
              "h-3.5 w-3.5 flex-shrink-0",
              kind === "edit" && "text-blue-400",
              kind === "create" && "text-emerald-400",
              kind === "read" && "text-sky-400",
            )}
          />
        )}

        {/* Status label */}
        <span className="text-[12.5px] text-[var(--color-muted)] flex-shrink-0">
          {statusLabel}
        </span>

        {/* File name */}
        {displayName && (
          <span
            onClick={handleFileNameClick}
            className="text-[12.5px] text-[var(--color-link)] hover:underline truncate min-w-0 cursor-pointer"
            title={filePath ?? undefined}
          >
            {displayName}
          </span>
        )}

        {/* +N / -N badges */}
        {diff?.stats &&
          (diff.stats.additions > 0 || diff.stats.deletions > 0) && (
            <LineBadges stats={diff.stats} />
          )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Expand chevron */}
        {isExpandable && (
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 text-[var(--color-muted)] transition-transform duration-150 flex-shrink-0",
              "opacity-0 group-hover:opacity-100",
              expanded && "rotate-90 !opacity-100",
            )}
          />
        )}
      </button>

      {/* Expanded diff view */}
      {expanded && isExpandable && (
        <div className="mt-1 ml-0">
          {hasContent ? (
            <DiffCodeView
              lines={diff.lines}
              fileName={filePath ? smartPath(filePath) : displayName}
            />
          ) : hasResultText ? (
            <div className="rounded-lg border border-[var(--color-border)] bg-[#0d1117] overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[#161b22] border-b border-[var(--color-border)]">
                <span className="font-mono text-[11px] text-[#8b949e] truncate min-w-0">
                  {filePath ? smartPath(filePath) : (displayName ?? "输出")}
                </span>
                <CopyButton
                  text={typeof resultText === "string" ? resultText : ""}
                />
              </div>
              <pre className="px-3 py-2 font-mono text-[12px] leading-[1.6] text-[#8b949e] overflow-x-auto whitespace-pre-wrap break-words">
                {resultText}
              </pre>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
