import { useState } from "react";
import {
  Terminal,
  FileEdit,
  Search,
  Globe,
  Puzzle,
  Wrench,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Ban,
} from "lucide-react";
import type {
  GuiToolUseBlock,
  GuiToolStatus,
} from "../../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";
import { FileEditDiffBlock } from "./file-edit-diff-block";
import { BashOutputBlock } from "./bash-output-block";
import { McpToolBlock } from "./mcp-tool-block";

// ─── Tool metadata resolution ─────────────────────────────────────────────────

interface ToolMeta {
  label: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  accentClass: string;
}

function resolveToolMeta(name: string, isMcp: boolean): ToolMeta {
  if (isMcp) {
    return { label: name, icon: Puzzle, accentClass: "text-purple-400" };
  }
  const lower = name.toLowerCase();
  if (lower.includes("bash") || lower.includes("shell")) {
    return { label: "Bash", icon: Terminal, accentClass: "text-green-400" };
  }
  if (
    lower.includes("edit") ||
    lower.includes("write") ||
    lower.includes("str_replace")
  ) {
    return { label: "Edit File", icon: FileEdit, accentClass: "text-blue-400" };
  }
  if (lower.includes("read") || lower.includes("view")) {
    return { label: "Read File", icon: FileEdit, accentClass: "text-sky-400" };
  }
  if (
    lower.includes("search") ||
    lower.includes("grep") ||
    lower.includes("find")
  ) {
    return { label: "Search", icon: Search, accentClass: "text-amber-400" };
  }
  if (
    lower.includes("web") ||
    lower.includes("http") ||
    lower.includes("fetch")
  ) {
    return { label: "Web", icon: Globe, accentClass: "text-cyan-400" };
  }
  return {
    label: name,
    icon: Wrench,
    accentClass: "text-[var(--color-muted)]",
  };
}

// ─── Status icon ──────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: GuiToolStatus }) {
  switch (status) {
    case "pending":
      return <Clock className="h-3.5 w-3.5 text-[var(--color-muted)]" />;
    case "running":
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />;
    case "completed":
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />;
    case "error":
      return <XCircle className="h-3.5 w-3.5 text-red-400" />;
    case "cancelled":
    case "rejected":
      return <Ban className="h-3.5 w-3.5 text-[var(--color-muted)]" />;
  }
}

// ─── Input summary ────────────────────────────────────────────────────────────

function inputSummary(name: string, input: Record<string, unknown>): string {
  const lower = name.toLowerCase();
  if (
    (lower.includes("bash") || lower.includes("shell")) &&
    typeof input.command === "string"
  ) {
    return input.command.slice(0, 120);
  }
  if (
    (lower.includes("edit") || lower.includes("str_replace")) &&
    typeof input.path === "string"
  ) {
    return input.path;
  }
  if (typeof input.path === "string") return input.path;
  if (typeof input.file_path === "string") return input.file_path;
  if (typeof input.query === "string") return input.query;
  const keys = Object.keys(input);
  if (keys.length === 0) return "";
  const first = input[keys[0]];
  return typeof first === "string" ? first.slice(0, 80) : "";
}

// ─── Expanded content helper ─────────────────────────────────────────────────

function ExpandedContent({ block }: { block: GuiToolUseBlock }) {
  if (block.isMcp) return <McpToolBlock block={block} />;
  if (
    block.result?.structuredPatch &&
    block.result.structuredPatch.length > 0
  ) {
    return (
      <FileEditDiffBlock
        filePath={block.result.filePath}
        hunks={block.result.structuredPatch}
      />
    );
  }
  if (block.progress?.stdout !== undefined || block.result?.content) {
    return <BashOutputBlock block={block} />;
  }
  return null;
}

// ─── ToolCallCard ─────────────────────────────────────────────────────────────

interface ToolCallCardProps {
  block: GuiToolUseBlock;
}

export function ToolCallCard({ block }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(block.status === "running");
  const meta = resolveToolMeta(block.name, block.isMcp);
  const ToolIcon = meta.icon;
  const summary = inputSummary(block.name, block.input);

  const hasExpandableContent =
    block.result?.structuredPatch ||
    block.result?.content ||
    block.progress?.stdout ||
    block.isMcp;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] overflow-hidden">
      {/* Header row */}
      <button
        type="button"
        onClick={() => hasExpandableContent && setExpanded((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left",
          hasExpandableContent &&
            "hover:bg-[var(--color-hover)] transition-colors cursor-pointer",
          !hasExpandableContent && "cursor-default",
        )}
      >
        <ToolIcon
          className={cn("h-3.5 w-3.5 flex-shrink-0", meta.accentClass)}
        />

        <span className="flex-1 min-w-0">
          <span className="text-[12.5px] font-medium text-[var(--color-foreground)]">
            {meta.label}
          </span>
          {summary && (
            <span className="ml-2 truncate text-[12px] text-[var(--color-muted)]">
              {summary}
            </span>
          )}
        </span>

        {block.progress?.message && block.status === "running" && (
          <span className="max-w-[160px] truncate text-[11px] italic text-[var(--color-muted)]">
            {block.progress.message}
          </span>
        )}

        <StatusIcon status={block.status} />

        {hasExpandableContent && (
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-[var(--color-muted)] transition-transform duration-200",
              !expanded && "-rotate-90",
            )}
          />
        )}
      </button>

      {/* Expanded content */}
      {expanded && hasExpandableContent && (
        <div className="border-t border-[var(--color-border)]">
          <ExpandedContent block={block} />
        </div>
      )}
    </div>
  );
}
