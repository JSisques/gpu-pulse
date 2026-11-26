---
title: "ADR-0002: Report the GPU that hosts the model"
description: The panel shows the GPU used by the inference process, not just any GPU on the client machine.
---

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

OpenCode TUI plugins run on the client. On a machine with several GPUs, or when the inference server runs on another host, "the GPU of this machine" can be the wrong GPU. The value of the panel is to show the hardware that is actually serving the model.

llama.cpp's `/metrics` endpoint exposes token and request counters, but no GPU utilization.

## Decision

GPU data is read through a `GpuSource` port that receives the inference process identity and returns samples only for the GPUs used by that process.

- **`local` adapter (MVP):** find the PID of `llama-server`, then match it with `nvidia-smi --query-compute-apps=pid,gpu_uuid,used_memory --format=csv`. Query utilization, VRAM, temperature, and power only for those GPU UUIDs.
- **`remote` adapter (future):** read GPU metrics from the inference host, for example through a Prometheus exporter or a small gpu-pulse agent.

## Consequences

- With split models (`--tensor-split`), the panel shows one row per GPU.
- If the process cannot be matched to a GPU, the panel says so instead of falling back to an unrelated GPU.
- Remote inference shows throughput but no GPU data until the `remote` adapter exists.
