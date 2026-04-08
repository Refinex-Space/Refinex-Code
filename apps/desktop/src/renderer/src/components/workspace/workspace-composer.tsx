import { DropdownMenu } from "@radix-ui/themes";
import {
  Activity,
  ArrowUp,
  BarChart3,
  Brain,
  Check,
  Gauge,
  Mic,
  MicOff,
  Package,
  Plus,
  Search,
  X,
  Zap,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";
import { useVoiceDictation } from "@renderer/hooks/use-voice-dictation";
import { Tooltip } from "@renderer/components/ui/tooltip";
import { cn } from "@renderer/lib/cn";
import { getErrorMessage } from "@renderer/lib/errors";
import { type ThreadConversationMode, useUIStore } from "@renderer/stores/ui";
import type {
  AppInfo,
  SkillRecord,
  SkillSnapshot,
} from "../../../../shared/contracts";
import type {
  DesktopProviderId,
  DesktopProviderSettingsSnapshot,
  ProviderModelCatalogEntry,
  ProviderReasoningEffort,
} from "../../../../shared/provider-settings";
import {
  getProviderCatalogEntry,
  getProviderModelCatalog,
  getSupportedProviderEffortLevels,
  normalizeProviderEffort,
  normalizeProviderModel,
} from "../../../../shared/provider-settings";

const INPUT_MAX_HEIGHT = 152;
const SLASH_SUGGESTIONS_LIST_ID = "workspace-composer-slash-suggestions";
const SLASH_FLOATING_LAYER_POSITION_CLASS = "absolute inset-x-0 bottom-full mb-1.5";
const claudeLogoUrl = new URL(
  "../../../../../resources/provider-logos/claude.svg",
  import.meta.url,
).href;
const openAiLogoUrl = new URL(
  "../../../../../resources/provider-logos/open-ai.svg",
  import.meta.url,
).href;

const providerLabels: Record<DesktopProviderId, string> = {
  anthropic: "Claude",
  codex: "Codex",
};

const reasoningLabels: Record<ProviderReasoningEffort, string> = {
  minimal: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "XHigh",
};

interface WorkspaceComposerProps {
  activeSessionTitle: string | null;
  activeSessionId: string | null;
  activeWorktreePath: string | null;
  conversationMode: ThreadConversationMode;
  guiConversationSending?: boolean;
  hasActiveSession: boolean;
  hasWorktree: boolean;
  onSendGuiMessage?: (input: {
    prompt: string;
    providerId: DesktopProviderId;
    model: string;
    effort: ProviderReasoningEffort;
  }) => Promise<void>;
}

function supportsProviderSettingsBridge() {
  return (
    typeof window !== "undefined" &&
    typeof window.desktopApp?.getProviderSettings === "function"
  );
}

function getProviderDefaults(
  snapshot: DesktopProviderSettingsSnapshot,
  providerId: DesktopProviderId,
) {
  if (providerId === "codex") {
    const model = normalizeProviderModel(
      providerId,
      snapshot.codex.defaultModel,
      snapshot.codexModels,
    );
    return {
      providerId,
      model,
      effort: normalizeProviderEffort(
        providerId,
        model,
        snapshot.codex.defaultReasoningEffort,
        snapshot.codexModels,
      ),
    };
  }

  const model = normalizeProviderModel(
    providerId,
    snapshot.anthropic.defaultModel,
    snapshot.codexModels,
  );
  return {
    providerId,
    model,
    effort: normalizeProviderEffort(
      providerId,
      model,
      snapshot.anthropic.defaultReasoningEffort,
      snapshot.codexModels,
    ),
  };
}

type SlashSuggestionKind = "skill" | "prompt-command" | "status-card";

interface SlashSuggestion {
  id: string;
  label: string;
  description: string;
  commandName: string;
  insertValue: string;
  kind: SlashSuggestionKind;
  helperText?: string;
  placeholderText?: string;
  selectionLabel?: string;
  icon?: "search" | "sparkles";
}

interface SlashSuggestionSection {
  id: string;
  title: string;
  suggestions: SlashSuggestion[];
}

interface SlashPreviewCardData {
  title: string;
  commandLabel: string;
  accentClassName: string;
  icon: "status" | "stats" | "usage";
  rows: Array<{
    label: string;
    value: string;
  }>;
}

const initCommandSuggestions: SlashSuggestion[] = [
  {
    id: "builtin:init",
    label: "Init",
    description: "初始化 AGENTS.md 与代码库文档化入口。",
    commandName: "init",
    insertValue: "/init",
    kind: "prompt-command",
    helperText: "直接发送即可；CLI 会先扫描代码库，并通过提问逐步确定 AGENTS、skills 和 hooks 的产出范围。",
    placeholderText: "直接发送，开始扫描代码库并初始化 AGENTS / skills / hooks",
    selectionLabel: "已选择初始化命令",
    icon: "sparkles",
  },
];

const reviewCommandSuggestions: SlashSuggestion[] = [
  {
    id: "builtin:review",
    label: "Review",
    description: "审查当前 PR 或指定 PR；留空发送时 CLI 会先列出可审查的 open PR。",
    commandName: "review",
    insertValue: "/review ",
    kind: "prompt-command",
    helperText: "输入 PR 编号；留空发送时，CLI 会先列出可审查的 open PR。",
    placeholderText: "输入 PR 编号，留空发送会先列出 open PR",
    selectionLabel: "已选择代码审查命令",
    icon: "search",
  },
  {
    id: "builtin:pr-comments",
    label: "PR Comments",
    description: "先拉取 GitHub PR comments，再进入评论梳理与后续处理。",
    commandName: "pr-comments",
    insertValue: "/pr-comments ",
    kind: "prompt-command",
    helperText: "输入 PR 编号，先拉取这条 PR 的 comments 作为后续处理上下文。",
    placeholderText: "输入 PR 编号以拉取 GitHub PR comments",
    selectionLabel: "已选择代码审查命令",
    icon: "search",
  },
  {
    id: "builtin:security-review",
    label: "Security Review",
    description: "对当前分支待提交改动做高置信安全审查；通常直接发送即可。",
    commandName: "security-review",
    insertValue: "/security-review ",
    kind: "prompt-command",
    helperText: "通常直接发送即可，CLI 会基于当前分支改动做安全审查。",
    placeholderText: "直接回车，开始审查当前分支待提交改动",
    selectionLabel: "已选择代码审查命令",
    icon: "search",
  },
];

const statusCommandSuggestions: SlashSuggestion[] = [
  {
    id: "builtin:status",
    label: "Status",
    description: "查看版本、模型、账号、连通性和工具状态的桌面快照。",
    commandName: "status",
    insertValue: "/status ",
    kind: "status-card",
  },
  {
    id: "builtin:stats",
    label: "Stats",
    description: "查看当前桌面会话的活跃度与使用上下文预览。",
    commandName: "stats",
    insertValue: "/stats ",
    kind: "status-card",
  },
  {
    id: "builtin:usage",
    label: "Usage",
    description: "查看 plan usage limits 的入口说明与当前 provider 适用性。",
    commandName: "usage",
    insertValue: "/usage ",
    kind: "status-card",
  },
];

function shouldShowSlashSuggestions(value: string) {
  return value.startsWith("/") && !value.includes(" ");
}

function supportsAppInfoBridge() {
  return (
    typeof window !== "undefined" &&
    typeof window.desktopApp?.getAppInfo === "function"
  );
}

function normalizeSlashSuggestionDescription(description: string) {
  return description.replace(/\s+/g, " ").trim();
}

function getPathTailSegment(path: string | null) {
  if (!path) {
    return "未打开";
  }

  const segments = path.split("/").filter(Boolean);
  return segments.at(-1) ?? path;
}

function getSlashSuggestionScore(
  query: string,
  options: {
    name: string;
    label: string;
    description: string;
  },
) {
  const normalizedName = options.name.toLowerCase();
  const normalizedLabel = options.label.toLowerCase();
  const normalizedDescription = options.description.toLowerCase();
  const parts = [...new Set([
    ...normalizedName.split(/[:_-\s]+/g),
    ...normalizedLabel.split(/[:_-\s]+/g),
  ])].filter(Boolean);

  if (normalizedName === query || normalizedLabel === query) {
    return 0;
  }

  if (normalizedName.startsWith(query)) {
    return 1;
  }

  if (normalizedLabel.startsWith(query)) {
    return 2;
  }

  if (parts.some((part) => part.startsWith(query))) {
    return 3;
  }

  if (
    normalizedName.includes(query) ||
    normalizedLabel.includes(query)
  ) {
    return 4;
  }

  if (normalizedDescription.includes(query)) {
    return 5;
  }

  return Number.POSITIVE_INFINITY;
}

function formatSkillSuggestionLabel(skill: SkillRecord) {
  const rawLabel =
    skill.displayName || skill.name.split(":").at(-1) || skill.name;

  return rawLabel
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildSlashSkillSuggestions(
  query: string,
  snapshot: SkillSnapshot | null,
): SlashSuggestion[] {
  if (!snapshot) {
    return [];
  }
  const invocableSkills = snapshot.skills.filter((skill) => skill.userInvocable);

  if (query.length === 0) {
    return invocableSkills.map((skill) => ({
      id: skill.id,
      label: formatSkillSuggestionLabel(skill),
      description: normalizeSlashSuggestionDescription(skill.description),
      commandName: skill.name,
      insertValue: `/${skill.name} `,
      kind: "skill",
    }));
  }

  return invocableSkills
    .map((skill, index) => {
      const displayName = (skill.displayName || skill.name).toLowerCase();
      const normalizedName = skill.name.toLowerCase();
      const description = skill.description.toLowerCase().replace(/\s+/g, " ");
      const parts = [...new Set([
        ...normalizedName.split(/[:_-]/g),
        ...displayName.split(/[:_-]/g),
      ])].filter(Boolean);

      let score = Number.POSITIVE_INFINITY;

      if (normalizedName === query || displayName === query) {
        score = 0;
      } else if (normalizedName.startsWith(query)) {
        score = 1;
      } else if (displayName.startsWith(query)) {
        score = 2;
      } else if (parts.some((part) => part.startsWith(query))) {
        score = 3;
      } else if (
        normalizedName.includes(query) ||
        displayName.includes(query)
      ) {
        score = 4;
      } else if (description.includes(query)) {
        score = 5;
      }

      if (!Number.isFinite(score)) {
        return null;
      }

      return {
        index,
        score,
        suggestion: {
          id: skill.id,
          label: formatSkillSuggestionLabel(skill),
          description: normalizeSlashSuggestionDescription(skill.description),
          commandName: skill.name,
          insertValue: `/${skill.name} `,
          kind: "skill",
        },
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        index: number;
        score: number;
        suggestion: SlashSuggestion;
      } => entry !== null,
    )
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.suggestion);
}

function buildReviewCommandSuggestions(query: string): SlashSuggestion[] {
  if (query.length === 0) {
    return reviewCommandSuggestions;
  }

  return reviewCommandSuggestions
    .map((suggestion, index) => ({
      index,
      score: getSlashSuggestionScore(query, {
        name: suggestion.commandName,
        label: suggestion.label,
        description: suggestion.description,
      }),
      suggestion,
    }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.suggestion);
}

function buildInitCommandSuggestions(query: string): SlashSuggestion[] {
  if (query.length === 0) {
    return initCommandSuggestions;
  }

  return initCommandSuggestions
    .map((suggestion, index) => ({
      index,
      score: getSlashSuggestionScore(query, {
        name: suggestion.commandName,
        label: suggestion.label,
        description: suggestion.description,
      }),
      suggestion,
    }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.suggestion);
}

function buildStatusCommandSuggestions(query: string): SlashSuggestion[] {
  if (query.length === 0) {
    return statusCommandSuggestions;
  }

  return statusCommandSuggestions
    .map((suggestion, index) => ({
      index,
      score: getSlashSuggestionScore(query, {
        name: suggestion.commandName,
        label: suggestion.label,
        description: suggestion.description,
      }),
      suggestion,
    }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.suggestion);
}

function buildSlashSuggestionSections(
  value: string,
  snapshot: SkillSnapshot | null,
): SlashSuggestionSection[] {
  if (!shouldShowSlashSuggestions(value)) {
    return [];
  }

  const query = value.slice(1).trim().toLowerCase();
  const sections: SlashSuggestionSection[] = [];
  const initSuggestions = buildInitCommandSuggestions(query);
  const reviewSuggestions = buildReviewCommandSuggestions(query);
  const statusSuggestions = buildStatusCommandSuggestions(query);
  const skillSuggestions = buildSlashSkillSuggestions(query, snapshot);

  if (initSuggestions.length > 0) {
    sections.push({
      id: "init",
      title: "初始化",
      suggestions: initSuggestions,
    });
  }

  if (reviewSuggestions.length > 0) {
    sections.push({
      id: "review",
      title: "代码审查",
      suggestions: reviewSuggestions,
    });
  }

  if (statusSuggestions.length > 0) {
    sections.push({
      id: "status",
      title: "状态、诊断与运营",
      suggestions: statusSuggestions,
    });
  }

  if (skillSuggestions.length > 0) {
    sections.push({
      id: "skills",
      title: "技能",
      suggestions: skillSuggestions,
    });
  }

  return sections;
}

function buildSlashPreviewCardData(params: {
  suggestion: SlashSuggestion;
  appInfo: AppInfo | null;
  providerId: DesktopProviderId;
  modelLabel: string;
  activeSessionTitle: string | null;
  activeWorktreePath: string | null;
  conversationMode: ThreadConversationMode;
  skillSnapshot: SkillSnapshot | null;
}): SlashPreviewCardData {
  const {
    suggestion,
    appInfo,
    providerId,
    modelLabel,
    activeSessionTitle,
    activeWorktreePath,
    conversationMode,
    skillSnapshot,
  } = params;
  const projectLabel = getPathTailSegment(activeWorktreePath);
  const sessionLabel = activeSessionTitle ?? "未选择线程";
  const providerLabel = providerLabels[providerId];
  const invocableSkillCount = skillSnapshot?.skills.filter(
    (skill) => skill.userInvocable,
  ).length ?? 0;

  switch (suggestion.commandName) {
    case "status":
      return {
        title: "运行状态总览",
        commandLabel: "/status",
        accentClassName:
          "border-[rgba(14,165,233,0.22)] bg-[linear-gradient(180deg,rgba(240,249,255,0.98)_0%,rgba(232,244,255,0.86)_100%)] dark:border-[rgba(56,189,248,0.22)] dark:bg-[linear-gradient(180deg,rgba(12,24,40,0.96)_0%,rgba(10,37,64,0.86)_100%)]",
        icon: "status",
        rows: [
          {
            label: "Desktop 版本",
            value: appInfo?.appVersion ?? "未知",
          },
          {
            label: "当前模型",
            value: `${providerLabel} · ${modelLabel}`,
          },
          {
            label: "当前线程",
            value: sessionLabel,
          },
          {
            label: "当前项目",
            value: projectLabel,
          },
        ],
      };
    case "stats":
      return {
        title: "使用统计预览",
        commandLabel: "/stats",
        accentClassName:
          "border-[rgba(59,130,246,0.2)] bg-[linear-gradient(180deg,rgba(239,246,255,0.98)_0%,rgba(238,242,255,0.88)_100%)] dark:border-[rgba(96,165,250,0.18)] dark:bg-[linear-gradient(180deg,rgba(22,27,46,0.96)_0%,rgba(19,34,69,0.88)_100%)]",
        icon: "stats",
        rows: [
          {
            label: "交互模式",
            value: conversationMode.toUpperCase(),
          },
          {
            label: "活跃线程",
            value: sessionLabel,
          },
          {
            label: "可用技能",
            value: `${invocableSkillCount} 个`,
          },
          {
            label: "项目上下文",
            value: projectLabel,
          },
        ],
      };
    default:
      return {
        title: "额度与账户概览",
        commandLabel: "/usage",
        accentClassName:
          "border-[rgba(245,158,11,0.24)] bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(255,247,237,0.9)_100%)] dark:border-[rgba(245,158,11,0.22)] dark:bg-[linear-gradient(180deg,rgba(49,28,12,0.96)_0%,rgba(66,36,10,0.88)_100%)]",
        icon: "usage",
        rows: [
          {
            label: "当前 Provider",
            value: providerLabel,
          },
          {
            label: "当前模型",
            value: modelLabel,
          },
          {
            label: "账户范围",
            value: "Claude 账号可见",
          },
          {
            label: "额度状态",
            value: "Desktop 暂未接入",
          },
        ],
      };
  }
}

function getSlashSuggestionIconClassName(
  suggestion: SlashSuggestion,
  selected: boolean,
) {
  if (suggestion.kind === "status-card") {
    return selected
      ? "bg-[rgba(15,118,110,0.16)] text-[rgb(15,118,110)] dark:bg-[rgba(45,212,191,0.14)] dark:text-[rgb(94,234,212)]"
      : "bg-[rgba(13,148,136,0.12)] text-[rgb(15,118,110)] dark:bg-[rgba(45,212,191,0.1)] dark:text-[rgb(94,234,212)]";
  }

  if (suggestion.kind === "prompt-command") {
    return selected
      ? "bg-[rgba(14,165,233,0.18)] text-[rgb(3,105,161)] dark:bg-[rgba(56,189,248,0.16)] dark:text-[rgb(125,211,252)]"
      : "bg-[rgba(14,165,233,0.12)] text-[rgb(14,116,144)] dark:bg-[rgba(56,189,248,0.12)] dark:text-[rgb(103,232,249)]";
  }

  return selected
    ? "bg-[rgba(99,102,241,0.18)] text-[rgb(79,70,229)]"
    : "bg-[rgba(148,163,184,0.12)] text-[var(--color-muted)]";
}

function renderSlashSuggestionIcon(suggestion: SlashSuggestion) {
  if (suggestion.kind === "status-card") {
    if (suggestion.commandName === "status") {
      return <Activity className="h-3.5 w-3.5" aria-hidden="true" />;
    }

    if (suggestion.commandName === "stats") {
      return <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />;
    }

    return <Gauge className="h-3.5 w-3.5" aria-hidden="true" />;
  }

  if (suggestion.kind === "prompt-command") {
    if (suggestion.icon === "sparkles") {
      return <Zap className="h-3.5 w-3.5" aria-hidden="true" />;
    }

    return <Search className="h-3.5 w-3.5" aria-hidden="true" />;
  }

  return <Package className="h-3.5 w-3.5" aria-hidden="true" />;
}

export function WorkspaceComposer({
  activeSessionTitle,
  activeSessionId,
  activeWorktreePath,
  conversationMode,
  guiConversationSending = false,
  hasActiveSession,
  hasWorktree,
  onSendGuiMessage,
}: WorkspaceComposerProps) {
  const [value, setValue] = useState("");
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [providerSnapshot, setProviderSnapshot] =
    useState<DesktopProviderSettingsSnapshot | null>(null);
  const [skillSnapshot, setSkillSnapshot] = useState<SkillSnapshot | null>(null);
  const [selectedSlashCommand, setSelectedSlashCommand] =
    useState<SlashSuggestion | null>(null);
  const [selectedStatusPreview, setSelectedStatusPreview] =
    useState<SlashSuggestion | null>(null);
  const [selectedSkillPills, setSelectedSkillPills] = useState<
    SlashSuggestion[]
  >([]);
  const [selectedSlashSuggestionIndex, setSelectedSlashSuggestionIndex] =
    useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewCardRef = useRef<HTMLDivElement | null>(null);
  const slashSuggestionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const composerValue = selectedSlashCommand
    ? `${selectedSlashCommand.insertValue}${value}`
    : `${selectedSkillPills.map((skill) => skill.insertValue).join("")}${value}`;
  const hasDraft = composerValue.trim().length > 0;
  const canSend = hasActiveSession && hasDraft && !guiConversationSending;
  const canUseDictation = hasActiveSession;

  const composerControlsHydrated = useUIStore(
    (state) => state.composerControlsHydrated,
  );
  const composerProviderId = useUIStore((state) => state.composerProviderId);
  const composerModel = useUIStore((state) => state.composerModel);
  const composerEffort = useUIStore((state) => state.composerEffort);
  const hydrateComposerControls = useUIStore(
    (state) => state.hydrateComposerControls,
  );
  const setComposerProviderSelection = useUIStore(
    (state) => state.setComposerProviderSelection,
  );
  const setComposerModelSelection = useUIStore(
    (state) => state.setComposerModelSelection,
  );
  const setComposerEffortSelection = useUIStore(
    (state) => state.setComposerEffortSelection,
  );

  useEffect(() => {
    if (!supportsAppInfoBridge()) {
      return;
    }

    let cancelled = false;

    void window.desktopApp
      .getAppInfo()
      .then((info) => {
        if (!cancelled) {
          setAppInfo(info);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAppInfo(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!supportsProviderSettingsBridge()) {
      return;
    }

    let cancelled = false;

    void window.desktopApp
      .getProviderSettings()
      .then((snapshot) => {
        if (cancelled) {
          return;
        }

        setProviderSnapshot(snapshot);
      })
      .catch(() => {
        if (!cancelled) {
          setProviderSnapshot(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void window.desktopApp
      .getSkillsSnapshot()
      .then((snapshot) => {
        if (!cancelled) {
          setSkillSnapshot(snapshot);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSkillSnapshot(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeWorktreePath]);

  useEffect(() => {
    if (!providerSnapshot || composerControlsHydrated) {
      return;
    }

    hydrateComposerControls(
      getProviderDefaults(providerSnapshot, providerSnapshot.activeProviderId),
    );
  }, [composerControlsHydrated, hydrateComposerControls, providerSnapshot]);

  const providerCatalog = useMemo(
    () =>
      getProviderModelCatalog(
        composerProviderId,
        providerSnapshot?.codexModels,
      ),
    [composerProviderId, providerSnapshot?.codexModels],
  );

  const selectedModelEntry = useMemo(
    () =>
      getProviderCatalogEntry(
        composerProviderId,
        composerModel,
        providerSnapshot?.codexModels,
      ),
    [composerModel, composerProviderId, providerSnapshot?.codexModels],
  );

  const supportedEffortLevels = useMemo(
    () =>
      getSupportedProviderEffortLevels(
        composerProviderId,
        composerModel,
        providerSnapshot?.codexModels,
      ),
    [composerModel, composerProviderId, providerSnapshot?.codexModels],
  );

  const providerButtonLabel = providerLabels[composerProviderId];
  const modelButtonLabel = selectedModelEntry?.label ?? composerModel;
  const effortSupported = supportedEffortLevels.length > 0;
  const effortButtonLabel = effortSupported
    ? reasoningLabels[composerEffort]
    : "N/A";
  const slashSuggestionSections = useMemo(
    () => buildSlashSuggestionSections(value, skillSnapshot),
    [skillSnapshot, value],
  );
  const slashSuggestions = useMemo(
    () =>
      slashSuggestionSections.flatMap((section) => section.suggestions),
    [slashSuggestionSections],
  );
  const showSlashSuggestions =
    hasActiveSession &&
    !selectedSlashCommand &&
    !selectedStatusPreview &&
    slashSuggestions.length > 0;
  const selectedStatusPreviewCard = useMemo(
    () =>
      selectedStatusPreview
        ? buildSlashPreviewCardData({
            suggestion: selectedStatusPreview,
            appInfo,
            providerId: composerProviderId,
            modelLabel: modelButtonLabel,
            activeSessionTitle,
            activeWorktreePath,
            conversationMode,
            skillSnapshot,
          })
        : null,
    [
      activeSessionTitle,
      activeWorktreePath,
      appInfo,
      composerProviderId,
      conversationMode,
      modelButtonLabel,
      selectedStatusPreview,
      skillSnapshot,
    ],
  );

  const defaultPlaceholder = !hasWorktree
    ? "先打开一个项目，再从左侧创建或选择线程"
    : !hasActiveSession
      ? "咨询 RWork 任何问题，@ 添加文件，/ 唤出命令，$ 唤出 Skills"
      : "描述下一步要做的事，Enter 发送，Shift+Enter 换行";
  const placeholder = selectedSlashCommand?.placeholderText ?? defaultPlaceholder;

  const handleInput = () => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }

    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, INPUT_MAX_HEIGHT)}px`;
  };

  const handleSend = async () => {
    if (!canSend) {
      return;
    }

    if (conversationMode === "gui") {
      if (!onSendGuiMessage) {
        toast.error("GUI 对话桥接未就绪。");
        return;
      }

      try {
        await onSendGuiMessage({
          prompt: composerValue,
          providerId: composerProviderId,
          model: composerModel,
          effort: composerEffort,
        });
        setSelectedStatusPreview(null);
        setSelectedSlashCommand(null);
        setSelectedSkillPills([]);
        applyValue("");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
      return;
    }

    if (!activeSessionId) {
      return;
    }

    const terminalSessionId = `thread-tui:${activeSessionId}`;
    const normalizedInput = `${composerValue.replace(/\r?\n/g, "\r")}\r`;

    try {
      await window.desktopApp.createTerminalSession({
        sessionId: terminalSessionId,
        cwd: activeWorktreePath ?? undefined,
        profile: "thread-tui",
      });
      await window.desktopApp.writeTerminal(terminalSessionId, normalizedInput);
      setSelectedStatusPreview(null);
      setSelectedSlashCommand(null);
      setSelectedSkillPills([]);
      applyValue("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const applyValue = (nextValue: string) => {
    setValue(nextValue);
    requestAnimationFrame(() => {
      handleInput();
    });
  };

  const handleComposerChange = (nextValue: string) => {
    if (selectedStatusPreview) {
      setSelectedStatusPreview(null);
    }

    setValue(nextValue);
  };

  const applySlashSuggestion = (suggestion: SlashSuggestion) => {
    if (suggestion.kind === "status-card") {
      setSelectedStatusPreview(suggestion);
      setSelectedSlashCommand(null);
      setSelectedSkillPills([]);
    } else if (suggestion.kind === "prompt-command") {
      setSelectedStatusPreview(null);
      setSelectedSlashCommand(suggestion);
      setSelectedSkillPills([]);
    } else {
      setSelectedStatusPreview(null);
      setSelectedSlashCommand(null);
      setSelectedSkillPills((current) => [...current, suggestion]);
    }

    setSelectedSlashSuggestionIndex(0);
    applyValue("");
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(0, 0);
    });
  };

  useEffect(() => {
    if (!selectedStatusPreview) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (previewCardRef.current?.contains(event.target as Node)) {
        return;
      }

      setSelectedStatusPreview(null);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [selectedStatusPreview]);

  const {
    isSupported: supportsVoiceDictation,
    isListening,
    isPreparing: isPreparingDictation,
    isTranscribing: isTranscribingDictation,
    progress: dictationProgress,
    lastError: dictationError,
    retry: retryDictation,
    openModelsDirectory,
    toggle: toggleDictation,
  } = useVoiceDictation({
    enabled: canUseDictation,
    value,
    onChange: applyValue,
    onUnsupported: () => {
      toast.error("当前环境不支持本地语音听写。");
    },
    onError: (message) => {
      toast.error(message);
    },
  });

  useEffect(() => {
    if (!showSlashSuggestions) {
      setSelectedSlashSuggestionIndex(0);
      return;
    }

    setSelectedSlashSuggestionIndex((current) => {
      if (current >= slashSuggestions.length) {
        return 0;
      }

      return current;
    });
  }, [showSlashSuggestions, slashSuggestions.length, value]);

  useEffect(() => {
    if (!showSlashSuggestions) {
      slashSuggestionRefs.current = [];
      return;
    }

    const activeSuggestion =
      slashSuggestionRefs.current[selectedSlashSuggestionIndex];
    if (typeof activeSuggestion?.scrollIntoView === "function") {
      activeSuggestion.scrollIntoView({
        block: "center",
      });
    }
  }, [selectedSlashSuggestionIndex, showSlashSuggestions]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      selectedSlashCommand &&
      value.length === 0 &&
      (event.key === "Backspace" || event.key === "Delete")
    ) {
      event.preventDefault();
      setSelectedSlashCommand(null);
      return;
    }

    if (
      selectedStatusPreview &&
      (event.key === "Escape" ||
        (value.length === 0 &&
          (event.key === "Backspace" || event.key === "Delete")))
    ) {
      event.preventDefault();
      setSelectedStatusPreview(null);
      return;
    }

    if (
      selectedSkillPills.length > 0 &&
      value.length === 0 &&
      (event.key === "Backspace" || event.key === "Delete")
    ) {
      event.preventDefault();
      setSelectedSkillPills((current) => current.slice(0, -1));
      return;
    }

    if (showSlashSuggestions && event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedSlashSuggestionIndex((current) =>
        current >= slashSuggestions.length - 1 ? 0 : current + 1,
      );
      return;
    }

    if (showSlashSuggestions && event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedSlashSuggestionIndex((current) =>
        current <= 0 ? slashSuggestions.length - 1 : current - 1,
      );
      return;
    }

    if (showSlashSuggestions && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const selectedSuggestion = slashSuggestions[selectedSlashSuggestionIndex];
      if (selectedSuggestion) {
        applySlashSuggestion(selectedSuggestion);
      }
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleProviderSelect = (providerId: DesktopProviderId) => {
    if (providerSnapshot) {
      setComposerProviderSelection(
        getProviderDefaults(providerSnapshot, providerId),
      );
      return;
    }

    const model = normalizeProviderModel(providerId, "");
    setComposerProviderSelection({
      providerId,
      model,
      effort: normalizeProviderEffort(providerId, model, composerEffort),
    });
  };

  const handleModelSelect = (entry: ProviderModelCatalogEntry) => {
    setComposerModelSelection(
      entry.id,
      normalizeProviderEffort(
        composerProviderId,
        entry.id,
        composerEffort,
        providerSnapshot?.codexModels,
      ),
    );
  };

  return (
    <div
      className="mx-auto w-full max-w-[920px]"
      data-thread-composer="surface"
    >
      <div className="relative rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel)] p-2 backdrop-blur-xl">
        <div className="px-3 pt-1">
          {showSlashSuggestions ? (
            <div
              id={SLASH_SUGGESTIONS_LIST_ID}
              role="listbox"
              aria-label="Slash suggestions"
              className={cn(
                SLASH_FLOATING_LAYER_POSITION_CLASS,
                "z-20 max-h-56 overflow-y-auto rounded-[18px] border border-[var(--color-border)] bg-[var(--color-panel)] p-2 shadow-[var(--shadow-panel)] backdrop-blur-xl",
              )}
            >
              {(() => {
                let suggestionOffset = 0;

                return slashSuggestionSections.map((section) => {
                  const sectionStartIndex = suggestionOffset;
                  suggestionOffset += section.suggestions.length;

                  return (
                    <div key={section.id} className="space-y-1">
                      <div className="px-2 pb-2 pt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]">
                        {section.title}
                      </div>
                      <div className="space-y-1">
                        {section.suggestions.map((suggestion, index) => {
                          const flatIndex = sectionStartIndex + index;
                          const selected =
                            flatIndex === selectedSlashSuggestionIndex;

                          return (
                            <button
                              key={suggestion.id}
                              id={`${SLASH_SUGGESTIONS_LIST_ID}-${suggestion.id}`}
                              ref={(node) => {
                                slashSuggestionRefs.current[flatIndex] = node;
                              }}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              onMouseDown={(event) => {
                                event.preventDefault();
                              }}
                              onMouseEnter={() => {
                                setSelectedSlashSuggestionIndex(flatIndex);
                              }}
                              onClick={() => {
                                applySlashSuggestion(suggestion);
                              }}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left transition-colors duration-150",
                                selected
                                  ? "bg-[rgba(148,163,184,0.14)]"
                                  : "hover:bg-[rgba(148,163,184,0.06)]",
                              )}
                            >
                              <span className="flex min-w-0 max-w-[44%] shrink items-center gap-2">
                                <span
                                  className={cn(
                                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                                    getSlashSuggestionIconClassName(
                                      suggestion,
                                      selected,
                                    ),
                                  )}
                                >
                                  {renderSlashSuggestionIcon(suggestion)}
                                </span>
                                <span className="truncate text-[13px] font-medium text-[var(--color-fg)]">
                                  {suggestion.label}
                                </span>
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[11px] leading-5 text-[var(--color-muted)]">
                                {suggestion.description}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : null}
          {selectedStatusPreviewCard ? (
            <div
              ref={previewCardRef}
              role="dialog"
              aria-label={`${selectedStatusPreviewCard.title} 悬浮卡片`}
              className={cn(
                SLASH_FLOATING_LAYER_POSITION_CLASS,
                "z-30 overflow-hidden rounded-[22px] border p-5 shadow-[var(--shadow-panel)] backdrop-blur-xl",
                selectedStatusPreviewCard.accentClassName,
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/60 text-[rgb(15,23,42)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:bg-white/10 dark:text-white">
                    {selectedStatusPreviewCard.icon === "status" ? (
                      <Activity className="h-4 w-4" aria-hidden="true" />
                    ) : selectedStatusPreviewCard.icon === "stats" ? (
                      <BarChart3 className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Gauge className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <span className="inline-flex rounded-full border border-current/10 bg-white/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted)] dark:bg-black/10">
                      {selectedStatusPreviewCard.commandLabel}
                    </span>
                    <div className="truncate text-[17px] font-semibold tracking-[-0.01em] text-[var(--color-fg)]">
                      {selectedStatusPreviewCard.title}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatusPreview(null);
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/55 text-[var(--color-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-colors duration-150 hover:bg-white/75 hover:text-[var(--color-fg)] dark:bg-white/10 dark:hover:bg-white/15"
                  aria-label="关闭状态预览卡片"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {selectedStatusPreviewCard.rows.map((row) => (
                  <div
                    key={row.label}
                    className="rounded-[16px] border border-white/45 bg-white/55 px-3.5 py-3 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                      {row.label}
                    </div>
                    <div className="mt-1.5 text-[14px] font-medium text-[var(--color-fg)]">
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div
            className="flex min-h-[52px] flex-wrap items-start gap-2 px-1 py-1"
            onClick={() => {
              textareaRef.current?.focus();
            }}
          >
            {selectedSlashCommand ? (
              <div
                className="inline-flex h-6 shrink-0 items-center gap-1 self-start rounded-full bg-[linear-gradient(180deg,rgba(219,234,254,0.96)_0%,rgba(224,242,254,0.84)_100%)] px-2.5 py-0 text-[length:var(--ui-font-size-lg)] leading-6 text-[rgb(3,105,161)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:bg-[linear-gradient(180deg,rgba(8,47,73,0.78)_0%,rgba(14,116,144,0.28)_100%)] dark:text-[rgb(125,211,252)]"
                data-selected-slash-command={selectedSlashCommand.commandName}
                aria-label={`${selectedSlashCommand.selectionLabel ?? "已选择斜杠命令"} ${selectedSlashCommand.label}`}
              >
                {selectedSlashCommand.icon === "sparkles" ? (
                  <Zap className="h-3 w-3 shrink-0" aria-hidden="true" />
                ) : (
                  <Search className="h-3 w-3 shrink-0" aria-hidden="true" />
                )}
                <span className="truncate font-medium">
                  {selectedSlashCommand.label}
                </span>
              </div>
            ) : null}
            {selectedSkillPills.map((skill, index) => (
              <div
                key={`${skill.id}-${index}`}
                className="inline-flex h-6 shrink-0 items-center gap-1 self-start rounded-full bg-[linear-gradient(180deg,rgba(232,224,255,0.92)_0%,rgba(236,232,255,0.72)_100%)] px-2.5 py-0 text-[length:var(--ui-font-size-lg)] leading-6 text-[rgba(109,40,217,0.96)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:bg-[linear-gradient(180deg,rgba(55,48,163,0.24)_0%,rgba(49,46,129,0.28)_100%)] dark:text-[rgb(196,181,253)]"
                data-selected-skill-pill={skill.commandName}
                aria-label={`已选择技能 ${skill.label}`}
              >
                <Package className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate font-medium">{skill.label}</span>
              </div>
            ))}
            <textarea
              ref={textareaRef}
              rows={1}
              value={value}
              onChange={(event) => handleComposerChange(event.target.value)}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={!hasActiveSession}
              aria-label={activeSessionTitle ?? "Session composer"}
              aria-controls={
                showSlashSuggestions
                  ? SLASH_SUGGESTIONS_LIST_ID
                  : undefined
              }
              aria-expanded={showSlashSuggestions}
              aria-activedescendant={
                showSlashSuggestions
                  ? `${SLASH_SUGGESTIONS_LIST_ID}-${slashSuggestions[selectedSlashSuggestionIndex]?.id ?? ""}`
                  : undefined
              }
              className={cn(
                "max-h-[152px] resize-none overflow-y-auto bg-transparent text-[length:var(--ui-font-size-lg)] leading-6 text-[var(--color-fg)] outline-none placeholder:text-[var(--color-muted)] disabled:cursor-not-allowed disabled:placeholder:text-[var(--color-muted)]",
                selectedSkillPills.length > 0 || selectedSlashCommand
                  ? "min-h-[44px] min-w-[180px] flex-1 px-0 py-0"
                  : "min-h-[52px] w-full px-1 py-1",
              )}
            />
          </div>
          {selectedSlashCommand?.helperText ? (
            <div className="flex items-center gap-2 px-1 pb-1 pt-1 text-[11px] text-[var(--color-muted)]">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(14,165,233,0.1)] text-[rgb(14,116,144)] dark:bg-[rgba(56,189,248,0.12)] dark:text-[rgb(125,211,252)]">
                {selectedSlashCommand.icon === "sparkles" ? (
                  <Zap className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <Search className="h-3 w-3" aria-hidden="true" />
                )}
              </span>
              <span className="truncate">{selectedSlashCommand.helperText}</span>
            </div>
          ) : null}
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

            <ComposerSelectMenu
              ariaLabel="选择供应商"
              label={providerButtonLabel}
              options={[
                {
                  value: "anthropic",
                  label: "Claude",
                  iconSrc: claudeLogoUrl,
                },
                {
                  value: "codex",
                  label: "Codex",
                  iconSrc: openAiLogoUrl,
                },
              ]}
              selectedValue={composerProviderId}
              triggerIconSrc={
                composerProviderId === "anthropic"
                  ? claudeLogoUrl
                  : openAiLogoUrl
              }
              onSelect={(value) =>
                handleProviderSelect(value as DesktopProviderId)
              }
            />

            <ComposerSelectMenu
              ariaLabel="选择模型"
              label={modelButtonLabel}
              triggerIcon={Zap}
              options={providerCatalog.map((entry) => ({
                value: entry.id,
                label: entry.label,
                description: entry.description,
              }))}
              selectedValue={selectedModelEntry?.id ?? composerModel}
              onSelect={(value) => {
                const entry = providerCatalog.find((item) => item.id === value);
                if (entry) {
                  handleModelSelect(entry);
                }
              }}
            />

            <ComposerSelectMenu
              ariaLabel="选择推理强度"
              label={effortButtonLabel}
              triggerIcon={Brain}
              disabled={!effortSupported}
              options={supportedEffortLevels.map((effort) => ({
                value: effort,
                label: reasoningLabels[effort],
              }))}
              selectedValue={composerEffort}
              onSelect={(value) =>
                setComposerEffortSelection(value as ProviderReasoningEffort)
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <Tooltip
              content={
                !canUseDictation
                  ? "选择线程后可使用语音输入"
                  : !supportsVoiceDictation
                    ? "当前环境不支持本地语音听写"
                    : dictationProgress?.message ??
                      (isListening
                        ? "结束听写（⌥Space）"
                        : "离线语音输入（⌥Space）")
              }
            >
              <button
                type="button"
                onClick={toggleDictation}
                disabled={
                  !canUseDictation ||
                  !supportsVoiceDictation ||
                  isPreparingDictation ||
                  isTranscribingDictation
                }
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-[background-color,color,box-shadow,transform] duration-200",
                  isListening
                    ? "bg-[rgba(239,68,68,0.12)] text-[#dc2626] shadow-[0_10px_22px_rgba(220,38,38,0.12)]"
                    : "bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-fg)]",
                  (!canUseDictation ||
                    !supportsVoiceDictation ||
                    isPreparingDictation ||
                    isTranscribingDictation) &&
                    "cursor-not-allowed opacity-60 hover:bg-[var(--color-surface)] hover:text-[var(--color-muted)]",
                )}
                aria-label={
                  isListening
                    ? "结束语音输入"
                    : isPreparingDictation
                      ? "正在准备语音输入"
                      : isTranscribingDictation
                        ? "正在转写语音输入"
                        : "开始语音输入"
                }
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Mic className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </Tooltip>

            <Tooltip
              content={
                !canSend
                  ? "输入内容并选择线程后可发送"
                  : conversationMode === "gui"
                    ? guiConversationSending
                      ? "正在等待 GUI 响应"
                      : "发送到当前线程 GUI"
                    : "发送到当前线程 TUI"
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
                aria-label={
                  !canSend
                    ? "发送消息不可用"
                    : conversationMode === "gui"
                      ? guiConversationSending
                        ? "GUI 正在响应"
                        : "发送到 GUI 模式"
                      : "发送到当前线程 TUI"
                }
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
        </div>
        {dictationProgress && (isPreparingDictation || isTranscribingDictation) ? (
          <div className="px-3 pb-1 pt-1">
            <div className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
              <div className="flex items-center justify-between gap-3 text-[11px] text-[var(--color-muted)]">
                <span className="truncate">{dictationProgress.message}</span>
                {typeof dictationProgress.percent === "number" ? (
                  <span className="tabular-nums text-[var(--color-fg)]/70">
                    {Math.round(dictationProgress.percent)}%
                  </span>
                ) : null}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]/80">
                <div
                  className="h-full rounded-full bg-[var(--color-fg)]/70 transition-[width] duration-200"
                  style={{
                    width:
                      typeof dictationProgress.percent === "number"
                        ? `${Math.max(6, Math.min(100, dictationProgress.percent))}%`
                        : "20%",
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}
        {dictationError && !isPreparingDictation && !isTranscribingDictation ? (
          <div className="px-3 pb-1 pt-1">
            <div className="flex flex-wrap items-center gap-2 rounded-[14px] border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] px-3 py-2">
              <span className="min-w-0 flex-1 text-[11px] text-[var(--color-fg)]/78">
                {dictationError}
              </span>
              <button
                type="button"
                onClick={retryDictation}
                className="rounded-full bg-[var(--color-panel)] px-2.5 py-1 text-[11px] text-[var(--color-fg)]/85 transition-colors duration-150 hover:bg-[var(--color-surface-strong)]"
              >
                重试
              </button>
              <button
                type="button"
                onClick={() => {
                  void openModelsDirectory();
                }}
                className="rounded-full bg-[var(--color-panel)] px-2.5 py-1 text-[11px] text-[var(--color-fg)]/85 transition-colors duration-150 hover:bg-[var(--color-surface-strong)]"
              >
                打开模型目录
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ComposerSelectMenu({
  ariaLabel,
  label,
  options,
  selectedValue,
  disabled = false,
  triggerIconSrc,
  triggerIcon: TriggerIcon,
  onSelect,
}: {
  ariaLabel: string;
  label: string;
  options: Array<{
    value: string;
    label: string;
    description?: string;
    iconSrc?: string;
  }>;
  selectedValue: string;
  disabled?: boolean;
  triggerIconSrc?: string;
  triggerIcon?: typeof Zap;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasDescriptions = options.some((option) => Boolean(option.description));

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          onClick={(event) => {
            event.preventDefault();
            if (!disabled) {
              setOpen((current) => !current);
            }
          }}
          className={cn(
            "inline-flex h-8 min-w-0 max-w-[15rem] items-center gap-1 rounded-full px-2.5 text-[length:var(--ui-font-size-sm)] font-medium transition-colors duration-150",
            disabled
              ? "cursor-not-allowed text-[var(--color-muted)]"
              : "text-[var(--color-fg)]/80 hover:bg-[rgba(148,163,184,0.1)] hover:text-[var(--color-fg)]",
          )}
        >
          {triggerIconSrc ? (
            <img
              src={triggerIconSrc}
              alt=""
              className="h-4 w-4 shrink-0 rounded-sm object-contain"
              aria-hidden="true"
            />
          ) : null}
          {TriggerIcon ? (
            <TriggerIcon
              className="h-4 w-4 shrink-0 text-[var(--color-muted)]"
              aria-hidden="true"
            />
          ) : null}
          <span className="truncate">{label}</span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        side="top"
        align="start"
        sideOffset={10}
        className="z-40 min-w-[220px] overflow-hidden rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-2 shadow-[var(--shadow-panel)] outline-none"
      >
        <div className={cn(hasDescriptions ? "space-y-2.5" : "space-y-1")}>
          {options.map((option) => {
            const selected = option.value === selectedValue;
            return (
              <DropdownMenu.Item
                key={option.value}
                onSelect={() => {
                  setOpen(false);
                  onSelect(option.value);
                }}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-[12px] px-4 outline-none transition-colors duration-150 data-[highlighted]:!bg-[rgba(148,163,184,0.05)] data-[highlighted]:text-[var(--color-fg)]",
                  option.description ? "py-3.5" : "py-2.5",
                )}
                style={{
                  backgroundColor: selected
                    ? "rgba(148,163,184,0.16)"
                    : undefined,
                }}
              >
                {option.iconSrc ? (
                  <img
                    src={option.iconSrc}
                    alt=""
                    className="mt-1 h-4 w-4 shrink-0 rounded-sm object-contain"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium leading-5 text-[var(--color-fg)]">
                    {option.label}
                  </div>
                  {option.description ? (
                    <div className="pr-6 text-[11px] leading-4 text-[var(--color-muted)]">
                      {option.description}
                    </div>
                  ) : null}
                </div>
                <Check
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0 text-[var(--color-fg)]/72",
                    selected ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden="true"
                />
              </DropdownMenu.Item>
            );
          })}
        </div>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
