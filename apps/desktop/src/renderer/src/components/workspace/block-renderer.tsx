import type { GuiContentBlock } from "../../../../shared/contracts";
import { StreamingMarkdown } from "./streaming-markdown";
import { ThinkingBlock } from "./blocks/thinking-block";
import { RedactedThinkingBlock } from "./blocks/redacted-thinking-block";
import { SystemBlock } from "./blocks/system-block";
import { ToolCallCard } from "./blocks/tool-call-card";
import {
  FileOperationBlock,
  isFileOperationTool,
} from "./blocks/file-operation-block";

interface BlockRendererProps {
  block: GuiContentBlock;
  isStreaming?: boolean;
}

export function BlockRenderer({ block, isStreaming }: BlockRendererProps) {
  switch (block.type) {
    case "text":
      return (
        <StreamingMarkdown
          text={isStreaming ? block.text : block.text.trim() || ""}
        />
      );

    case "thinking":
      return (
        <ThinkingBlock
          thinking={block.thinking}
          defaultCollapsed={!isStreaming}
        />
      );

    case "redacted_thinking":
      return <RedactedThinkingBlock />;

    case "tool_use":
      if (isFileOperationTool(block.name)) {
        return <FileOperationBlock block={block} />;
      }
      return <ToolCallCard block={block} />;

    case "tool_result":
      // tool_result blocks are rendered inside ToolCallCard; skip standalone
      return null;

    case "system":
      return <SystemBlock block={block} />;

    default: {
      // Exhaustive check — unknown block types are silently ignored
      const _: never = block;
      return null;
    }
  }
}
