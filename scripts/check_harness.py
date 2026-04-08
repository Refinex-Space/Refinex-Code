# HARNESS:MANAGED FILE
#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

REQUIRED_FILES = ["AGENTS.md", "ARCHITECTURE.md", "docs/DESIGN.md", "docs/FRONTEND.md", "docs/OBSERVABILITY.md", "docs/PLANS.md", "docs/PRODUCT_SENSE.md", "docs/QUALITY_SCORE.md", "docs/README.md", "docs/RELIABILITY.md", "docs/SECURITY.md", "docs/design-docs/core-beliefs.md", "docs/design-docs/index.md", "docs/exec-plans/completed/README.md", "docs/exec-plans/tech-debt-tracker.md", "docs/generated/README.md", "docs/generated/harness-manifest.md", "docs/product-specs/index.md", "docs/references/index.md", "scripts/check_harness.py"]
ROUTE_DOCS = ["docs/PLANS.md", "docs/SECURITY.md", "docs/RELIABILITY.md", "docs/OBSERVABILITY.md", "docs/QUALITY_SCORE.md", "docs/FRONTEND.md", "docs/PRODUCT_SENSE.md", "docs/DESIGN.md", "docs/design-docs/index.md"]
LOCAL_AGENT_DIRS = ["apps/desktop"]
PROFILE_FINGERPRINT = "861d1bbba3d6df84"
MANIFEST_PATH = "docs/generated/harness-manifest.md"
ROOT_AGENT_MAX_LINES = 140
LOCAL_AGENT_MAX_LINES = 120
PLANS_MAX_LINES = 180
PLAN_FILENAME_RE = re.compile(r"^\d{4}-\d{2}-\d{2}-.+\.md$")


def _append(findings: list[dict], severity: str, code: str, path: str, message: str) -> None:
    findings.append(
        {
            "severity": severity,
            "code": code,
            "path": path,
            "message": message,
        }
    )


def _line_count(path: Path) -> int:
    return len(path.read_text(encoding="utf-8").splitlines())


def _has_dated_plan_name(path: Path) -> bool:
    return bool(PLAN_FILENAME_RE.match(path.name))


def run_check(repo: Path) -> dict:
    findings: list[dict] = []

    for rel_path in REQUIRED_FILES:
        if not (repo / rel_path).exists():
            _append(
                findings,
                "P0",
                "missing-required-file",
                rel_path,
                f"Required Harness file is missing: {rel_path}",
            )

    agents_path = repo / "AGENTS.md"
    if agents_path.exists():
        content = agents_path.read_text(encoding="utf-8")
        if _line_count(agents_path) > ROOT_AGENT_MAX_LINES:
            _append(
                findings,
                "P1",
                "root-agent-too-large",
                "AGENTS.md",
                f"Root AGENTS.md exceeds {ROOT_AGENT_MAX_LINES} lines and stops being a clean routing map",
            )
        if "docs/PLANS.md" not in content:
            _append(
                findings,
                "P1",
                "missing-plans-route",
                "AGENTS.md",
                "Root AGENTS.md does not route to docs/PLANS.md",
            )
        for rel_path in ROUTE_DOCS:
            if rel_path and rel_path not in content:
                _append(
                    findings,
                    "P2",
                    "missing-route",
                    "AGENTS.md",
                    f"Root AGENTS.md does not route to {rel_path}",
                )

    for rel_dir in LOCAL_AGENT_DIRS:
        agent_path = repo / rel_dir / "AGENTS.md"
        if not agent_path.exists():
            _append(
                findings,
                "P1",
                "missing-local-agent",
                f"{rel_dir}/AGENTS.md",
                f"Expected local AGENTS.md is missing for {rel_dir}",
            )
            continue
        if _line_count(agent_path) > LOCAL_AGENT_MAX_LINES:
            _append(
                findings,
                "P2",
                "local-agent-too-large",
                f"{rel_dir}/AGENTS.md",
                f"Local AGENTS.md exceeds {LOCAL_AGENT_MAX_LINES} lines and should be trimmed to local routing only",
            )

    plans_path = repo / "docs" / "PLANS.md"
    active_dir = repo / "docs" / "exec-plans" / "active"
    if plans_path.exists():
        plans_text = plans_path.read_text(encoding="utf-8")
        if _line_count(plans_path) > PLANS_MAX_LINES:
            _append(
                findings,
                "P2",
                "plans-too-large",
                "docs/PLANS.md",
                f"PLANS.md exceeds {PLANS_MAX_LINES} lines and should stay as a short routing index",
            )
        if active_dir.exists():
            active_plan_paths = sorted(
                path for path in active_dir.glob("*.md") if path.is_file() and path.name != "README.md"
            )
            active_plans = [path.name for path in active_plan_paths]
            if active_plans and "docs/exec-plans/active" not in plans_text:
                _append(
                    findings,
                    "P1",
                    "plans-missing-active-pointer",
                    "docs/PLANS.md",
                    "PLANS.md does not mention docs/exec-plans/active",
                )
            for plan_path in active_plan_paths:
                if not _has_dated_plan_name(plan_path):
                    _append(
                        findings,
                        "P2",
                        "plan-missing-date-prefix",
                        str(plan_path.relative_to(repo)),
                        "Execution plan filename must start with YYYY-MM-DD-",
                    )
                if plan_path.name not in plans_text:
                    _append(
                        findings,
                        "P2",
                        "plans-missing-active-entry",
                        "docs/PLANS.md",
                        f"PLANS.md does not mention active plan {plan_path.name}",
                    )

    completed_dir = repo / "docs" / "exec-plans" / "completed"
    if completed_dir.exists():
        for path in sorted(completed_dir.glob("*.md")):
            if path.name == "README.md":
                continue
            if not _has_dated_plan_name(path):
                _append(
                    findings,
                    "P2",
                    "plan-missing-date-prefix",
                    str(path.relative_to(repo)),
                    "Execution plan filename must start with YYYY-MM-DD-",
                )
            if not path.read_text(encoding="utf-8").lstrip().startswith("> ✅ Completed:"):
                _append(
                    findings,
                    "P2",
                    "missing-archive-header",
                    str(path.relative_to(repo)),
                    "Completed plan is missing the standard archive header",
                )

    manifest_path = repo / MANIFEST_PATH
    if not manifest_path.exists():
        _append(
            findings,
            "P2",
            "missing-manifest",
            MANIFEST_PATH,
            "Harness manifest is missing",
        )
    else:
        manifest_text = manifest_path.read_text(encoding="utf-8")
        if PROFILE_FINGERPRINT not in manifest_text:
            _append(
                findings,
                "P2",
                "manifest-fingerprint-mismatch",
                MANIFEST_PATH,
                "Harness manifest does not match the current bootstrap profile fingerprint",
            )

    return {"ok": not any(item["severity"] in {"P0", "P1"} for item in findings), "findings": findings}


def main() -> int:
    parser = argparse.ArgumentParser(description="Check repository Harness health")
    parser.add_argument("--repo", default=".", help="Repository root")
    parser.add_argument("--format", choices=("json", "md"), default="md")
    args = parser.parse_args()
    result = run_check(Path(args.repo).resolve())
    if args.format == "json":
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print("# Harness Check")
        print()
        print(f"- OK: {result['ok']}")
        print(f"- Profile fingerprint: `{PROFILE_FINGERPRINT}`")
        if result["findings"]:
            print()
            print("## Findings")
            print()
            for item in result["findings"]:
                print(
                    f"- [{item['severity']}] `{item['code']}` {item['path']}: {item['message']}"
                )
        else:
            print()
            print("- No findings")
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
