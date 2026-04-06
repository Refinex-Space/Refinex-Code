import { useEffect, useMemo, useState } from "react";
import type {
  SkillFilePreview,
  SkillRecord,
  SkillSnapshot,
  SkillTreeNode,
} from "../../../shared/contracts";
import { useDesktopShell } from "@renderer/hooks/use-desktop-shell";
import { useUIStore } from "@renderer/stores/ui";
import {
  findActiveWorktree,
  useWorktreeStore,
} from "@renderer/stores/worktree";

function findNodeById(
  nodes: SkillTreeNode[],
  nodeId: string | null,
): SkillTreeNode | null {
  if (!nodeId) {
    return null;
  }

  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    if (node.children) {
      const nested = findNodeById(node.children, nodeId);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

export function useSkillsData() {
  const activeWorktree = useWorktreeStore((state) => findActiveWorktree(state));
  const selectedSkillId = useUIStore((state) => state.selectedSkillId);
  const selectedSkillNodeId = useUIStore((state) => state.selectedSkillNodeId);
  const selectSkillItem = useUIStore((state) => state.selectSkillItem);
  const { getSkillsSnapshot, readSkillFile } = useDesktopShell();

  const [snapshot, setSnapshot] = useState<SkillSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [preview, setPreview] = useState<SkillFilePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setSnapshotLoading(true);
    setError(null);

    void getSkillsSnapshot()
      .then((nextSnapshot) => {
        if (cancelled) {
          return;
        }

        setSnapshot(nextSnapshot);
        const selectedSkillStillExists = nextSnapshot.skills.some(
          (skill) => skill.id === selectedSkillId,
        );
        const nextSkillId =
          selectedSkillStillExists ? selectedSkillId : (nextSnapshot.skills[0]?.id ?? null);
        const nextSkill = nextSnapshot.skills.find((skill) => skill.id === nextSkillId) ?? null;
        const nextNode =
          nextSkill && selectedSkillStillExists
            ? findNodeById(nextSkill.tree, selectedSkillNodeId)
            : null;

        selectSkillItem(nextSkillId, nextNode?.id ?? null);
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "无法加载技能列表");
      })
      .finally(() => {
        if (!cancelled) {
          setSnapshotLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeWorktree?.worktreePath,
    getSkillsSnapshot,
    reloadToken,
    selectSkillItem,
    selectedSkillId,
    selectedSkillNodeId,
  ]);

  const selectedSkill = useMemo<SkillRecord | null>(() => {
    if (!snapshot || !selectedSkillId) {
      return null;
    }

    return snapshot.skills.find((skill) => skill.id === selectedSkillId) ?? null;
  }, [selectedSkillId, snapshot]);

  const selectedNode = useMemo<SkillTreeNode | null>(() => {
    if (!selectedSkill) {
      return null;
    }

    return findNodeById(selectedSkill.tree, selectedSkillNodeId);
  }, [selectedSkill, selectedSkillNodeId]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedSkill) {
      setPreview(null);
      return;
    }

    const targetPath = selectedNode?.path ?? selectedSkill.skillMdPath;
    setPreviewLoading(true);
    setError(null);

    void readSkillFile(targetPath)
      .then((nextPreview) => {
        if (!cancelled) {
          setPreview(nextPreview);
        }
      })
      .catch((readError) => {
        if (!cancelled) {
          setError(readError instanceof Error ? readError.message : "无法读取技能文件");
          setPreview(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [readSkillFile, selectedNode?.path, selectedSkill]);

  return {
    snapshot,
    snapshotLoading,
    selectedSkill,
    selectedNode,
    preview,
    previewLoading,
    error,
    refreshSnapshot: () => {
      setReloadToken((current) => current + 1);
    },
  };
}
