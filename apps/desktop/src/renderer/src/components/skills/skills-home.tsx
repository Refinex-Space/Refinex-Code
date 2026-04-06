import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DropdownMenu } from "@radix-ui/themes";
import type {
  SkillFilePreview,
  SkillRecord,
  SkillTreeNode,
} from "../../../../shared/contracts";
import {
  BookOpenText,
  ChevronRight,
  Download,
  Copy,
  Code2,
  Eye,
  FileCode2,
  Folder,
  FolderOpen,
  Ellipsis,
  Plus,
  Search,
  LibraryBig,
  MessageSquarePlus,
  RefreshCcw,
  Sparkles,
  Trash2,
  Upload,
  WandSparkles,
  X,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useDesktopShell } from "@renderer/hooks/use-desktop-shell";
import { useSkillsData } from "@renderer/hooks/use-skills-data";
import { cn } from "@renderer/lib/cn";
import { type SkillsContentMode, useUIStore } from "@renderer/stores/ui";
import { Panel } from "@renderer/components/ui/panel";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { Tooltip } from "@renderer/components/ui/tooltip";
import { SkillMarkdownPreview } from "@renderer/components/skills/skill-markdown-preview";
import { RemoteSkillsBrowser } from "@renderer/components/skills/remote-skills-browser";

type SkillGroup = "personal" | "project" | "plugin";

const groupTitles: Record<SkillGroup, string> = {
  personal: "Personal skills",
  project: "Project skills",
  plugin: "Plugin skills",
};

function collectDirectoryIds(nodes: SkillTreeNode[]): string[] {
  return nodes.flatMap((node) => {
    if (node.type !== "directory") {
      return [];
    }

    return [node.id, ...collectDirectoryIds(node.children ?? [])];
  });
}

function nodeMatchesQuery(node: SkillTreeNode, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const selfMatches = [node.name, node.relativePath].some((value) =>
    value.toLowerCase().includes(normalizedQuery),
  );
  if (selfMatches) {
    return true;
  }

  return (node.children ?? []).some((child) =>
    nodeMatchesQuery(child, normalizedQuery),
  );
}

function filterTreeNodes(
  nodes: SkillTreeNode[],
  query: string,
): SkillTreeNode[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return nodes;
  }

  return nodes.flatMap((node) => {
    if (node.type === "file") {
      return nodeMatchesQuery(node, normalizedQuery) ? [node] : [];
    }

    const children = filterTreeNodes(node.children ?? [], normalizedQuery);
    if (nodeMatchesQuery(node, normalizedQuery) || children.length > 0) {
      return [
        {
          ...node,
          children,
        },
      ];
    }

    return [];
  });
}

function skillMatchesQuery(skill: SkillRecord, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const metadataMatches = [
    skill.name,
    skill.displayName,
    skill.description,
    skill.sourceLabel,
    skill.addedBy,
  ].some((value) => value.toLowerCase().includes(normalizedQuery));

  return (
    metadataMatches ||
    skill.tree.some((node) => nodeMatchesQuery(node, normalizedQuery))
  );
}

function formatDateLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getSourceOrder(sourceKind: SkillGroup): number {
  if (sourceKind === "personal") return 0;
  if (sourceKind === "project") return 1;
  return 2;
}

function inferPreviewKindFromPath(
  filePath: string | null | undefined,
): "markdown" | "text" | null {
  if (!filePath) {
    return null;
  }

  const normalizedPath = filePath.toLowerCase();
  if (
    normalizedPath.endsWith("/skill.md") ||
    normalizedPath.endsWith(".md") ||
    normalizedPath.endsWith(".markdown")
  ) {
    return "markdown";
  }

  if (normalizedPath.includes(".")) {
    return "text";
  }

  return null;
}

function renderPreviewContent(
  preview: SkillFilePreview | null,
  mode: SkillsContentMode,
): ReactNode {
  if (!preview) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-[var(--color-muted)]">
        选择一个 Skill 或文件后显示内容
      </div>
    );
  }

  if (preview.kind === "too_large") {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-[var(--color-muted)]">
        文件过大，当前版本不提供预览。
      </div>
    );
  }

  if (preview.kind === "unsupported") {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-[var(--color-muted)]">
        该文件不是可直接预览的文本内容。
      </div>
    );
  }

  if (preview.kind === "markdown" && mode === "preview") {
    return <SkillMarkdownPreview content={preview.content ?? ""} />;
  }

  return (
    <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[length:var(--code-font-size-md)] leading-6 text-[var(--color-fg)]">
      <code>{preview.content ?? ""}</code>
    </pre>
  );
}

export function SkillsHome() {
  const {
    snapshot,
    snapshotLoading,
    selectedSkill,
    selectedNode,
    preview,
    previewLoading,
    error,
    refreshSnapshot,
  } = useSkillsData();
  const {
    downloadSkill,
    replaceSkill,
    uninstallSkill,
    uploadSkill,
    supportsSkillActions,
  } = useDesktopShell();
  const selectedSkillId = useUIStore((state) => state.selectedSkillId);
  const selectedNodeId = useUIStore((state) => state.selectedSkillNodeId);
  const contentMode = useUIStore((state) => state.skillsContentMode);
  const selectSkillItem = useUIStore((state) => state.selectSkillItem);
  const setSkillsContentMode = useUIStore(
    (state) => state.setSkillsContentMode,
  );
  const [expandedSkills, setExpandedSkills] = useState<string[]>([]);
  const [expandedDirectories, setExpandedDirectories] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewContentVisible, setPreviewContentVisible] = useState(true);
  const currentPreviewPath =
    selectedNode?.path ?? selectedSkill?.skillMdPath ?? null;
  const expectedPreviewKind = inferPreviewKindFromPath(currentPreviewPath);
  const showsMarkdownMode =
    preview?.kind === "markdown" || expectedPreviewKind === "markdown";
  const isSkillOverview = selectedSkill !== null && selectedNode === null;
  const canCopyPreview = Boolean(preview?.content);
  const [skillActionPending, setSkillActionPending] = useState<
    "replace" | "download" | "uninstall" | null
  >(null);
  const [creationActionPending, setCreationActionPending] = useState<
    "upload" | null
  >(null);
  const [remoteBrowserOpen, setRemoteBrowserOpen] = useState(false);
  const installedRemoteSkillIds = useMemo(
    () =>
      new Set(
        (snapshot?.skills ?? [])
          .filter((skill) => skill.sourceKind === "personal")
          .map((skill) => {
            const parts = skill.skillRoot.split("/");
            return parts[parts.length - 1] ?? skill.displayName;
          }),
      ),
    [snapshot?.skills],
  );

  useEffect(() => {
    if (!snapshot || snapshot.skills.length === 0) {
      setExpandedSkills([]);
      setExpandedDirectories([]);
      return;
    }

    setExpandedSkills((current) => {
      const preserved = current.filter((skillId) =>
        snapshot.skills.some((skill) => skill.id === skillId),
      );

      if (selectedSkillId && !preserved.includes(selectedSkillId)) {
        preserved.unshift(selectedSkillId);
      }

      if (preserved.length === 0) {
        preserved.push(snapshot.skills[0]!.id);
      }

      return preserved;
    });
    setExpandedDirectories((current) => {
      const validNodeIds = new Set(
        snapshot.skills.flatMap((skill) => collectDirectoryIds(skill.tree)),
      );
      return current.filter((nodeId) => validNodeIds.has(nodeId));
    });
  }, [selectedSkillId, snapshot]);

  const groupedSkills = useMemo(() => {
    const groups = new Map<SkillGroup, SkillRecord[]>();
    for (const group of ["personal", "project", "plugin"] as const) {
      groups.set(group, []);
    }

    for (const skill of snapshot?.skills ?? []) {
      if (!skillMatchesQuery(skill, searchQuery)) {
        continue;
      }

      groups.get(skill.sourceKind as SkillGroup)?.push({
        ...skill,
        tree: filterTreeNodes(skill.tree, searchQuery),
      });
    }

    return [...groups.entries()]
      .map(([group, skills]) => [group, skills] as const)
      .filter(([, skills]) => skills.length > 0)
      .sort(([left], [right]) => getSourceOrder(left) - getSourceOrder(right));
  }, [searchQuery, snapshot?.skills]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      return;
    }

    setExpandedSkills(
      groupedSkills.flatMap(([, skills]) => skills.map((skill) => skill.id)),
    );
    setExpandedDirectories(
      groupedSkills.flatMap(([, skills]) =>
        skills.flatMap((skill) => collectDirectoryIds(skill.tree)),
      ),
    );
  }, [groupedSkills, searchQuery]);

  useEffect(() => {
    setPreviewContentVisible(false);
    const frame = window.requestAnimationFrame(() => {
      setPreviewContentVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [contentMode, preview?.content, preview?.kind, preview?.path]);

  const toggleSkill = (skillId: string) => {
    setExpandedSkills((current) =>
      current.includes(skillId)
        ? current.filter((candidate) => candidate !== skillId)
        : [...current, skillId],
    );
  };

  const toggleDirectory = (nodeId: string) => {
    setExpandedDirectories((current) =>
      current.includes(nodeId)
        ? current.filter((candidate) => candidate !== nodeId)
        : [...current, nodeId],
    );
  };

  const handleCopyPreview = async () => {
    if (!preview?.content) {
      return;
    }

    try {
      await navigator.clipboard.writeText(preview.content);
      toast.success("已复制文件内容");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "复制失败");
    }
  };

  const handleReplaceSkill = async () => {
    if (!selectedSkill || skillActionPending) {
      return;
    }

    try {
      setSkillActionPending("replace");
      const result = await replaceSkill(selectedSkill.skillRoot);
      if (result.cancelled) {
        return;
      }

      refreshSnapshot();
      toast.success("Skill 已替换");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "替换 Skill 失败");
    } finally {
      setSkillActionPending(null);
    }
  };

  const handleDownloadSkill = async () => {
    if (!selectedSkill || skillActionPending) {
      return;
    }

    try {
      setSkillActionPending("download");
      const result = await downloadSkill(selectedSkill.skillRoot);
      if (result.cancelled) {
        return;
      }

      toast.success("Skill 压缩包已导出");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "下载 Skill 失败");
    } finally {
      setSkillActionPending(null);
    }
  };

  const handleUninstallSkill = async () => {
    if (!selectedSkill || skillActionPending) {
      return;
    }

    try {
      setSkillActionPending("uninstall");
      const result = await uninstallSkill(selectedSkill.skillRoot);
      if (result.cancelled) {
        return;
      }

      refreshSnapshot();
      toast.success("Skill 已卸载");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "卸载 Skill 失败");
    } finally {
      setSkillActionPending(null);
    }
  };

  const handleUploadSkill = async () => {
    if (creationActionPending) {
      return;
    }

    try {
      setCreationActionPending("upload");
      const result = await uploadSkill();
      if (result.cancelled) {
        return;
      }

      refreshSnapshot();
      toast.success("Skill 已上传");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "上传 Skill 失败");
    } finally {
      setCreationActionPending(null);
    }
  };

  const renderTree = (
    skill: SkillRecord,
    nodes: SkillTreeNode[],
    depth = 0,
  ): ReactNode =>
    nodes.map((node) => {
      const isDirectory = node.type === "directory";
      const isExpanded = expandedDirectories.includes(node.id);
      const isSelected =
        selectedSkillId === skill.id && selectedNodeId === node.id;

      return (
        <div key={`${skill.id}:${node.id}`}>
          <button
            type="button"
            onClick={() => {
              if (isDirectory) {
                toggleDirectory(node.id);
                return;
              }

              selectSkillItem(skill.id, node.id);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-left transition-colors duration-150",
              isSelected
                ? "bg-[var(--color-sidebar-active)] text-[var(--color-fg)]"
                : "text-[var(--color-fg)]/78 hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-fg)]",
            )}
            style={{ paddingLeft: `${depth * 18 + 10}px` }}
          >
            {isDirectory ? (
              <>
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-[var(--color-muted)]",
                    isExpanded && "rotate-90",
                  )}
                />
                {isExpanded ? (
                  <FolderOpen className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
                ) : (
                  <Folder className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
                )}
              </>
            ) : (
              <>
                <span className="w-3.5 shrink-0" />
                <FileCode2 className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
              </>
            )}
            <span className="min-w-0 truncate text-[length:var(--ui-font-size-sm)]">
              {node.name}
            </span>
          </button>
          {isDirectory && isExpanded && node.children?.length
            ? renderTree(skill, node.children, depth + 1)
            : null}
        </div>
      );
    });

  return (
    <Panel className="flex h-full min-h-0 overflow-hidden rounded-[12px] border border-[var(--color-border)] bg-[var(--color-panel)]">
      <section className="flex w-[320px] min-w-[320px] flex-col border-r border-[var(--color-border)]">
        <div className="border-b border-[var(--color-border)] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h2 className="m-0 text-[length:var(--ui-font-size-xl)] font-semibold tracking-[-0.03em] text-[var(--color-fg)]">
                Skills
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <ToolbarIcon
                label={searchOpen ? "收起搜索" : "搜索技能"}
                icon={Search}
                onClick={() => {
                  setSearchOpen((current) => !current);
                  if (searchOpen) {
                    setSearchQuery("");
                  }
                }}
              />
              <SkillsCreateMenu
                bridgeReady={supportsSkillActions}
                uploadPending={creationActionPending === "upload"}
                onBrowseSkills={() => {
                  setRemoteBrowserOpen(true);
                }}
                onCreateWithRWork={() => {
                  toast.info("敬请期待");
                }}
                onUploadSkill={() => {
                  void handleUploadSkill();
                }}
              />
            </div>
          </div>
          {searchOpen ? (
            <div className="mt-3">
              <label className="flex items-center gap-2 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-muted)]">
                <Search className="h-4 w-4 shrink-0" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="搜索技能或文件"
                  aria-label="搜索技能或文件"
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[var(--color-fg)] outline-none placeholder:text-[var(--color-muted)]"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    aria-label="清空技能搜索"
                    onClick={() => setSearchQuery("")}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors duration-150 hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-fg)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </label>
            </div>
          ) : null}
        </div>

        <ScrollArea className="min-h-0 flex-1 px-3 py-4">
          {snapshotLoading ? (
            <SidebarInfo text="正在加载技能列表..." />
          ) : groupedSkills.length === 0 ? (
            <SidebarInfo
              text={
                searchQuery.trim()
                  ? "没有匹配的 Skill 或文件。"
                  : "当前没有可展示的 Skill。"
              }
            />
          ) : (
            <div className="space-y-5">
              {groupedSkills.map(([group, skills]) => (
                <div key={group} className="space-y-2">
                  <div className="px-2 text-[length:var(--ui-font-size-2xs)] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {groupTitles[group]}
                  </div>
                  <div className="space-y-1">
                    {skills.map((skill) => {
                      const isExpanded = expandedSkills.includes(skill.id);
                      const isSelectedRoot =
                        selectedSkillId === skill.id && selectedNodeId === null;

                      return (
                        <div key={skill.id} className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              selectSkillItem(skill.id, null);
                              toggleSkill(skill.id);
                            }}
                            className={cn(
                              "group flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left transition-colors duration-150",
                              isSelectedRoot
                                ? "bg-[var(--color-sidebar-active)] text-[var(--color-fg)]"
                                : "text-[var(--color-fg)]/82 hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-fg)]",
                            )}
                            aria-label={isExpanded ? "折叠技能" : "展开技能"}
                          >
                            <BookOpenText className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {skill.displayName}
                            </span>
                            <ChevronRight
                              className={cn(
                                "h-3.5 w-3.5 shrink-0 text-[var(--color-muted)]",
                                isExpanded && "rotate-90",
                              )}
                            />
                          </button>
                          {isExpanded ? (
                            <div className="space-y-0.5">
                              {renderTree(skill, skill.tree, 1)}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </section>

      <section className="min-w-0 flex flex-1 flex-col">
        {selectedSkill ? (
          <>
            {isSkillOverview ? (
              <div className="border-[var(--color-border)] px-6 py-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Sparkles className="h-5 w-5 shrink-0 text-[var(--color-accent)]" />
                      <h2 className="m-0 truncate text-[length:var(--ui-font-size-xl)] font-semibold tracking-[-0.03em] text-[var(--color-fg)]">
                        {selectedSkill.displayName}
                      </h2>
                    </div>
                    <SkillActionsMenu
                      skillName={selectedSkill.displayName}
                      bridgeReady={supportsSkillActions}
                      busyAction={skillActionPending}
                      onStartChat={() => {
                        toast.info("敬请期待");
                      }}
                      onReplace={() => {
                        void handleReplaceSkill();
                      }}
                      onDownload={() => {
                        void handleDownloadSkill();
                      }}
                      onUninstall={() => {
                        void handleUninstallSkill();
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap items-start gap-6 text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
                    <MetadataItem
                      label="Added by"
                      value={selectedSkill.addedBy}
                    />
                    <MetadataItem
                      label="Last updated"
                      value={formatDateLabel(selectedSkill.lastUpdated)}
                    />
                    <MetadataItem
                      label="Invoked by"
                      value={selectedSkill.invokedBy}
                    />
                    <MetadataItem
                      label="Source"
                      value={selectedSkill.sourceLabel}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex items-center gap-1.5 text-[length:var(--ui-font-size-xs)] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    <span>Description</span>
                    <Tooltip content="RWork 会根据这些描述来决定在聊天中使用哪些技能。">
                      <span className="inline-flex">
                        <Info className="h-3.5 w-3.5 cursor-help text-[var(--color-muted)]/80" />
                      </span>
                    </Tooltip>
                  </div>
                  <p className="m-0 whitespace-pre-wrap text-[length:var(--ui-font-size-md)] leading-6 text-[var(--color-fg)]/88">
                    {selectedSkill.description}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="min-h-0 flex flex-1 px-6 py-5">
              <Panel className="flex min-h-0 flex-1 min-w-0 flex-col overflow-hidden rounded-[12px] border border-[var(--color-border)] bg-[var(--color-bg)] shadow-none">
                <div className="flex shrink-0 items-center justify-between border-[var(--color-border)] px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-[var(--color-fg)]">
                      {selectedNode?.relativePath ?? "SKILL.md"}
                    </div>
                  </div>
                  <div className="min-w-[76px]">
                    <div className={cn("flex items-center justify-end gap-1")}>
                      <IconToolbarButton
                        label="复制"
                        icon={Copy}
                        onClick={() => {
                          void handleCopyPreview();
                        }}
                        disabled={!canCopyPreview}
                      />
                      <div
                        className={cn(
                          "flex items-center justify-end gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1 transition-opacity duration-150",
                          showsMarkdownMode
                            ? "opacity-100"
                            : "pointer-events-none opacity-0",
                        )}
                      >
                        <ModeIconButton
                          label="预览"
                          icon={Eye}
                          active={contentMode === "preview"}
                          onClick={() => setSkillsContentMode("preview")}
                        />
                        <ModeIconButton
                          label="源码"
                          icon={Code2}
                          active={contentMode === "source"}
                          onClick={() => setSkillsContentMode("source")}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative min-h-0 flex-1">
                  <ScrollArea className="h-full px-5 py-5">
                    <div className="relative min-h-full">
                      <div
                        className={cn(
                          "skills-preview-surface min-h-[420px]",
                          previewContentVisible && "is-visible",
                        )}
                      >
                        {renderPreviewContent(preview, contentMode)}
                      </div>
                      {previewLoading ? (
                        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-3">
                          <div className="rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-panel)_88%,transparent)] px-3 py-1 text-[length:var(--ui-font-size-xs)] text-[var(--color-muted)] shadow-sm backdrop-blur-sm">
                            正在加载文件内容...
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </ScrollArea>
                </div>
              </Panel>
            </div>
          </>
        ) : snapshotLoading ? (
          <CenteredInfo text="正在准备技能详情..." />
        ) : (
          <CenteredInfo text="左侧选择一个 Skill 后查看详情。" />
        )}
        {error ? (
          <div className="border-t border-[var(--color-border)] px-6 py-3 text-[length:var(--ui-font-size-sm)] text-[var(--color-danger,#c2410c)]">
            {error}
          </div>
        ) : null}
      </section>
      <RemoteSkillsBrowser
        open={remoteBrowserOpen}
        onOpenChange={setRemoteBrowserOpen}
        onInstalled={refreshSnapshot}
        installedSkillIds={installedRemoteSkillIds}
      />
    </Panel>
  );
}

function SidebarInfo({ text }: { text: string }) {
  return (
    <div className="flex min-h-[160px] items-center justify-center px-4 text-center text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
      {text}
    </div>
  );
}

function CenteredInfo({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center px-8 text-center text-[length:var(--ui-font-size-md)] text-[var(--color-muted)]">
      {text}
    </div>
  );
}

function ToolbarIcon({
  label,
  icon: Icon,
  disabled = false,
  onClick,
}: {
  label: string;
  icon: typeof Search;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const button = (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150",
        disabled
          ? "cursor-not-allowed text-[var(--color-muted)]/45"
          : "text-[var(--color-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-fg)]",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return disabled ? (
    <Tooltip content={label}>
      <span>{button}</span>
    </Tooltip>
  ) : (
    <Tooltip content={label}>{button}</Tooltip>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[length:var(--ui-font-size-xs)] uppercase tracking-[0.12em] text-[var(--color-muted)]">
        {label}
      </div>
      <div className="font-medium text-[var(--color-fg)]/86">{value}</div>
    </div>
  );
}

function ModeIconButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: typeof Eye;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] transition-colors duration-150",
        active
          ? "bg-[var(--color-panel)] text-[var(--color-fg)] shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
          : "text-[var(--color-muted)] hover:text-[var(--color-fg)]",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function IconToolbarButton({
  label,
  icon: Icon,
  onClick,
  disabled = false,
}: {
  label: string;
  icon: typeof Copy;
  onClick: () => void;
  disabled?: boolean;
}) {
  const button = (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] transition-colors duration-150",
        disabled
          ? "cursor-not-allowed text-[var(--color-muted)]/45"
          : "text-[var(--color-muted)] hover:text-[var(--color-fg)]",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );

  return disabled ? (
    <Tooltip content={`${label}（当前不可用）`}>
      <span>{button}</span>
    </Tooltip>
  ) : (
    <Tooltip content={label}>{button}</Tooltip>
  );
}

function SkillActionsMenu({
  skillName,
  bridgeReady,
  busyAction,
  onStartChat,
  onReplace,
  onDownload,
  onUninstall,
}: {
  skillName: string;
  bridgeReady: boolean;
  busyAction: "replace" | "download" | "uninstall" | null;
  onStartChat: () => void;
  onReplace: () => void;
  onDownload: () => void;
  onUninstall: () => void;
}) {
  const isBusy = busyAction !== null;
  const actionsDisabled = isBusy || !bridgeReady;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <button
          type="button"
          aria-label={`${skillName} 更多操作`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] transition-colors duration-150 hover:text-[var(--color-fg)]"
        >
          <Ellipsis className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        side="bottom"
        align="end"
        sideOffset={8}
        className="z-40 min-w-[188px] overflow-hidden rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-1 shadow-[var(--shadow-panel)] outline-none"
      >
        <SkillActionItem
          label="发起对话"
          icon={MessageSquarePlus}
          disabled={isBusy}
          onSelect={onStartChat}
        />
        <SkillActionItem
          label={busyAction === "replace" ? "替换中..." : "替换"}
          icon={RefreshCcw}
          disabled={actionsDisabled}
          onSelect={onReplace}
        />
        <SkillActionItem
          label={busyAction === "download" ? "下载中..." : "下载"}
          icon={Download}
          disabled={actionsDisabled}
          onSelect={onDownload}
        />
        <DropdownMenu.Separator className="mx-1 my-1 h-px bg-[var(--color-border)]" />
        <SkillActionItem
          label={busyAction === "uninstall" ? "卸载中..." : "卸载"}
          icon={Trash2}
          disabled={actionsDisabled}
          danger
          onSelect={onUninstall}
        />
        {!bridgeReady ? (
          <>
            <DropdownMenu.Separator className="mx-1 my-1 h-px bg-[var(--color-border)]" />
            <div className="px-3 py-2 text-[11px] leading-4 text-[var(--color-muted)]">
              技能管理桥接未更新，请重启 `bun run desktop:dev`
            </div>
          </>
        ) : null}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

function SkillsCreateMenu({
  bridgeReady,
  uploadPending,
  onBrowseSkills,
  onCreateWithRWork,
  onUploadSkill,
}: {
  bridgeReady: boolean;
  uploadPending: boolean;
  onBrowseSkills: () => void;
  onCreateWithRWork: () => void;
  onUploadSkill: () => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <button
          type="button"
          aria-label="新增技能"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors duration-150 hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-fg)]"
        >
          <Plus className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        side="bottom"
        align="end"
        sideOffset={8}
        className="z-40 min-w-[208px] overflow-hidden rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-1 shadow-[var(--shadow-panel)] outline-none"
      >
        <SkillActionItem
          label="浏览 Skills"
          icon={LibraryBig}
          onSelect={onBrowseSkills}
        />
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger className="flex cursor-pointer items-center justify-between rounded-[12px] px-3 py-2 text-[13px] text-[var(--color-fg)] outline-none transition-colors duration-150 focus:bg-[var(--color-surface)]">
            <span className="inline-flex items-center gap-2">
              <WandSparkles className="h-4 w-4 shrink-0" />
              创建 Skill
            </span>
          </DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent
            sideOffset={8}
            className="z-40 min-w-[208px] overflow-hidden rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-1 shadow-[var(--shadow-panel)] outline-none"
          >
            <SkillActionItem
              label="使用 RWork 创建"
              icon={Sparkles}
              onSelect={onCreateWithRWork}
            />
            <SkillActionItem
              label={uploadPending ? "上传中..." : "上传技能"}
              icon={Upload}
              disabled={!bridgeReady || uploadPending}
              onSelect={onUploadSkill}
            />
            {!bridgeReady ? (
              <>
                <DropdownMenu.Separator className="mx-1 my-1 h-px bg-[var(--color-border)]" />
                <div className="px-3 py-2 text-[11px] leading-4 text-[var(--color-muted)]">
                  技能管理桥接未更新，请重启 `bun run desktop:dev`
                </div>
              </>
            ) : null}
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

function SkillActionItem({
  label,
  icon: Icon,
  disabled = false,
  danger = false,
  onSelect,
}: {
  label: string;
  icon: typeof Download;
  disabled?: boolean;
  danger?: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-[12px] px-3 py-2 text-[13px] outline-none transition-colors duration-150",
        danger
          ? "text-[#dc2626] focus:bg-[rgba(220,38,38,0.08)]"
          : "text-[var(--color-fg)] focus:bg-[var(--color-surface)]",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </DropdownMenu.Item>
  );
}
