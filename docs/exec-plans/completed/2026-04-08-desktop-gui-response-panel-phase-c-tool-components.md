# Desktop GUI AI Response Panel — Phase C: Tool Components

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-08
- **Goal**: 设计并实现工具调用卡片（折叠/展开/进度/状态）、文件修改 Diff 视图（逐块 Accept/Reject）、Bash 终端输出、MCP 工具渲染（含 UI Embed）等所有工具类 UI 组件。
- **Depends on**: Phase A + Phase B
- **Plan path**: `docs/exec-plans/active/2026-04-08-desktop-gui-response-panel-phase-c-tool-components.md`

## 设计原则

- **静默优先**：工具调用默认折叠，摘要一行
- **状态可见**：执行状态（pending/running/success/error）通过颜色点 + 图标即刻可感知
- **Diff 是主角**：file edit 展开时 Diff 化身主 UI，支持逐 hunk Accept/Reject
- **终端原汁原味**：bash 输出保持等宽+ANSI，但放在桌面 GUI 的视觉容器里

## Component Specifications

### 1. ToolCallCard（主容器）

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/blocks/tool-call-card.tsx

import { useState } from "react";
import {
  ChevronDown, ChevronRight,
  Terminal, FileEdit, FileSearch, Globe, Cpu,
  CheckCircle2, XCircle, Loader2, Clock
} from "lucide-react";
import type { GuiToolUseBlock } from "../../../../../shared/contracts";
import { BashOutputBlock } from "./bash-output-block";
import { FileEditDiffBlock } from "./file-edit-diff-block";
import { McpToolBlock } from "./mcp-tool-block";
import { cn } from "@renderer/lib/cn";

interface ToolCallCardProps {
  block: GuiToolUseBlock;
  messageId: string;
}

// 工具名 → { icon, label, color }
function resolveToolMeta(block: GuiToolUseBlock) {
  if (block.isMcp) {
    return { icon: Globe, label: `${block.mcpServer ?? "MCP"}: ${block.mcpTool ?? block.name}`, color: "text-purple-400" };
  }
  switch (block.name) {
    case "Bash":
      return { icon: Terminal, label: buildBashLabel(block.input), color: "text-amber-400" };
    case "str_replace_editor":
      return { icon: FileEdit, label: buildFileEditLabel(block.input), color: "text-blue-400" };
    case "str_replace_based_edit_tool":
      return { icon: FileEdit, label: buildFileEditLabel(block.input), color: "text-blue-400" };
    case "FileRead":
    case "Read":
      return { icon: FileSearch, label: String(block.input.path ?? ""), color: "text-[var(--color-muted)]" };
    case "Agent":
    case "Task":
      return { icon: Cpu, label: String(block.input.description ?? "子代理任务"), color: "text-indigo-400" };
    default:
      return { icon: Cpu, label: block.name, color: "text-[var(--color-muted)]" };
  }
}

function buildBashLabel(input: Record<string, unknown>): string {
  const cmd = String(input.command ?? "");
  // 截取前 60 字符
  return cmd.length > 60 ? cmd.slice(0, 57) + "…" : cmd;
}

function buildFileEditLabel(input: Record<string, unknown>): string {
  const path = String(input.file_path ?? input.path ?? "");
  // 只取文件名
  return path.split("/").pop() ?? path;
}

// 状态 → { icon, color, label }
const statusMeta = {
  pending:   { icon: Clock,       color: "text-[var(--color-muted)]", label: "等待中" },
  running:   { icon: Loader2,     color: "text-blue-400 animate-spin", label: "执行中" },
  completed: { icon: CheckCircle2,color: "text-green-400", label: "已完成" },
  error:     { icon: XCircle,     color: "text-red-400", label: "失败" },
  cancelled: { icon: XCircle,     color: "text-[var(--color-muted)]", label: "已取消" },
  rejected:  { icon: XCircle,     color: "text-amber-400", label: "已拒绝" },
} as const;

export function ToolCallCard({ block, messageId }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { icon: ToolIcon, label, color } = resolveToolMeta(block);
  const { icon: StatusIcon, color: statusColor } = statusMeta[block.status];
  const isRunning = block.status === "running";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border",
        // 执行中时：蓝色边框微光
        isRunning
          ? "border-blue-500/30 bg-[var(--color-panel)]"
          : "border-[var(--color-border)] bg-[var(--color-panel)]",
      )}
    >
      {/* 标题行：可点击折叠/展开 */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-[var(--color-hover)] transition-colors"
      >
        {/* 工具图标 */}
        <ToolIcon className={cn("h-3.5 w-3.5 flex-shrink-0", color)} />

        {/* 工具摘要文字 */}
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[var(--color-foreground)]">
          {label}
        </span>

        {/* 进度条（running 时显示） */}
        {isRunning && block.progress?.percent !== undefined && (
          <div className="h-1 w-20 overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${block.progress.percent}%` }}
            />
          </div>
        )}

        {/* 状态指示器 */}
        <StatusIcon className={cn("h-3.5 w-3.5 flex-shrink-0", statusColor)} />

        {/* 展开/折叠箭头 */}
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-muted)]" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-muted)]" />
        )}
      </button>

      {/* 展开内容 */}
      {expanded && (
        <div className="border-t border-[var(--color-border)]">
          <ToolCallExpandedContent block={block} />
        </div>
      )}
    </div>
  );
}

function ToolCallExpandedContent({ block }: { block: GuiToolUseBlock }) {
  // 文件编辑：显示 Diff
  if (
    (block.name === "str_replace_editor" || block.name === "str_replace_based_edit_tool") &&
    block.result?.structuredPatch
  ) {
    return <FileEditDiffBlock block={block} />;
  }

  // Bash：显示终端输出
  if (block.name === "Bash") {
    return <BashOutputBlock block={block} />;
  }

  // MCP：专用渲染
  if (block.isMcp) {
    return <McpToolBlock block={block} />;
  }

  // 通用：输入 JSON + 输出 JSON
  return (
    <div className="flex flex-col gap-0 divide-y divide-[var(--color-border)]">
      {/* Input */}
      <div className="px-3.5 py-2.5">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Input
        </p>
        <pre className="overflow-x-auto rounded bg-[var(--color-code-bg)] p-2 text-[11.5px] leading-relaxed text-[var(--color-foreground)]">
          {JSON.stringify(block.input, null, 2)}
        </pre>
      </div>
      {/* Result */}
      {block.result && (
        <div className="px-3.5 py-2.5">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            {block.result.isError ? "Error" : "Result"}
          </p>
          <pre
            className={cn(
              "overflow-x-auto rounded p-2 text-[11.5px] leading-relaxed",
              block.result.isError
                ? "bg-red-500/8 text-red-300"
                : "bg-[var(--color-code-bg)] text-[var(--color-foreground)]",
            )}
          >
            {typeof block.result.content === "string"
              ? block.result.content
              : JSON.stringify(block.result.content, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
```

### 2. FileEditDiffBlock（Diff 视图 + Accept/Reject）

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/blocks/file-edit-diff-block.tsx

import { useState } from "react";
import { Check, X, ChevronDown, ChevronRight, Plus, Minus } from "lucide-react";
import type { GuiToolUseBlock, GuiStructuredPatchHunk } from "../../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";

interface FileEditDiffBlockProps {
  block: GuiToolUseBlock;
}

interface HunkState {
  accepted: boolean;
  rejected: boolean;
}

export function FileEditDiffBlock({ block }: FileEditDiffBlockProps) {
  const { result } = block;
  if (!result?.structuredPatch) return null;

  const hunks = result.structuredPatch;
  const filePath = result.filePath ?? String(block.input.file_path ?? "");
  const [hunkStates, setHunkStates] = useState<Record<number, HunkState>>({});
  const [allExpanded, setAllExpanded] = useState(true);

  const handleAccept = (i: number) =>
    setHunkStates((s) => ({ ...s, [i]: { accepted: true, rejected: false } }));
  const handleReject = (i: number) =>
    setHunkStates((s) => ({ ...s, [i]: { accepted: false, rejected: true } }));

  const acceptedCount = Object.values(hunkStates).filter((s) => s.accepted).length;
  const rejectedCount = Object.values(hunkStates).filter((s) => s.rejected).length;

  const additions = hunks.reduce(
    (sum, h) => sum + h.lines.filter((l) => l.startsWith("+")).length, 0
  );
  const deletions = hunks.reduce(
    (sum, h) => sum + h.lines.filter((l) => l.startsWith("-")).length, 0
  );

  return (
    <div className="flex flex-col">
      {/* 文件头部 */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-code-bg)] px-3.5 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-[var(--color-foreground)]">
          {filePath}
        </span>
        <span className="text-[11px] text-green-400">+{additions}</span>
        <span className="text-[11px] text-red-400">-{deletions}</span>
        {(acceptedCount > 0 || rejectedCount > 0) && (
          <span className="text-[11px] text-[var(--color-muted)]">
            {acceptedCount} 接受 / {rejectedCount} 拒绝
          </span>
        )}
      </div>

      {/* Hunk 列表 */}
      <div className="max-h-[480px] overflow-y-auto">
        {hunks.map((hunk, i) => (
          <DiffHunk
            key={i}
            hunk={hunk}
            index={i}
            state={hunkStates[i]}
            onAccept={() => handleAccept(i)}
            onReject={() => handleReject(i)}
          />
        ))}
      </div>

      {/* 批量操作栏 */}
      {hunks.length > 1 && (
        <div className="flex items-center gap-2 border-t border-[var(--color-border)] px-3.5 py-2">
          <button
            type="button"
            onClick={() => {
              const s: Record<number, HunkState> = {};
              hunks.forEach((_, i) => { s[i] = { accepted: true, rejected: false }; });
              setHunkStates(s);
            }}
            className="flex items-center gap-1 rounded-md bg-green-500/12 px-2.5 py-1 text-[11.5px] font-medium text-green-400 hover:bg-green-500/20 transition-colors"
          >
            <Check className="h-3 w-3" />
            全部接受
          </button>
          <button
            type="button"
            onClick={() => {
              const s: Record<number, HunkState> = {};
              hunks.forEach((_, i) => { s[i] = { accepted: false, rejected: true }; });
              setHunkStates(s);
            }}
            className="flex items-center gap-1 rounded-md bg-red-500/12 px-2.5 py-1 text-[11.5px] font-medium text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <X className="h-3 w-3" />
            全部拒绝
          </button>
        </div>
      )}
    </div>
  );
}

interface DiffHunkProps {
  hunk: GuiStructuredPatchHunk;
  index: number;
  state?: HunkState;
  onAccept: () => void;
  onReject: () => void;
}

function DiffHunk({ hunk, index, state, onAccept, onReject }: DiffHunkProps) {
  const [expanded, setExpanded] = useState(true);
  const isAccepted = state?.accepted;
  const isRejected = state?.rejected;

  return (
    <div
      className={cn(
        "border-b border-[var(--color-border)] last:border-b-0",
        isAccepted && "bg-green-500/4",
        isRejected && "bg-red-500/4 opacity-60",
      )}
    >
      {/* Hunk 标题行 */}
      <div className="flex items-center gap-2 bg-[var(--color-code-bg)] px-3 py-1.5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
        >
          {expanded
            ? <ChevronDown className="h-3 w-3" />
            : <ChevronRight className="h-3 w-3" />}
        </button>
        <span className="flex-1 font-mono text-[11.5px] text-blue-400">
          @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
        </span>
        {/* Accept / Reject 按钮 */}
        {!isAccepted && !isRejected && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onAccept}
              className="flex h-5 w-5 items-center justify-center rounded hover:bg-green-500/20 text-green-400 transition-colors"
              title="接受此变更"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={onReject}
              className="flex h-5 w-5 items-center justify-center rounded hover:bg-red-500/20 text-red-400 transition-colors"
              title="拒绝此变更"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        {isAccepted && (
          <span className="flex items-center gap-1 text-[11px] text-green-400">
            <Check className="h-3 w-3" /> 已接受
          </span>
        )}
        {isRejected && (
          <span className="flex items-center gap-1 text-[11px] text-red-400">
            <X className="h-3 w-3" /> 已拒绝
          </span>
        )}
      </div>

      {/* Diff 行 */}
      {expanded && (
        <div className="overflow-x-auto">
          {hunk.lines.map((line, li) => {
            const prefix = line[0];
            const content = line.slice(1);
            const isAdded = prefix === "+";
            const isRemoved = prefix === "-";

            return (
              <div
                key={li}
                className={cn(
                  "flex items-baseline font-mono text-[12px] leading-5",
                  isAdded && "bg-green-500/8",
                  isRemoved && "bg-red-500/8",
                )}
              >
                {/* 符号列 */}
                <span
                  className={cn(
                    "w-6 flex-shrink-0 select-none px-1 text-center text-[11px]",
                    isAdded && "text-green-400",
                    isRemoved && "text-red-400",
                    !isAdded && !isRemoved && "text-[var(--color-muted)]",
                  )}
                >
                  {prefix === " " ? "" : prefix}
                </span>
                {/* 行号列 */}
                <span className="w-10 flex-shrink-0 select-none pr-2 text-right text-[11px] text-[var(--color-muted)]">
                  {isAdded ? hunk.newStart + li : isRemoved ? hunk.oldStart + li : ""}
                </span>
                {/* 代码内容 */}
                <span
                  className={cn(
                    "flex-1 px-2 py-0",
                    isAdded && "text-green-300",
                    isRemoved && "text-red-300",
                    !isAdded && !isRemoved && "text-[var(--color-foreground)]",
                  )}
                >
                  {content}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

### 3. BashOutputBlock（终端输出）

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/blocks/bash-output-block.tsx

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { GuiToolUseBlock } from "../../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";

const MAX_VISIBLE_LINES = 30;

interface BashOutputBlockProps {
  block: GuiToolUseBlock;
}

export function BashOutputBlock({ block }: BashOutputBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const { progress, result } = block;
  const isRunning = block.status === "running";

  // 当前输出（running 时取 progress，完成时取 result）
  const stdout = isRunning
    ? (progress?.stdout ?? "")
    : (result?.returnCodeInterpretation
        ? `${String(typeof result.content === "string" ? result.content : "")}\n[${result.returnCodeInterpretation}]`
        : String(typeof result?.content === "string" ? result.content : ""));

  const stderr = isRunning ? (progress?.stderr ?? "") : "";
  const output = [stdout, stderr].filter(Boolean).join("\n");
  const lines = output.split("\n");
  const shouldTruncate = lines.length > MAX_VISIBLE_LINES && !expanded;
  const displayLines = shouldTruncate ? lines.slice(-MAX_VISIBLE_LINES) : lines;

  return (
    <div className="flex flex-col">
      {/* 命令行 */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-code-bg)] px-3.5 py-2">
        <code className="font-mono text-[12px] text-amber-400">
          $ {String(block.input.command ?? "")}
        </code>
        {result?.interrupted && (
          <span className="ml-2 text-[11px] text-amber-400">（已中断）</span>
        )}
      </div>

      {/* 输出区域 */}
      {(isRunning || output) && (
        <div className="relative">
          {shouldTruncate && (
            <div className="px-3.5 py-1">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                <ChevronUp className="inline h-3 w-3" />
                {lines.length - MAX_VISIBLE_LINES} 行已截断，点击展开全部
              </button>
            </div>
          )}
          <pre
            className={cn(
              "max-h-[320px] overflow-auto px-3.5 py-2.5",
              "font-mono text-[12px] leading-[1.55]",
              "text-[var(--color-foreground)]",
            )}
          >
            {displayLines.join("\n")}
            {/* 执行中的光标闪烁 */}
            {isRunning && (
              <span className="inline-block h-3.5 w-1.5 animate-pulse bg-[var(--color-muted)] align-text-bottom" />
            )}
          </pre>
          {expanded && (
            <div className="px-3.5 pb-1">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                <ChevronDown className="inline h-3 w-3" />
                收起
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### 4. McpToolBlock（MCP 工具 + UI Embed）

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/blocks/mcp-tool-block.tsx

import { useState } from "react";
import { Globe, ExternalLink, Shield } from "lucide-react";
import type { GuiToolUseBlock, GuiMcpResultItem } from "../../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";

interface McpToolBlockProps {
  block: GuiToolUseBlock;
}

export function McpToolBlock({ block }: McpToolBlockProps) {
  const { result, progress } = block;

  if (!result && !progress?.message) {
    return (
      <div className="px-3.5 py-2.5">
        <p className="font-mono text-[12px] text-[var(--color-muted)]">
          {progress?.message ?? "正在执行…"}
        </p>
      </div>
    );
  }

  const items = Array.isArray(result?.content)
    ? (result.content as GuiMcpResultItem[])
    : [{ type: "text" as const, text: String(result?.content ?? "") }];

  // 检测是否有大响应警告（>10k tokens估算）
  const totalChars = items.reduce((s, i) => s + (i.text?.length ?? 0), 0);
  const isLargeResponse = totalChars > 40000; // ~10k tokens

  return (
    <div className="flex flex-col gap-2 px-3.5 py-2.5">
      {isLargeResponse && (
        <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1.5">
          <Shield className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[11.5px] text-amber-400">
            ⚠ 大量 MCP 响应（约 {Math.round(totalChars / 4).toLocaleString()} tokens）
          </span>
        </div>
      )}

      {items.map((item, i) => (
        <McpResultItem key={i} item={item} />
      ))}
    </div>
  );
}

function McpResultItem({ item }: { item: GuiMcpResultItem }) {
  // UI Embed：MCP Apps 的 ui:// scheme
  if (item.uiResourceUri) {
    return <McpUiEmbed uri={item.uiResourceUri} />;
  }

  // 图片
  if (item.type === "image" && item.data) {
    return (
      <img
        src={`data:${item.mimeType ?? "image/png"};base64,${item.data}`}
        alt="MCP result"
        className="max-h-[320px] rounded-lg object-contain"
      />
    );
  }

  // 文本
  return (
    <pre className="overflow-x-auto rounded bg-[var(--color-code-bg)] p-2.5 font-mono text-[11.5px] leading-relaxed text-[var(--color-foreground)]">
      {item.text ?? ""}
    </pre>
  );
}

// MCP Apps UI 嵌入（沙盒 iframe）
function McpUiEmbed({ uri }: { uri: string }) {
  const [loaded, setLoaded] = useState(false);
  const [securityConfirmed, setSecurityConfirmed] = useState(false);

  if (!securityConfirmed) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 p-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-amber-400" />
          <span className="text-[12.5px] font-medium text-amber-300">MCP UI 嵌入请求</span>
        </div>
        <p className="text-[12px] text-[var(--color-muted)]">
          此 MCP 工具请求嵌入外部 UI 内容：
          <br />
          <code className="text-[11.5px]">{uri}</code>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSecurityConfirmed(true)}
            className="rounded-md bg-amber-500/20 px-3 py-1.5 text-[12px] font-medium text-amber-300 hover:bg-amber-500/30 transition-colors"
          >
            允许加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-[var(--color-border)] overflow-hidden">
      {!loaded && (
        <div className="flex h-24 items-center justify-center bg-[var(--color-panel)]">
          <span className="text-[12px] text-[var(--color-muted)]">正在加载 MCP UI…</span>
        </div>
      )}
      <iframe
        src={uri}
        sandbox="allow-scripts allow-same-origin"
        className={cn(
          "w-full border-0 min-h-[200px]",
          !loaded && "hidden",
        )}
        onLoad={() => setLoaded(true)}
        title="MCP UI Embed"
      />
      <div className="flex items-center gap-1 border-t border-[var(--color-border)] bg-[var(--color-code-bg)] px-2.5 py-1">
        <Shield className="h-3 w-3 text-[var(--color-muted)]" />
        <span className="text-[11px] text-[var(--color-muted)]">沙盒 iframe · {uri}</span>
      </div>
    </div>
  );
}
```

## Slices

### Slice 1 — ToolCallCard 基础框架
- [ ] 实现 ToolCallCard 折叠/状态/摘要行
- [ ] resolveToolMeta 覆盖所有工具类型

### Slice 2 — FileEditDiffBlock
- [ ] 实现 hunk 渲染（红绿高亮 + 行号）
- [ ] 实现逐 hunk Accept/Reject 状态
- [ ] 实现批量接受/拒绝

### Slice 3 — BashOutputBlock
- [ ] 实现 stdout/stderr 渲染
- [ ] 实现行数截断 + 展开
- [ ] 流式进度（running 时的光标动画）

### Slice 4 — McpToolBlock + UiEmbed
- [ ] 实现 MCP 结果多类型渲染（text/image/resource）
- [ ] 实现 McpUiEmbed 沙盒 iframe + 安全确认
- [ ] 实现大响应警告

### Slice 5 — 集成测试
- [ ] smoke test 更新
- [ ] bun run desktop:dev 手动验证全流程

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-08 | Diff 逐 hunk Accept/Reject 而非全局 | 精细控制 + 参考 Codex App 逐块审批设计 |
| 2026-04-08 | MCP UI Embed 需安全确认 | 防止恶意 MCP 服务器注入任意 Web 内容 |
| 2026-04-08 | Bash 输出超 30 行截断显示末尾 | 保留最新进度，减少屏幕占用 |
| 2026-04-08 | 复用 GuiToolUseBlock.progress 字段展示实时流 | 避免独立的 progress 消息类型，简化状态机 |
