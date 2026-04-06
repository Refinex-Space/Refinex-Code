import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  createSkillArchive,
  inspectUploadedSkillArchive,
  installSkillFromArchive,
  replaceSkillFromArchive,
  uninstallSkillDirectory,
  validateSkillArchivePath,
} from "./skills-actions";

const tempDirs: string[] = [];

function createTempDir(prefix: string) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function writeSkill(rootPath: string, skillName: string, body: string) {
  const skillRoot = join(rootPath, skillName);
  mkdirSync(skillRoot, { recursive: true });
  writeFileSync(join(skillRoot, "SKILL.md"), body, "utf8");
  return skillRoot;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("skill actions", () => {
  it("validates archive name against the target skill directory", () => {
    expect(() =>
      validateSkillArchivePath(
        "/tmp/skills/harness-feat",
        "/tmp/uploads/harness-feat.zip",
      ),
    ).not.toThrow();

    expect(() =>
      validateSkillArchivePath(
        "/tmp/skills/harness-feat",
        "/tmp/uploads/other-skill.zip",
      ),
    ).toThrow("压缩包文件名必须为 harness-feat.zip。");
  });

  it("creates a zip archive for a skill directory", async () => {
    const skillsRoot = createTempDir("desktop-skill-actions-archive-");
    const skillRoot = writeSkill(skillsRoot, "harness-feat", "# Old body\n");
    const targetPath = join(createTempDir("desktop-skill-actions-download-"), "harness-feat.zip");

    await createSkillArchive(skillRoot, targetPath);

    expect(readFileSync(targetPath).byteLength).toBeGreaterThan(0);
  });

  it("replaces the target skill with the uploaded archive contents", async () => {
    const skillsRoot = createTempDir("desktop-skill-actions-replace-");
    const archiveRoot = createTempDir("desktop-skill-actions-upload-");
    const skillRoot = writeSkill(skillsRoot, "harness-feat", "# Old body\n");
    const uploadedSkillRoot = writeSkill(archiveRoot, "harness-feat", "# New body\n");
    const archivePath = join(createTempDir("desktop-skill-actions-zips-"), "harness-feat.zip");

    await createSkillArchive(uploadedSkillRoot, archivePath);
    await replaceSkillFromArchive(skillRoot, archivePath);

    expect(readFileSync(join(skillRoot, "SKILL.md"), "utf8")).toContain("New body");
  });

  it("inspects an uploaded skill archive and reads the embedded skill directory", async () => {
    const archiveRoot = createTempDir("desktop-skill-actions-inspect-");
    const uploadedSkillRoot = writeSkill(archiveRoot, "skill-uploader", "# Body\n");
    const archivePath = join(createTempDir("desktop-skill-actions-inspect-zip-"), "upload.zip");

    await createSkillArchive(uploadedSkillRoot, archivePath);
    const result = await inspectUploadedSkillArchive(archivePath);

    expect(result.skillDirectoryName).toBe("skill-uploader");
  });

  it("installs an uploaded skill archive into the personal skills root", async () => {
    const destinationRoot = createTempDir("desktop-skill-actions-install-");
    const archiveRoot = createTempDir("desktop-skill-actions-install-upload-");
    const uploadedSkillRoot = writeSkill(archiveRoot, "skill-uploader", "# Fresh body\n");
    const archivePath = join(createTempDir("desktop-skill-actions-install-zip-"), "skill-uploader.zip");

    await createSkillArchive(uploadedSkillRoot, archivePath);
    const result = await installSkillFromArchive(destinationRoot, archivePath);

    expect(result).toMatchObject({
      skillDirectoryName: "skill-uploader",
      overwritten: false,
    });
    expect(
      readFileSync(join(destinationRoot, "skill-uploader", "SKILL.md"), "utf8"),
    ).toContain("Fresh body");
  });

  it("refuses to overwrite an existing uploaded skill unless explicitly allowed", async () => {
    const destinationRoot = createTempDir("desktop-skill-actions-install-conflict-");
    const archiveRoot = createTempDir("desktop-skill-actions-install-conflict-upload-");
    const existingSkillRoot = writeSkill(destinationRoot, "skill-uploader", "# Old body\n");
    const uploadedSkillRoot = writeSkill(archiveRoot, "skill-uploader", "# New body\n");
    const archivePath = join(createTempDir("desktop-skill-actions-install-conflict-zip-"), "skill-uploader.zip");

    await createSkillArchive(uploadedSkillRoot, archivePath);

    await expect(
      installSkillFromArchive(destinationRoot, archivePath),
    ).rejects.toThrow("Skill skill-uploader 已存在。");

    await installSkillFromArchive(destinationRoot, archivePath, true);
    expect(readFileSync(join(existingSkillRoot, "SKILL.md"), "utf8")).toContain("New body");
  });

  it("removes the skill directory when uninstalling", async () => {
    const skillsRoot = createTempDir("desktop-skill-actions-uninstall-");
    const skillRoot = writeSkill(skillsRoot, "harness-feat", "# Body\n");

    await uninstallSkillDirectory(skillRoot);

    expect(() => readFileSync(join(skillRoot, "SKILL.md"), "utf8")).toThrow();
  });
});
