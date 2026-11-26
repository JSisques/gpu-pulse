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
```

## Writing an ADR

Add `src/content/docs/adr/NNNN-short-title.md` with the next number. Use the sections Context, Decision, and Consequences, plus a Status and Date. Never rewrite an accepted ADR: add a new one that supersedes it.
