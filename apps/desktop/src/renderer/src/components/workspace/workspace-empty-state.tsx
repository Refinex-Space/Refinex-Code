import { DropdownMenu } from "@radix-ui/themes";
import {
  Check,
  ChevronDown,
  Folder,
  FolderPlus,
  Search,
} from "lucide-react";
import {
  type ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { WorktreeRecord } from "../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";

const appLogoUrl = new URL(
  "../../../../../resources/icons/icon.svg",
  import.meta.url,
).href;

interface WorkspaceEmptyStateProps {
  activeWorktree: WorktreeRecord | null;
  worktrees: WorktreeRecord[];
  onOpenWorkspace: () => Promise<unknown>;
  onSelectWorktree: (worktreeId: string) => Promise<unknown>;
}

interface VisibleWorktree {
  id: string;
  label: string;
  isActive: boolean;
}

export function WorkspaceEmptyState({
  activeWorktree,
  worktrees,
  onOpenWorkspace,
  onSelectWorktree,
}: WorkspaceEmptyStateProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const title = activeWorktree?.label ?? "选择项目";

  const visibleWorktrees = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return worktrees
      .map<VisibleWorktree>((worktree) => ({
        id: worktree.id,
        label: worktree.label,
        isActive: worktree.id === activeWorktree?.id,
      }))
      .filter((worktree) => {
        if (!normalizedQuery) {
          return true;
        }

        return worktree.label.toLowerCase().includes(normalizedQuery);
      });
  }, [activeWorktree?.id, query, worktrees]);

  useEffect(() => {
    if (!pickerOpen) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [pickerOpen]);

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const handleSelect = (worktreeId: string) => {
    void onSelectWorktree(worktreeId);
    setPickerOpen(false);
    setQuery("");
  };

  const handleAddProject = () => {
    void onOpenWorkspace();
    setPickerOpen(false);
    setQuery("");
  };

  return (
    <div className="flex w-full flex-1 items-center justify-center px-6">
      <div className="flex w-full max-w-[42rem] flex-col items-center text-center">
        <div className="mb-5 flex h-11 w-11 items-center justify-center">
          <img
            src={appLogoUrl}
            alt="RWork logo"
            className="h-11 w-11 object-contain"
          />
        </div>

        <h2 className="font-semibold text-[34px] leading-none tracking-[-0.045em] text-[var(--color-fg)]">
          开始构建
        </h2>

        <DropdownMenu.Root open={pickerOpen} onOpenChange={setPickerOpen}>
          <DropdownMenu.Trigger
            onClick={(event) => {
              event.preventDefault();
              setPickerOpen((open) => !open);
            }}
            className="group mt-2.5 inline-flex items-center gap-2 rounded-full px-0.5 py-0.5 text-[var(--color-muted)] transition-colors duration-150 hover:text-[var(--color-fg)]"
            aria-label={activeWorktree ? `当前项目：${title}` : "选择项目"}
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="max-w-[min(30ch,calc(100vw-5rem))] truncate font-medium text-[clamp(2rem,3.8vw,2.65rem)] leading-none tracking-[-0.05em] text-[var(--color-muted)] transition-colors duration-150 group-hover:text-[var(--color-fg)]">
                {title}
              </span>
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-transparent text-[var(--color-muted)] transition-[transform,color] duration-150 group-hover:text-[var(--color-fg)]",
                  pickerOpen &&
                    "rotate-180 text-[var(--color-fg)]",
                )}
              >
                <ChevronDown className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
            </span>
          </DropdownMenu.Trigger>

          <DropdownMenu.Content
            side="bottom"
            align="center"
            sideOffset={8}
            className="z-30 w-[min(19.75rem,calc(100vw-1.25rem))] overflow-hidden rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-0 shadow-[var(--shadow-panel)] outline-none"
          >
            {worktrees.length > 0 ? (
              <>
                <label className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-2 text-[var(--color-muted)]">
                  <Search className="h-[15px] w-[15px] shrink-0" aria-hidden="true" />
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={handleQueryChange}
                    placeholder="Search projects"
                    className="min-w-0 flex-1 bg-transparent text-[12.75px] leading-5 text-[var(--color-fg)] outline-none placeholder:text-[var(--color-muted)]"
                  />
                </label>

                <div className="max-h-[214px] px-1.5 pb-1.5">
                  {visibleWorktrees.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {visibleWorktrees.map((worktree) => (
                        <button
                          key={worktree.id}
                          type="button"
                          onClick={() => handleSelect(worktree.id)}
                          className={cn(
                            "group flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left transition-colors duration-150",
                            worktree.isActive
                              ? "bg-[var(--color-surface-strong)]"
                              : "hover:bg-[var(--color-sidebar-hover)]",
                          )}
                        >
                          <Folder
                            className="h-[15px] w-[15px] shrink-0 text-[var(--color-muted)] transition-colors duration-150 group-hover:text-[var(--color-fg)]"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate font-medium text-[12.75px] leading-5 text-[var(--color-fg)]">
                            {worktree.label}
                          </span>
                          {worktree.isActive ? (
                            <Check
                              className="h-[15px] w-[15px] shrink-0 text-[var(--color-fg)]/84"
                              aria-hidden="true"
                            />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3.5 py-4 text-[12.5px] text-[var(--color-muted)]">
                      没有匹配的项目
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="px-3.5 py-4">
                <div className="text-left text-[12.5px] text-[var(--color-muted)]">
                  还没有已打开的项目
                </div>
              </div>
            )}

            <div className="border-t border-[var(--color-border)] px-1.5 pt-1.5 pb-1">
              <button
                type="button"
                onClick={handleAddProject}
                className="group flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left transition-colors duration-150 hover:bg-[var(--color-sidebar-hover)]"
              >
                <FolderPlus
                  className="h-[15px] w-[15px] shrink-0 text-[var(--color-muted)] transition-colors duration-150 group-hover:text-[var(--color-fg)]"
                  aria-hidden="true"
                />
                <span className="font-medium text-[12.75px] leading-5 text-[var(--color-fg)]">
                  添加新项目
                </span>
              </button>
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}
