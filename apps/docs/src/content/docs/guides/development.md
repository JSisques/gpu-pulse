---
title: Development
description: Run the docs and work on the packages locally.
---

## Requirements

- Node.js and pnpm (see `packageManager` in the root `package.json`).
- For the MVP: an NVIDIA GPU with `nvidia-smi` on the `PATH`, and `llama-server` started with `--metrics`.

## Commands

```sh
pnpm install
pnpm docs:dev     # docs site with hot reload
pnpm docs:build   # static build of the docs
pnpm typecheck    # type-check every package
pnpm test         # run every package's tests
```

## Releasing and publishing

Releasing and publishing are separate steps:

1. **Release** — `release-please` opens a release PR from Conventional Commits. Merging it bumps every package to the same version, tags `vX.Y.Z`, and creates the GitHub release.
2. **Publish** — `.github/workflows/publish.yml` runs when that release is published (or manually with a tag). It type-checks, tests, packs each package with `pnpm pack` (which rewrites `workspace:` ranges), and runs `npm publish` with npm trusted publishing (OIDC), so no npm token is stored.

Packages are published in dependency order: `@gpu-pulse/collectors`, then `opencode-gpu-pulse`. A version already on npm is skipped, so re-running the workflow is safe.

Trusted publishing is configured per package on npmjs.com (Settings → Trusted publishing → GitHub Actions, repository `JSisques/gpu-pulse`, workflow `publish.yml`). The package must exist before it can be configured, so the first version of each package is published manually.

## Writing an ADR

Add `src/content/docs/adr/NNNN-short-title.md` with the next number. Use the sections Context, Decision, and Consequences, plus a Status and Date. Never rewrite an accepted ADR: add a new one that supersedes it.
