import { ArrowUp, ChevronDown, Plus } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Tooltip } from "@renderer/components/ui/tooltip";
import { cn } from "@renderer/lib/cn";

const INPUT_MAX_HEIGHT = 152;

interface WorkspaceComposerProps {
  activeSessionTitle: string | null;
  hasActiveSession: boolean;
  hasWorktree: boolean;
}

export function WorkspaceComposer({
  activeSessionTitle,
  hasActiveSession,
  hasWorktree,
}: WorkspaceComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const hasDraft = value.trim().length > 0;
  const canSend = hasActiveSession && hasDraft;

  const placeholder = !hasWorktree
    ? "先打开一个项目，再从左侧创建或选择线程"
    : !hasActiveSession
      ? "咨询 RWork 任何问题，@ 添加文件，/ 唤出命令，$ 唤出 Skills"
      : "描述下一步要做的事，Enter 发送，Shift+Enter 换行";

  const handleInput = () => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }

    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, INPUT_MAX_HEIGHT)}px`;
  };

  const handleSend = () => {
    if (!canSend) {
      return;
    }

    toast.info("TODO：消息发送能力待接入");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-[920px]">
      <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel)] p-2 shadow-[0_1px_0_rgba(255,255,255,0.58)_inset,0_18px_42px_rgba(15,23,42,0.08),0_4px_14px_rgba(15,23,42,0.04)] backdrop-blur-xl">
        <div className="px-3 pt-1">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={!hasActiveSession}
            aria-label={activeSessionTitle ?? "Session composer"}
            className="max-h-[152px] min-h-[52px] w-full resize-none overflow-y-auto bg-transparent px-1 py-1 text-[15px] leading-6 text-[var(--color-fg)] outline-none placeholder:text-[var(--color-muted)] disabled:cursor-not-allowed disabled:placeholder:text-[var(--color-muted)]"
          />
        </div>

        <div className="mt-1.5 flex items-end justify-between gap-3 px-2 pb-1">
          <div className="flex min-w-0 items-center gap-2">
            <Tooltip content="添加文件（TODO）">
              <button
                type="button"
                onClick={() => toast.info("TODO：附件能力待接入")}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors duration-150 hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]"
                aria-label="添加文件（TODO）"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>

            <Tooltip content="切换模型（TODO）">
              <button
                type="button"
                onClick={() => toast.info("TODO：模型切换待接入")}
                className="inline-flex h-8 min-w-0 max-w-[15rem] items-center gap-1 rounded-full px-2.5 text-[12.5px] font-medium text-[var(--color-fg)]/80 transition-colors duration-150 hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]"
                aria-label="切换模型（TODO）"
              >
                <span className="truncate">模型选择 TODO</span>
                <ChevronDown
                  className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted)]"
                  aria-hidden="true"
                />
              </button>
            </Tooltip>
          </div>

          <Tooltip
            content={
              canSend ? "发送消息（TODO）" : "输入内容并选择线程后可发送"
            }
          >
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-[background-color,color,box-shadow,transform] duration-200",
                canSend
                  ? "bg-[var(--color-fg)] text-[var(--color-bg)] shadow-[0_12px_24px_rgba(15,23,42,0.22)] hover:scale-[1.02]"
                  : "bg-[var(--color-surface)] text-[var(--color-muted)] shadow-none",
              )}
              aria-label={canSend ? "发送消息（TODO）" : "发送消息不可用"}
            >
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
