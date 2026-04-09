import { useState } from "react";
import type {
  GuiToolUseBlock,
  GuiMcpResultItem,
} from "../../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";
import { Shield, ExternalLink, FileText } from "lucide-react";

interface McpToolBlockProps {
  block: GuiToolUseBlock;
  isNested?: boolean;
}

export function McpToolBlock({ block, isNested }: McpToolBlockProps) {
  const result = block.result;
  if (!result) return null;

  const items = Array.isArray(result.content)
    ? (result.content as GuiMcpResultItem[])
    : null;
  const textContent =
    typeof result.content === "string" ? result.content : null;

  if (textContent) {
    return (
      <div className={cn(!isNested && "px-3.5 py-3")}>
        <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-5 text-[var(--color-foreground)]">
          {textContent.slice(0, 4000)}
          {textContent.length > 4000 && (
            <span className="text-[var(--color-muted)]">…（已截断）</span>
          )}
        </pre>
      </div>
    );
  }

  if (items) {
    return (
      <div
        className={cn(
          "flex flex-col divide-y divide-[var(--color-border)]",
          !isNested && "",
        )}
      >
        {items.map((item, i) => (
          <McpResultItemView key={i} item={item} />
        ))}
      </div>
    );
  }

  return null;
}

// ─── MCP result item renderer ─────────────────────────────────────────────────

function McpResultItemView({ item }: { item: GuiMcpResultItem }) {
  switch (item.type) {
    case "text":
      return (
        <div className="flex items-start gap-2 px-3.5 py-3">
          <FileText className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--color-muted)]" />
          <pre className="min-w-0 whitespace-pre-wrap break-words font-mono text-[12px] leading-5 text-[var(--color-foreground)]">
            {item.text}
          </pre>
        </div>
      );

    case "image":
      if (!item.data) return null;
      return (
        <div className="p-3.5">
          <img
            src={`data:${item.mimeType ?? "image/png"};base64,${item.data}`}
            alt="MCP tool result"
            className="max-h-[400px] max-w-full rounded-lg object-contain"
          />
        </div>
      );

    case "resource":
      return <McpResourceItem item={item} />;

    default:
      return null;
  }
}

// ─── Resource item (potentially embeddable UI) ────────────────────────────────

function McpResourceItem({ item }: { item: GuiMcpResultItem }) {
  const [embedConfirmed, setEmbedConfirmed] = useState(false);

  if (item.uiResourceUri && !embedConfirmed) {
    return (
      <div className="flex items-start gap-3 px-3.5 py-3">
        <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] text-[var(--color-foreground)]">
            此工具返回了一个可嵌入的 UI 界面
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--color-muted)]">
            {item.uiResourceUri}
          </p>
          <button
            type="button"
            onClick={() => setEmbedConfirmed(true)}
            className="mt-2 rounded-lg bg-amber-500/15 px-2.5 py-1.5 text-[12px] font-medium text-amber-300 hover:bg-amber-500/25 transition-colors"
          >
            加载 UI
          </button>
        </div>
      </div>
    );
  }

  if (item.uiResourceUri && embedConfirmed) {
    return (
      <div className="p-3.5">
        <iframe
          src={item.uiResourceUri}
          sandbox="allow-scripts allow-same-origin"
          className="h-[400px] w-full rounded-lg border border-[var(--color-border)]"
          title="MCP UI embed"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3.5 py-2.5">
      <ExternalLink className="h-3.5 w-3.5 text-[var(--color-muted)]" />
      <span
        className={cn(
          "truncate font-mono text-[12px]",
          item.uri ? "text-blue-400" : "text-[var(--color-muted)]",
        )}
      >
        {item.uri ?? item.text ?? "resource"}
      </span>
    </div>
  );
}
