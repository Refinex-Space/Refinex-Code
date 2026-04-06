import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildDesktopSkillSnapshot,
  readSkillFilePreview,
} from "./skills-snapshot";

const tempDirs: string[] = [];

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function writeSkill(
  rootPath: string,
  skillName: string,
  content: string,
  extraFiles: Array<{ relativePath: string; content: string | Buffer }> = [],
) {
  const skillRoot = join(rootPath, skillName);
  mkdirSync(skillRoot, { recursive: true });
  writeFileSync(join(skillRoot, "SKILL.md"), content, "utf8");

  for (const file of extraFiles) {
    const targetPath = join(skillRoot, file.relativePath);
    mkdirSync(join(targetPath, ".."), { recursive: true });
    writeFileSync(targetPath, file.content);
  }

  return skillRoot;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("skills snapshot", () => {
  it("collects personal, project, and plugin skills with expected metadata", async () => {
    const personalRoot = createTempDir("desktop-skills-personal-");
    const projectSkillsRoot = join(createTempDir("desktop-skills-project-"), ".claude", "skills");
    const pluginRoot = createTempDir("desktop-skills-plugin-");
    const directPluginParent = createTempDir("desktop-skills-plugin-direct-");
    const directPluginRoot = join(directPluginParent, "direct-plugin-root");

    writeSkill(
      personalRoot,
      "writer",
      `---
description: Personal helper
version: 1.2.3
---

# Writer
`,
      [{ relativePath: "references/notes.md", content: "hello" }],
    );
    writeSkill(
      projectSkillsRoot,
      "repo-helper",
      `---
description: Repo helper
disable-model-invocation: true
---

# Repo helper
`,
    );
    writeSkill(
      pluginRoot,
      "plugin-skill",
      `---
description: Plugin helper
---

# Plugin helper
`,
    );
    mkdirSync(directPluginRoot, { recursive: true });
    writeFileSync(
      join(directPluginRoot, "SKILL.md"),
      `---
description: Direct plugin helper
user-invocable: false
---

# Direct plugin helper
`,
      "utf8",
    );

    const snapshot = await buildDesktopSkillSnapshot({
      activeWorktreePath: "/tmp/project",
      personalSkillRoots: [personalRoot],
      projectSkillRoot: projectSkillsRoot,
      pluginSources: [
        {
          pluginName: "plugin-a",
          pluginDisplayName: "Plugin A",
          roots: [pluginRoot, directPluginRoot],
        },
      ],
    });

    expect(snapshot.skills.map((skill) => skill.displayName)).toEqual([
      "writer",
      "repo-helper",
      "direct-plugin-root",
      "plugin-skill",
    ]);

    const personalSkill = snapshot.skills.find((skill) => skill.displayName === "writer");
    expect(personalSkill).toMatchObject({
      sourceKind: "personal",
      addedBy: "User",
      version: "1.2.3",
      invokedBy: "User or RWork",
    });
    expect(personalSkill?.tree.some((node) => node.relativePath === "references")).toBe(true);

    const projectSkill = snapshot.skills.find((skill) => skill.displayName === "repo-helper");
    expect(projectSkill).toMatchObject({
      sourceKind: "project",
      addedBy: "Project",
      invokedBy: "User",
    });

    const directPluginSkill = snapshot.skills.find(
      (skill) => skill.displayName === "direct-plugin-root",
    );
    expect(directPluginSkill).toMatchObject({
      sourceKind: "plugin",
      addedBy: "Plugin A",
      pluginName: "Plugin A",
      invokedBy: "RWork",
    });

    const nestedPluginSkill = snapshot.skills.find(
      (skill) => skill.displayName === "plugin-skill",
    );
    expect(nestedPluginSkill?.name).toBe("plugin-a:plugin-skill");
  });

  it("returns only personal skills when there is no active project root", async () => {
    const personalRoot = createTempDir("desktop-skills-personal-only-");
    writeSkill(
      personalRoot,
      "writer",
      `---
description: Personal helper
---

# Writer
`,
    );

    const snapshot = await buildDesktopSkillSnapshot({
      activeWorktreePath: null,
      personalSkillRoots: [personalRoot],
      projectSkillRoot: null,
      pluginSources: [],
    });

    expect(snapshot.skills).toHaveLength(1);
    expect(snapshot.skills[0]?.sourceKind).toBe("personal");
  });

  it("marks binary and oversized previews as unsupported", async () => {
    const tempRoot = createTempDir("desktop-skills-preview-");
    const binaryPath = join(tempRoot, "binary.bin");
    const largePath = join(tempRoot, "large.md");

    writeFileSync(binaryPath, Buffer.from([0, 159, 146, 150]));
    writeFileSync(largePath, "a".repeat(140 * 1024), "utf8");

    const binaryPreview = await readSkillFilePreview(binaryPath);
    const largePreview = await readSkillFilePreview(largePath);

    expect(binaryPreview.kind).toBe("unsupported");
    expect(largePreview.kind).toBe("too_large");
  });
});
