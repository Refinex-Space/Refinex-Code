import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetRemoteSkillCatalogCacheForTests,
  getRemoteSkillCatalog,
  installRemoteSkill,
  parseRemoteSkillRecordForTests,
} from "./remote-skills";

const tempDirs: string[] = [];

function createTempDir(prefix: string) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

beforeEach(() => {
  __resetRemoteSkillCatalogCacheForTests();
  vi.restoreAllMocks();
});

describe("remote skills", () => {
  it("parses remote skill frontmatter for catalog cards", () => {
    expect(
      parseRemoteSkillRecordForTests(
        "skills/skill-creator/SKILL.md",
        `---
name: skill-creator
description: >
  Create new skills from structured guidance.
---

# Skill creator
`,
      ),
    ).toMatchObject({
      id: "skill-creator",
      name: "skill-creator",
      description: "Create new skills from structured guidance.",
      sourceLabel: "Anthropic & Partners",
      providerLabel: "Anthropic",
    });
  });

  it("builds remote skill catalog from github tree and blobs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("/git/trees/")) {
          return new Response(
            JSON.stringify({
              sha: "tree",
              truncated: false,
              tree: [
                {
                  path: "skills/skill-creator/SKILL.md",
                  mode: "100644",
                  type: "blob",
                  sha: "blob-skill-creator",
                  url: "blob-url",
                },
              ],
            }),
            { status: 200 },
          );
        }

        if (url.includes("raw.githubusercontent.com")) {
          return new Response(
            `---\nname: skill-creator\ndescription: Create skills safely.\n---\n`,
            { status: 200 },
          );
        }

        return new Response("not found", { status: 404 });
      }),
    );

    const catalog = await getRemoteSkillCatalog();

    expect(catalog.skills).toHaveLength(1);
    expect(catalog.skills[0]?.name).toBe("skill-creator");
  });

  it("installs a remote skill into the destination directory", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("/git/trees/")) {
          return new Response(
            JSON.stringify({
              sha: "tree",
              truncated: false,
              tree: [
                {
                  path: "skills/skill-creator/SKILL.md",
                  mode: "100644",
                  type: "blob",
                  sha: "blob-skill-md",
                  url: "blob-skill-md-url",
                },
                {
                  path: "skills/skill-creator/references/notes.md",
                  mode: "100644",
                  type: "blob",
                  sha: "blob-notes",
                  url: "blob-notes-url",
                },
              ],
            }),
            { status: 200 },
          );
        }

        if (url.includes("raw.githubusercontent.com") && url.endsWith("/SKILL.md")) {
          return new Response("# Skill Creator\n", { status: 200 });
        }

        if (url.includes("raw.githubusercontent.com") && url.endsWith("/references/notes.md")) {
          return new Response("Reference", { status: 200 });
        }

        return new Response("not found", { status: 404 });
      }),
    );

    const destinationRoot = createTempDir("desktop-remote-skill-install-");
    await getRemoteSkillCatalog();
    await installRemoteSkill("skill-creator", destinationRoot);

    expect(
      readFileSync(join(destinationRoot, "skill-creator", "SKILL.md"), "utf8"),
    ).toContain("Skill Creator");
    expect(
      readFileSync(
        join(destinationRoot, "skill-creator", "references", "notes.md"),
        "utf8",
      ),
    ).toContain("Reference");
  });

  it("returns a clear rate-limit error for github 403 responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("/git/trees/")) {
          return new Response("forbidden", {
            status: 403,
            headers: {
              "x-ratelimit-remaining": "0",
              "x-ratelimit-reset": "1777777777",
            },
          });
        }

        return new Response("not found", { status: 404 });
      }),
    );

    await expect(getRemoteSkillCatalog()).rejects.toThrow(/GitHub API 限流/);
  });
});
