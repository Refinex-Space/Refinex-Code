import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  FolderClosed,
  FolderOpen,
  FolderPlus,
  Search,
  Settings2,
  SquarePen,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { Tooltip } from "@renderer/components/ui/tooltip";
import { cn } from "@renderer/lib/cn";
import {
  formatRelativeTimeLabel,
  getExpandedWorktreeLabel,
} from "@renderer/lib/worktree";
import {
  findActiveWorktree,
  useWorktreeStore,
} from "@renderer/stores/worktree";

interface WorkspaceSidebarProps {
  onOpenWorkspace: () => Promise<unknown>;
  onOpenSettings: () => void;
  onOpenCommandPalette: () => void;
  onSelectWorktree: (worktreeId: string) => Promise<unknown>;
  onPrepareSession: (worktreeId: string) => Promise<unknown>;
  onSelectSession: (worktreeId: string, sessionId: string) => Promise<unknown>;
  onRemoveSession: (worktreeId: string, sessionId: string) => Promise<unknown>;
  onRemoveWorktree: (worktreeId: string) => Promise<unknown>;
}

export function WorkspaceSidebar({
  onOpenWorkspace,
  onOpenSettings,
  onOpenCommandPalette,
  onSelectWorktree,
  onPrepareSession,
  onSelectSession,
  onRemoveSession,
  onRemoveWorktree,
}: WorkspaceSidebarProps) {
  const worktrees = useWorktreeStore((state) => state.worktrees);
  const activeWorktreeId = useWorktreeStore((state) => state.activeWorktreeId);
  const activeSessionId = useWorktreeStore((state) => state.activeSessionId);
  const activeWorktree = useWorktreeStore((state) => findActiveWorktree(state));
  const [collapsedWorktrees, setCollapsedWorktrees] = useState<
    Record<string, boolean>
  >({});

  const worktreeLabels = useMemo(() => {
    return new Map(
      worktrees.map((worktree) => [
        worktree.id,
        getExpandedWorktreeLabel(worktree, worktrees),
      ]),
    );
  }, [worktrees]);

  const runAction = (operation: () => Promise<unknown>) => {
    void operation().catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(message);
    });
  };

  return (
    <div className="flex h-[calc(100vh-var(--titlebar-height))] flex-col">
      <div className="px-3 pt-2 pb-4">
        <nav className="space-y-1">
          <SidebarActionButton
            label="新线程"
            icon={SquarePen}
            onClick={() => {
              if (activeWorktree) {
                runAction(() => onPrepareSession(activeWorktree.id));
                return;
              }

              runAction(onOpenWorkspace);
            }}
          />
        </nav>
      </div>

      <div className="flex items-center justify-between px-4 pb-3">
        <span className="font-medium text-[length:var(--ui-font-size-2xs)] tracking-[0.08em] text-[var(--color-muted)]">
          线程
        </span>
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            label="搜索会话"
            icon={Search}
            onClick={onOpenCommandPalette}
          />
          <ToolbarButton
            label="打开项目"
            icon={FolderPlus}
            onClick={() => {
              runAction(onOpenWorkspace);
            }}
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div
          className={cn(
            "px-2 pb-5",
            worktrees.length === 0 &&
              "flex min-h-full items-center justify-center",
          )}
        >
          {worktrees.length === 0 ? (
            <div className="flex max-w-[188px] flex-col items-center justify-center gap-3 px-4 text-center">
              {/* <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-surface)] text-[var(--color-muted)]">
                <FolderOpen className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <div className="text-[length:var(--ui-font-size-md)] font-medium text-[var(--color-fg)]/88">
                  打开一个项目开始
                </div>
              </div> */}
              <button
                type="button"
                onClick={() => {
                  runAction(onOpenWorkspace);
                }}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)] transition-colors duration-150 hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-fg)]"
              >
                <FolderPlus className="h-3.5 w-3.5" aria-hidden="true" />
                Open Project
              </button>
            </div>
          ) : null}

          {worktrees.length > 0
            ? worktrees.map((worktree) => {
                const isCollapsed = collapsedWorktrees[worktree.id] ?? false;
                const activeSessionInProject = worktree.sessions.some(
                  (session) => session.id === activeSessionId,
                );
                const isActiveProject =
                  worktree.id === activeWorktreeId || activeSessionInProject;

                return (
                  <div key={worktree.id} className="space-y-1">
                    <div
                      className={motionClass(
                        "group flex items-center gap-1 rounded-[12px] px-1.5 py-0.5 transition-colors duration-150 hover:bg-[var(--color-sidebar-hover)]",
                        isActiveProject && "bg-[var(--color-sidebar-hover)]",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          runAction(() => onSelectWorktree(worktree.id));
                          setCollapsedWorktrees((previous) => ({
                            ...previous,
                            [worktree.id]: !isCollapsed,
                          }));
                        }}
                        title={worktree.worktreePath}
                        className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1 text-left"
                        aria-label={isCollapsed ? "展开项目" : "折叠项目"}
                      >
                        <span className="relative flex h-[15px] w-[15px] shrink-0 items-center justify-center">
                          {isCollapsed ? (
                            <FolderClosed
                              className={motionClass(
                                "absolute h-[15px] w-[15px] transition-opacity duration-150 group-hover:opacity-0",
                                isActiveProject
                                  ? "text-[var(--color-fg)]/72"
                                  : "text-[var(--color-muted)]",
                              )}
                              aria-hidden="true"
                            />
                          ) : (
                            <FolderOpen
                              className={motionClass(
                                "absolute h-[15px] w-[15px] transition-opacity duration-150 group-hover:opacity-0",
                                isActiveProject
                                  ? "text-[var(--color-fg)]/72"
                                  : "text-[var(--color-muted)]",
                              )}
                              aria-hidden="true"
                            />
                          )}
                          <ChevronRight
                            className={motionClass(
                              "absolute h-3.5 w-3.5 opacity-0 transition-[opacity,transform] duration-150 group-hover:opacity-100",
                              !isCollapsed && "rotate-90",
                            )}
                            aria-hidden="true"
                          />
                        </span>

                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate font-medium text-[length:var(--ui-font-size-md)] leading-5",
                            isActiveProject
                              ? "text-[var(--color-fg)]"
                              : "text-[var(--color-fg)]/86",
                          )}
                        >
                          {worktreeLabels.get(worktree.id) ?? worktree.label}
                        </span>
                      </button>

                      <SidebarIconButton
                        label="在当前项目下新建线程"
                        icon={SquarePen}
                        onClick={() => {
                          runAction(() => onPrepareSession(worktree.id));
                        }}
                      />
                      <SidebarIconButton
                        label="移除项目"
                        icon={Trash2}
                        tone="danger"
                        onClick={() => {
                          runAction(() => onRemoveWorktree(worktree.id));
                        }}
                      />
                    </div>

                    <AnimatePresence initial={false}>
                      {!isCollapsed && worktree.sessions.length > 0 ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.16, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="ml-7 space-y-0.5">
                            <AnimatePresence initial={false} mode="popLayout">
                              {worktree.sessions.map((session) => (
                                <SidebarSessionItem
                                  key={session.id}
                                  title={session.title}
                                  updatedAt={session.lastOpenedAt}
                                  isActive={session.id === activeSessionId}
                                  onSelect={() => {
                                    runAction(() =>
                                      onSelectSession(worktree.id, session.id),
                                    );
                                  }}
                                  onRemove={() => {
                                    runAction(() =>
                                      onRemoveSession(worktree.id, session.id),
                                    );
                                  }}
                                />
                              ))}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              })
            : null}
        </div>
      </ScrollArea>

      <div className="border-t border-[var(--color-border)] px-3 py-3">
        <SidebarActionButton
          label="设置"
          icon={Settings2}
          onClick={onOpenSettings}
        />
      </div>
    </div>
  );
}

interface SidebarActionButtonProps {
  label: string;
  icon: typeof SquarePen;
  onClick: () => void;
}

function SidebarActionButton({
  label,
  icon: Icon,
  onClick,
}: SidebarActionButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ x: 1 }}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.14, ease: "easeOut" }}
      className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-1.5 text-left text-[var(--color-fg)]/84 transition-colors duration-150 hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-fg)]"
    >
      <Icon
        className="h-[15px] w-[15px] shrink-0 text-[var(--color-muted)]"
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate font-medium text-[length:var(--ui-font-size-md)] leading-5">
        {label}
      </span>
    </motion.button>
  );
}

interface ToolbarButtonProps {
  label: string;
  icon: typeof Search;
  onClick: () => void;
}

function ToolbarButton({ label, icon: Icon, onClick }: ToolbarButtonProps) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        onClick={onClick}
        className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-muted)] transition-colors duration-150 hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-fg)]"
        aria-label={label}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

interface SidebarIconButtonProps {
  label: string;
  icon: typeof SquarePen;
  onClick: () => void;
  tone?: "default" | "danger";
}

function SidebarIconButton({
  label,
  icon: Icon,
  onClick,
  tone = "default",
}: SidebarIconButtonProps) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-0 transition-[opacity,color,background-color] duration-150 group-focus-within:opacity-100 group-hover:opacity-100",
          tone === "danger"
            ? "text-[var(--color-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-danger)]"
            : "text-[var(--color-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-fg)]",
        )}
        aria-label={label}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

interface SidebarSessionItemProps {
  title: string;
  updatedAt: string;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

function SidebarSessionItem({
  title,
  updatedAt,
  isActive,
  onSelect,
  onRemove,
}: SidebarSessionItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className="group relative"
    >
      {isActive ? (
        <motion.div
          layoutId="sidebar-session-active-item"
          className="absolute inset-0 rounded-lg bg-[var(--color-sidebar-active)]"
          transition={{
            type: "spring",
            stiffness: 360,
            damping: 34,
            mass: 0.7,
          }}
        />
      ) : null}

      <button
        type="button"
        onClick={onSelect}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "relative flex h-8 w-full items-center gap-2 rounded-[10px] px-2.5 pr-8 text-left transition-colors duration-150",
          !isActive && "hover:bg-[var(--color-sidebar-hover)]",
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[length:var(--ui-font-size-md)] leading-5",
            isActive
              ? "font-semibold text-[var(--color-fg)]"
              : "font-medium text-[var(--color-fg)]/86",
          )}
        >
          {title}
        </span>

        <span className="shrink-0 font-mono text-[length:var(--code-font-size-xs)] text-[var(--color-muted)]">
          {formatRelativeTimeLabel(updatedAt)}
        </span>
      </button>

      <Tooltip content="移除线程">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="absolute top-1/2 right-1 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-muted)] opacity-0 transition-[opacity,color,background-color] duration-150 hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-danger)] group-focus-within:opacity-100 group-hover:opacity-100"
          aria-label="移除线程"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </Tooltip>
    </motion.div>
  );
}

function motionClass(...classes: Array<string | false>): string {
  return classes.filter(Boolean).join(" ");
}
