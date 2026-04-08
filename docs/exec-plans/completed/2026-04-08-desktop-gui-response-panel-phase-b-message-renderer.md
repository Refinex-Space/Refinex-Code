# Desktop GUI AI Response Panel — Phase B: Message Renderer System

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-08
- **Goal**: 设计并实现 GUI 模式下的核心消息渲染组件系统，覆盖流式文本、思考过程、消息气泡布局和会话列表。
- **Depends on**: Phase A（数据模型）
- **Plan path**: `docs/exec-plans/active/2026-04-08-desktop-gui-response-panel-phase-b-message-renderer.md`

## 设计原则

基于 openwork 项目调研 + Codex App 产品设计，提炼以下原则：

1. **Part 是渲染单元**：一条 assistant 消息含多个 blocks，按 type 分支渲染
2. **工具调用默认折叠**：用一行摘要，点击展开；不影响阅读流
3. **AI 回复无背景气泡**：最大宽 760px，左对齐，无背景色（参考 Claude Desktop）
4. **用户消息有气泡**：右对齐，`max-w-[85%]`，dark surface 背景
5. **流式节流 60ms**：防止频繁重绘，确保末尾不丢
6. **设计基调**：quiet / premium / flat-first；空间呼吸感优先

## Information Architecture

```
WorkspaceConversation (整体容器 max-w-[820px] mx-auto)
├── MessageList (虚拟滚动，>200 条启用)
│   ├── MessageGroup (每轮 user + assistant)
│   │   ├── UserMessageRow (right-aligned bubble)
│   │   └── AssistantMessageRow (left-aligned, no bubble)
│   │       ├── AssistantAvatar (Claude/Codex logo)
│   │       ├── BlockRenderer (dispatch by block.type)
│   │       │   ├── TextBlock → StreamingMarkdown
│   │       │   ├── ThinkingBlock → CollapsibleThinking
│   │       │   ├── RedactedThinkingBlock → RedactedThinking
│   │       │   ├── ToolUseBlock → ToolCallCard (Phase C)
│   │       │   └── SystemBlock → SystemMessage
│   │       └── MessageFooter (cost + duration + model)
│   └── PendingIndicator (typing dots, when status=pending)
└── ScrollAnchor (自动滚到底部)
```

## Component Specifications

### 1. WorkspaceConversation (重构)

当前实现：极简 text 气泡  
目标：支持 blocks 结构，虚拟化，分组

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/workspace-conversation.tsx

import { useRef, useEffect, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { DesktopGuiConversationSnapshot } from "../../../../shared/contracts";
import { MessageRow } from "./message-row";
import { PendingIndicator } from "./pending-indicator";
import { cn } from "@renderer/lib/cn";

interface WorkspaceConversationProps {
  snapshot: DesktopGuiConversationSnapshot | null;
  isLoading: boolean;
}

export function WorkspaceConversation({
  snapshot,
  isLoading,
}: WorkspaceConversationProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const messages = snapshot?.messages ?? [];
  const hasPending = messages.some((m) => m.status === "pending");

  // 仅 >200 条时启用虚拟化
  const shouldVirtualize = messages.length > 200;

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    enabled: shouldVirtualize,
    overscan: 5,
  });

  // 自动滚到底部
  useEffect(() => {
    if (!parentRef.current || hasPending) return;
    const el = parentRef.current;
    el.scrollTop = el.scrollHeight;
  }, [snapshot?.updatedAt, hasPending]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!snapshot || messages.length === 0) return null;

  return (
    <div ref={parentRef} className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[820px] px-4 py-6">
        {shouldVirtualize ? (
          <div
            style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => (
              <div
                key={virtualItem.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <MessageRow message={messages[virtualItem.index]} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {messages.map((message) => (
              <MessageRow key={message.id} message={message} />
            ))}
          </div>
        )}
        {hasPending && <PendingIndicator />}
        <div className="h-4" />
      </div>
    </div>
  );
}
```

### 2. MessageRow

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/message-row.tsx

import type { DesktopGuiConversationMessage } from "../../../../shared/contracts";
import { BlockRenderer } from "./block-renderer";
import { UserMessageBubble } from "./user-message-bubble";
import { MessageFooter } from "./message-footer";
import { AssistantAvatar } from "./assistant-avatar";
import { cn } from "@renderer/lib/cn";

interface MessageRowProps {
  message: DesktopGuiConversationMessage;
}

export function MessageRow({ message }: MessageRowProps) {
  const isAssistant = message.role === "assistant";
  const isError = message.status === "error";

  if (!isAssistant) {
    return <UserMessageBubble message={message} />;
  }

  // Assistant 消息：左对齐，无背景，max-w-[760px]
  return (
    <div className={cn("flex w-full gap-3", isError && "opacity-70")}>
      <AssistantAvatar providerId={message.providerId} />
      <div className="min-w-0 flex-1">
        {/* 优先渲染 blocks，降级到 text */}
        {message.blocks && message.blocks.length > 0 ? (
          <div className="flex flex-col gap-3">
            {message.blocks.map((block, i) => (
              <BlockRenderer key={i} block={block} messageId={message.id} />
            ))}
          </div>
        ) : (
          <StreamingMarkdown
            text={message.text}
            isStreaming={message.status === "pending"}
          />
        )}
        <MessageFooter message={message} />
      </div>
    </div>
  );
}
```

### 3. UserMessageBubble

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/user-message-bubble.tsx

import type { DesktopGuiConversationMessage } from "../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";

interface UserMessageBubbleProps {
  message: DesktopGuiConversationMessage;
}

export function UserMessageBubble({ message }: UserMessageBubbleProps) {
  return (
    <div className="flex w-full justify-end">
      <div
        className={cn(
          // 气泡容器：暗色 surface + 大圆角 + 微边框
          "max-w-[85%] rounded-[20px] border border-[var(--color-border)]",
          "bg-[var(--color-message-user-bg)]",
          "px-4 py-2.5",
          // 文字样式
          "text-[13.5px] leading-[1.6] text-[var(--color-foreground)]",
          // 右下角尖角感（通过 smaller 圆角）
          "rounded-br-[6px]",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
      </div>
    </div>
  );
}
```

### 4. StreamingMarkdown

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/streaming-markdown.tsx

import { useMemo, useRef, useState, useEffect } from "react";
import { marked, type Renderer } from "marked";
import xss, { getDefaultWhiteList } from "xss";
import { cn } from "@renderer/lib/cn";

// LRU 缓存：最多 100 条已完成消息的 HTML
const markdownCache = new Map<string, string>();
const CACHE_MAX = 100;

function renderMarkdown(text: string): string {
  if (markdownCache.has(text)) {
    return markdownCache.get(text)!;
  }
  
  const renderer = new marked.Renderer();
  // 代码块：添加 language class 供 highlight.js 识别
  renderer.code = ({ text, lang }) => {
    const escaped = text.replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c)
    );
    return `<pre class="gui-code-block" data-lang="${lang ?? ""}"><code class="${lang ? `language-${lang}` : ""}">${escaped}</code></pre>`;
  };
  // 链接：外部链接新窗口打开，阻止 javascript:
  renderer.link = ({ href, text }) => {
    if (!href || href.startsWith("javascript:")) return `<span>${text}</span>`;
    const isExternal = href.startsWith("http");
    return `<a href="${href}" ${isExternal ? 'target="_blank" rel="noopener noreferrer"' : ""}>${text}</a>`;
  };

  const html = marked.parse(text, { renderer }) as string;
  // XSS 清洗
  const safe = xss(html, {
    whiteList: {
      ...getDefaultWhiteList(),
      pre: ["class", "data-lang"],
      code: ["class"],
      a: ["href", "target", "rel"],
    },
  });

  if (markdownCache.size >= CACHE_MAX) {
    const firstKey = markdownCache.keys().next().value;
    if (firstKey) markdownCache.delete(firstKey);
  }
  markdownCache.set(text, safe);
  return safe;
}

interface StreamingMarkdownProps {
  text: string;
  isStreaming?: boolean;
  className?: string;
}

export function StreamingMarkdown({
  text,
  isStreaming = false,
  className,
}: StreamingMarkdownProps) {
  // 节流渲染: streaming 时 60ms 刷新一次
  const [renderText, setRenderText] = useState(text);
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTextRef = useRef(text);

  useEffect(() => {
    latestTextRef.current = text;
    if (!isStreaming) {
      setRenderText(text);
      return;
    }
    if (throttleRef.current) return;
    throttleRef.current = setTimeout(() => {
      throttleRef.current = null;
      setRenderText(latestTextRef.current);
    }, 60);
  }, [text, isStreaming]);

  useEffect(() => {
    return () => {
      if (throttleRef.current) clearTimeout(throttleRef.current);
    };
  }, []);

  const html = useMemo(() => renderMarkdown(renderText), [renderText]);

  return (
    <div
      className={cn("gui-markdown prose prose-sm dark:prose-invert max-w-none", className)}
      // biome-ignore lint: dangerouslySetInnerHTML needed for rendered markdown
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

### 5. CollapsibleThinking

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/blocks/thinking-block.tsx

import { useState } from "react";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";
import type { GuiThinkingBlock } from "../../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";

interface ThinkingBlockProps {
  block: GuiThinkingBlock;
}

export function ThinkingBlock({ block }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(block.collapsed === false);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)]">
      {/* 标题行 */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2",
          "text-[12px] font-medium text-[var(--color-muted)]",
          "hover:bg-[var(--color-hover)] transition-colors",
        )}
      >
        <Brain className="h-3.5 w-3.5 text-purple-400" />
        <span className="flex-1 text-left">思考过程</span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
      </button>

      {/* 内容（展开时） */}
      {expanded && (
        <div className="border-t border-[var(--color-border)] px-3 py-2">
          <p className="font-mono text-[12px] leading-relaxed text-[var(--color-muted)] whitespace-pre-wrap">
            {block.thinking}
          </p>
        </div>
      )}
    </div>
  );
}
```

### 6. RedactedThinkingBlock

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/blocks/redacted-thinking-block.tsx

import { Brain, Lock } from "lucide-react";

export function RedactedThinkingBlock() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2">
      <Brain className="h-3.5 w-3.5 text-purple-400 opacity-50" />
      <span className="text-[12px] text-[var(--color-muted)] italic">
        已加密的思考过程
      </span>
      <Lock className="h-3 w-3 text-[var(--color-muted)]" />
    </div>
  );
}
```

### 7. PendingIndicator

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/pending-indicator.tsx

export function PendingIndicator() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-6 w-6 flex-shrink-0 rounded-full bg-[var(--color-panel)]" />
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-[var(--color-muted)] animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
```

### 8. MessageFooter（成本 + 耗时 + 模型）

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/message-footer.tsx

import type { DesktopGuiConversationMessage } from "../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";

interface MessageFooterProps {
  message: DesktopGuiConversationMessage;
}

export function MessageFooter({ message }: MessageFooterProps) {
  const { usage, durationMs, model, status } = message;
  if (status === "pending" || (!usage && !durationMs)) return null;

  const items: string[] = [];
  if (usage) {
    items.push(`${(usage.inputTokens + usage.outputTokens).toLocaleString()} tokens`);
    if (usage.costUsd !== undefined) {
      items.push(`$${usage.costUsd.toFixed(4)}`);
    }
  }
  if (durationMs) {
    items.push(`${(durationMs / 1000).toFixed(1)}s`);
  }
  if (model) {
    // 显示短模型名
    const shortModel = model.replace(/^claude-/, "").replace(/^gpt-/, "");
    items.push(shortModel);
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      {items.map((item, i) => (
        <span
          key={i}
          className={cn(
            "text-[11px] text-[var(--color-muted)]",
            i > 0 && "before:mr-2 before:content-['·']",
          )}
        >
          {item}
        </span>
      ))}
    </div>
  );
}
```

### 9. SystemMessage

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/blocks/system-block.tsx

import type { GuiSystemBlock } from "../../../../../shared/contracts";
import { AlertCircle, CheckCircle2, Info, Zap } from "lucide-react";
import { cn } from "@renderer/lib/cn";

const subtypeConfig = {
  api_error: {
    icon: AlertCircle,
    color: "text-red-400",
    bg: "bg-red-500/8 border-red-500/20",
  },
  rate_limit: {
    icon: AlertCircle,
    color: "text-amber-400",
    bg: "bg-amber-500/8 border-amber-500/20",
  },
  memory_saved: {
    icon: CheckCircle2,
    color: "text-green-400",
    bg: "bg-[var(--color-panel)] border-[var(--color-border)]",
  },
  cost_summary: {
    icon: Zap,
    color: "text-blue-400",
    bg: "bg-[var(--color-panel)] border-[var(--color-border)]",
  },
  informational: {
    icon: Info,
    color: "text-[var(--color-muted)]",
    bg: "bg-[var(--color-panel)] border-[var(--color-border)]",
  },
} as const;

interface SystemBlockProps {
  block: GuiSystemBlock;
}

export function SystemBlock({ block }: SystemBlockProps) {
  const config = subtypeConfig[block.subtype as keyof typeof subtypeConfig] ?? subtypeConfig.informational;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2",
        config.bg,
      )}
    >
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 flex-shrink-0", config.color)} />
      <p className="text-[12.5px] leading-relaxed text-[var(--color-foreground)]">
        {block.message}
      </p>
    </div>
  );
}
```

### 10. BlockRenderer（分发器）

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/block-renderer.tsx

import type { GuiContentBlock } from "../../../../shared/contracts";
import { StreamingMarkdown } from "./streaming-markdown";
import { ThinkingBlock } from "./blocks/thinking-block";
import { RedactedThinkingBlock } from "./blocks/redacted-thinking-block";
import { ToolCallCard } from "./blocks/tool-call-card"; // Phase C
import { SystemBlock } from "./blocks/system-block";

interface BlockRendererProps {
  block: GuiContentBlock;
  messageId: string;
}

export function BlockRenderer({ block, messageId }: BlockRendererProps) {
  switch (block.type) {
    case "text":
      return <StreamingMarkdown text={block.text} />;
    case "thinking":
      return <ThinkingBlock block={block} />;
    case "redacted_thinking":
      return <RedactedThinkingBlock />;
    case "tool_use":
      return <ToolCallCard block={block} messageId={messageId} />;
    case "system":
      return <SystemBlock block={block} />;
    case "tool_result":
      // tool_result blocks are rendered inside ToolCallCard; shown standalone if orphaned
      return null;
    default:
      return null;
  }
}
```

## CSS / Theme Tokens（新增）

在 `globals.css` 中添加：

```css
/* Message surface tokens */
--color-message-user-bg: color-mix(in srgb, var(--color-panel) 85%, var(--color-accent) 15%);
--color-message-assistant-text: var(--color-foreground);

/* Tool call card tokens */
--color-tool-pending: var(--color-muted);
--color-tool-running: #3b82f6;   /* blue-500 */
--color-tool-success: #22c55e;   /* green-500 */
--color-tool-error: #ef4444;     /* red-500 */

/* Code block tokens */
--color-code-bg: color-mix(in srgb, var(--color-panel) 80%, var(--color-border) 20%);
```

## Markdown Prose 样式（Tailwind plugin 配置）

在 `tailwind.config.ts` 的 `typography` plugin 配置中，覆盖以下：

```js
prose: {
  css: {
    '--tw-prose-body': 'var(--color-foreground)',
    '--tw-prose-headings': 'var(--color-foreground)',
    '--tw-prose-code': 'var(--color-foreground)',
    '--tw-prose-pre-bg': 'var(--color-code-bg)',
    maxWidth: 'none',
    fontSize: '13.5px',
    lineHeight: '1.65',
    'code::before': { content: '' },
    'code::after': { content: '' },
    'pre code': { fontSize: '12.5px' },
  }
}
```

## Dependencies to Install

```bash
bun add @tanstack/react-virtual  # 虚拟化
# marked 和 xss 已有
```

## Slices

### Slice 1 — 组件文件结构搭建
- [ ] 创建 `workspace/blocks/` 目录
- [ ] 创建所有组件骨架文件（TypeScript 编译通过）

### Slice 2 — StreamingMarkdown + ThinkingBlock
- [ ] 实现 StreamingMarkdown（节流 + LRU 缓存 + XSS）
- [ ] 实现 CollapsibleThinking
- [ ] 实现 RedactedThinking

### Slice 3 — MessageRow + BlockRenderer + Footer
- [ ] 实现 MessageRow（assistant + user 分支）
- [ ] 实现 BlockRenderer dispatch
- [ ] 实现 MessageFooter（tokens + cost + duration）

### Slice 4 — 重构 WorkspaceConversation
- [ ] 替换现有消息列表为新 MessageRow 系统
- [ ] 接入虚拟滚动（条件启用）
- [ ] PendingIndicator 接入

### Slice 5 — 测试和视觉验证
- [ ] 更新 smoke tests
- [ ] bun run desktop:dev 人工视觉验证

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-08 | 节流 60ms（而非 openwork 的 120ms） | Desktop 渲染性能优于 Web，更快的节流感知更自然 |
| 2026-04-08 | >200 条启用虚拟化（openwork 用 >500） | 工具调用块比纯文本重，提前虚拟化 |
| 2026-04-08 | LRU 限 100 条而非 50 条 | Desktop 内存宽裕，扩大 Markdown 渲染缓存 |
| 2026-04-08 | AI 回复无背景气泡 | 参考 Claude Desktop 和 openwork 的 quiet/premium 设计基调 |
