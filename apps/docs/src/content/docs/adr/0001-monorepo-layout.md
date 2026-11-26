---
title: "ADR-0001: Monorepo with pnpm workspaces"
description: Split documentation, metric collection, and presentation into separate workspaces.
---

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

The project needs a documentation site (ADRs, diagrams, specs) and an OpenCode TUI plugin. Metric collection (GPU, inference servers) has no UI dependency and could be reused by other front ends (CLI, status line).

## Decision

Use a pnpm workspaces monorepo:

- `apps/docs`: Astro + Starlight documentation site.
- `packages/collectors`: UI-free ports and adapters that read GPU and inference metrics.
- `packages/opencode-plugin`: OpenCode TUI plugin that only polls collectors and renders state.

## Consequences

- Collectors can be unit-tested without OpenCode or a terminal renderer.
- The plugin package depends on `@gpu-pulse/collectors` through `workspace:*`; publishing must replace it with a real version (pnpm does this on `pnpm publish`).
- OpenCode runs TUI plugins on its own Bun runtime, while the workspace uses pnpm on Node. Collectors must therefore stick to APIs available in both runtimes (`fetch`, `node:child_process`).
