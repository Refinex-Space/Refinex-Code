import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, rename, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join } from "node:path";

function createTempName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function runCommand(command: string, args: string[], cwd?: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.once("error", (error) => {
      reject(error);
    });

    child.once("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      const details = stderr.trim();
      reject(
        new Error(
          details.length > 0
            ? `${command} 执行失败：${details}`
            : `${command} 执行失败，退出码 ${code ?? "unknown"}`,
        ),
      );
    });
  });
}

async function ensureDirectory(targetPath: string) {
  const info = await stat(targetPath).catch(() => null);
  if (!info?.isDirectory()) {
    throw new Error("目标 Skill 目录不存在。");
  }
}

async function ensureDirectoryPath(targetPath: string) {
  await mkdir(targetPath, { recursive: true });
}

async function resolveExtractedSkillRoot(
  extractedDir: string,
  expectedDirectoryName: string,
) {
  const expectedRoot = join(extractedDir, expectedDirectoryName);
  const info = await stat(expectedRoot).catch(() => null);
  if (!info?.isDirectory()) {
    throw new Error("压缩包内容不符合要求，根目录必须与 Skill 目录同名。");
  }

  const entries = await readdir(extractedDir, { withFileTypes: true });
  const invalidEntries = entries.filter((entry) => {
    if (entry.name === expectedDirectoryName || entry.name === "__MACOSX") {
      return false;
    }

    return true;
  });

  if (invalidEntries.length > 0) {
    throw new Error("压缩包根目录下只能包含同名 Skill 目录。");
  }

  return expectedRoot;
}

async function resolveUploadedSkillRoot(extractedDir: string) {
  const entries = await readdir(extractedDir, { withFileTypes: true });
  const topLevelDirectories = entries.filter(
    (entry) => entry.isDirectory() && entry.name !== "__MACOSX",
  );
  const invalidEntries = entries.filter(
    (entry) =>
      entry.name !== "__MACOSX" &&
      (!entry.isDirectory() || topLevelDirectories.length !== 1),
  );

  if (topLevelDirectories.length !== 1 || invalidEntries.length > 0) {
    throw new Error("上传的压缩包根目录下必须只包含一个 Skill 目录。");
  }

  const skillRoot = join(extractedDir, topLevelDirectories[0]!.name);
  const skillManifest = await stat(join(skillRoot, "SKILL.md")).catch(() => null);
  if (!skillManifest?.isFile()) {
    throw new Error("上传的压缩包缺少 SKILL.md。");
  }

  return {
    extractedSkillRoot: skillRoot,
    skillDirectoryName: topLevelDirectories[0]!.name,
  };
}

export function getSkillDirectoryName(skillRoot: string) {
  return basename(skillRoot);
}

export function validateSkillArchivePath(skillRoot: string, archivePath: string) {
  const expectedDirectoryName = getSkillDirectoryName(skillRoot);
  const extension = extname(archivePath).toLowerCase();
  const archiveName = basename(archivePath, extname(archivePath));

  if (extension !== ".zip") {
    throw new Error("请选择 .zip 压缩包。");
  }

  if (archiveName !== expectedDirectoryName) {
    throw new Error(`压缩包文件名必须为 ${expectedDirectoryName}.zip。`);
  }
}

export async function replaceSkillFromArchive(
  skillRoot: string,
  archivePath: string,
) {
  validateSkillArchivePath(skillRoot, archivePath);
  await ensureDirectory(skillRoot);

  const expectedDirectoryName = getSkillDirectoryName(skillRoot);
  const tempRoot = await mkdtemp(join(tmpdir(), "desktop-skill-replace-"));
  const extractedDir = join(tempRoot, "extracted");
  const parentDirectory = dirname(skillRoot);
  const stagedRoot = join(parentDirectory, createTempName(`${expectedDirectoryName}.staged`));
  const backupRoot = join(parentDirectory, createTempName(`${expectedDirectoryName}.backup`));

  try {
    await runCommand("unzip", ["-q", archivePath, "-d", extractedDir]);
    const extractedSkillRoot = await resolveExtractedSkillRoot(
      extractedDir,
      expectedDirectoryName,
    );

    await cp(extractedSkillRoot, stagedRoot, {
      recursive: true,
      force: false,
      errorOnExist: true,
    });

    await rename(skillRoot, backupRoot);

    let restorationFailed = false;
    try {
      await rename(stagedRoot, skillRoot);
    } catch (error) {
      await rename(backupRoot, skillRoot).catch(() => {
        restorationFailed = true;
      });
      throw error;
    } finally {
      if (!restorationFailed) {
        await rm(backupRoot, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  } finally {
    await rm(stagedRoot, { recursive: true, force: true }).catch(() => undefined);
    await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function createSkillArchive(skillRoot: string, targetPath: string) {
  await ensureDirectory(skillRoot);
  await runCommand("zip", ["-qry", targetPath, getSkillDirectoryName(skillRoot)], dirname(skillRoot));
}

export async function uninstallSkillDirectory(skillRoot: string) {
  await ensureDirectory(skillRoot);
  await rm(skillRoot, { recursive: true, force: true });
}

export async function inspectUploadedSkillArchive(archivePath: string) {
  const extension = extname(archivePath).toLowerCase();
  if (extension !== ".zip") {
    throw new Error("请选择 .zip 压缩包。");
  }

  const tempRoot = await mkdtemp(join(tmpdir(), "desktop-skill-upload-inspect-"));
  const extractedDir = join(tempRoot, "extracted");

  try {
    await runCommand("unzip", ["-q", archivePath, "-d", extractedDir]);
    return await resolveUploadedSkillRoot(extractedDir);
  } finally {
    await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function installSkillFromArchive(
  destinationRoot: string,
  archivePath: string,
  overwrite = false,
) {
  const extension = extname(archivePath).toLowerCase();
  if (extension !== ".zip") {
    throw new Error("请选择 .zip 压缩包。");
  }

  await ensureDirectoryPath(destinationRoot);

  const tempRoot = await mkdtemp(join(tmpdir(), "desktop-skill-upload-install-"));
  const extractedDir = join(tempRoot, "extracted");

  try {
    await runCommand("unzip", ["-q", archivePath, "-d", extractedDir]);
    const { extractedSkillRoot, skillDirectoryName } = await resolveUploadedSkillRoot(
      extractedDir,
    );
    const targetSkillRoot = join(destinationRoot, skillDirectoryName);
    const targetInfo = await stat(targetSkillRoot).catch(() => null);

    if (targetInfo && !overwrite) {
      throw new Error(`Skill ${skillDirectoryName} 已存在。`);
    }

    if (targetInfo) {
      await rm(targetSkillRoot, { recursive: true, force: true });
    }

    await cp(extractedSkillRoot, targetSkillRoot, {
      recursive: true,
      force: true,
    });

    return {
      skillDirectoryName,
      skillRoot: targetSkillRoot,
      overwritten: Boolean(targetInfo),
    };
  } finally {
    await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}
