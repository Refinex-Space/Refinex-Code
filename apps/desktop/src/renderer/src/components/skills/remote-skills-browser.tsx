import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState } from "react";
import { Download, Plus, RefreshCcw, Search, X } from "lucide-react";
import { toast } from "sonner";
import type { RemoteSkillRecord } from "../../../../shared/contracts";
import { useDesktopShell } from "@renderer/hooks/use-desktop-shell";
import { cn } from "@renderer/lib/cn";

interface RemoteSkillsBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstalled: () => void;
  installedSkillIds: Set<string>;
}

export function RemoteSkillsBrowser({
  open,
  onOpenChange,
  onInstalled,
  installedSkillIds,
}: RemoteSkillsBrowserProps) {
  const { getRemoteSkillCatalog, installRemoteSkill } = useDesktopShell();
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState<RemoteSkillRecord[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void getRemoteSkillCatalog()
      .then((snapshot) => {
        if (cancelled) {
          return;
        }

        setCatalog(snapshot.skills);
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "加载远程 Skills 失败");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [getRemoteSkillCatalog, open]);

  const filteredSkills = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return catalog;
    }

    return catalog.filter((skill) =>
      [skill.name, skill.description, skill.providerLabel, skill.sourceLabel]
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [catalog, query]);

  const handleInstall = async (skillId: string) => {
    if (installingId) {
      return;
    }

    const isInstalled = installedSkillIds.has(skillId);
    try {
      setInstallingId(skillId);
      const result = await installRemoteSkill(skillId);
      if (result.cancelled) {
        return;
      }

      onInstalled();
      toast.success(isInstalled ? "Skill 已更新" : "Skill 已安装");
    } catch (installError) {
      toast.error(
        installError instanceof Error
          ? installError.message
          : isInstalled
            ? "更新 Skill 失败"
            : "安装 Skill 失败",
      );
    } finally {
      setInstallingId(null);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/28 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 flex h-[min(760px,calc(100vh-3rem))] w-[min(980px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel)] shadow-[0_40px_120px_rgba(15,23,42,0.28)] outline-none"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">浏览 Skills</Dialog.Title>

          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-5">
            <div>
              <div className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--color-fg)]">
                Browse Skills
              </div>
              <div className="mt-1 text-[13px] text-[var(--color-muted)]">
                实时展示来自 Anthropic GitHub skills 仓库的公开技能
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="关闭浏览技能弹窗"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors duration-150 hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex shrink-0 items-center gap-3 px-6 py-4">
            <label className="flex flex-1 items-center gap-2 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[var(--color-muted)]">
              <Search className="h-4 w-4 shrink-0" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search skills..."
                aria-label="搜索远程 Skills"
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] text-[var(--color-fg)] outline-none placeholder:text-[var(--color-muted)]"
              />
            </label>
            <div className="rounded-full bg-[var(--color-surface)] px-4 py-2 text-[12px] font-medium text-[var(--color-fg)]/78">
              Anthropic & Partners
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            {loading ? (
              <RemoteSkillsInfo text="正在加载远程 Skills..." />
            ) : error ? (
              <RemoteSkillsInfo text={error} tone="error" />
            ) : filteredSkills.length === 0 ? (
              <RemoteSkillsInfo text="没有匹配的远程 Skill。" />
            ) : (
              <div className="grid grid-cols-2 gap-4 max-[820px]:grid-cols-1">
                {filteredSkills.map((skill) => (
                  <RemoteSkillCard
                    key={skill.id}
                    skill={skill}
                    installed={installedSkillIds.has(skill.id)}
                    installing={installingId !== null}
                    onInstall={() => {
                      void handleInstall(skill.id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function RemoteSkillCard({
  skill,
  installed,
  installing,
  onInstall,
}: {
  skill: RemoteSkillRecord;
  installed: boolean;
  installing: boolean;
  onInstall: () => void;
}) {
  return (
    <article className="rounded-[22px] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-panel)_92%,white_8%)] px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[22px] font-semibold tracking-[-0.04em] text-[var(--color-fg)]">
            /{skill.name}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--color-muted)]">
            <span>{skill.providerLabel}</span>
            <span className="inline-flex items-center gap-1">
              <Download className="h-3.5 w-3.5" />
              GitHub
            </span>
          </div>
        </div>
        {installed ? (
          <button
            type="button"
            aria-label={`更新 ${skill.name}`}
            onClick={onInstall}
            disabled={installing}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[12px] font-medium text-[var(--color-fg)] transition-colors duration-150",
              installing ? "cursor-not-allowed opacity-55" : "hover:bg-[var(--color-surface)]",
            )}
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            更新
          </button>
        ) : (
          <button
            type="button"
            aria-label={`安装 ${skill.name}`}
            onClick={onInstall}
            disabled={installing}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-muted)] transition-colors duration-150",
              installing
                ? "cursor-not-allowed opacity-55"
                : "hover:text-[var(--color-fg)]",
            )}
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-4 line-clamp-3 text-[14px] leading-6 text-[var(--color-fg)]/76">
        {skill.description}
      </p>
    </article>
  );
}

function RemoteSkillsInfo({
  text,
  tone = "muted",
}: {
  text: string;
  tone?: "muted" | "error";
}) {
  return (
    <div
      className={cn(
        "flex min-h-[280px] items-center justify-center text-center text-[14px]",
        tone === "error"
          ? "text-[var(--color-danger,#c2410c)]"
          : "text-[var(--color-muted)]",
      )}
    >
      {text}
    </div>
  );
}
