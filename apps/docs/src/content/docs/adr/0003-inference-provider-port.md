---
title: "ADR-0003: Inference providers behind a port"
description: llama.cpp is the first provider; others plug in as adapters without touching the UI.
---

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

The MVP targets llama.cpp, but Ollama, LM Studio, vLLM, and other servers expose similar data through different APIs.

## Decision

Define an `InferenceProvider` port in `@gpu-pulse/collectors`:

- `detect()`: whether the provider is reachable with the current configuration.
- `poll()`: returns a normalized `InferenceSample` (model, prompt and generation tokens per second, context usage, process ID when local).

The plugin only consumes normalized samples. The first adapter is `llamacpp`, reading `llama-server` endpoints (`/metrics` with `--metrics`, `/props`, `/slots`).

## Consequences

- Adding a provider means adding one adapter and its tests; the sidebar does not change.
- Fields a provider cannot supply are `undefined` and the panel hides them.
- The normalized sample is a contract between packages; changing it requires updating every adapter.
