<!-- HARNESS:MANAGED FILE -->
# Refinex-Code Architecture

## Purpose

Define the stable system boundaries, dependency flow, and interfaces
that should not drift casually.

## Architecture Invariants

- Parse data at boundaries before passing it inward
- Avoid dependency flow reversal
- Turn high-risk constraints into checks, scripts, or generated facts
- Sync docs, plans, and generated facts when public behavior changes

## Current Structure Summary

- Top-level structure: bin, docs, node_modules, scripts, shims, src, vendor

## Stable Boundaries

- directory boundaries for workspaces and services
- documentation boundaries between root `AGENTS.md` and `docs/`
- execution-plan boundaries under `docs/exec-plans/`
- generated-fact boundaries under `docs/generated/`
