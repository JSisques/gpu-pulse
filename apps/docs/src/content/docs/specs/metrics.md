---
title: Metrics
description: Every metric shown by the panel, with its source, unit, and status.
---

A metric is implemented only after it is defined here. Status values: `proposed`, `accepted`, `implemented`.

## Inference (llama.cpp)

| ID | Metric | Source | Unit | Status |
| --- | --- | --- | --- | --- |
| M-I1 | Model name | `GET /models`, entry with `status.value = loaded` | text | accepted |
| M-I2 | Prompt processing speed | `GET /metrics?model=<id>`: Δ`llamacpp:prompt_tokens_total` / Δ`llamacpp:prompt_seconds_total` between polls | tokens/s | accepted |
| M-I3 | Generation speed | `GET /metrics?model=<id>`: Δ`llamacpp:tokens_predicted_total` / Δ`llamacpp:tokens_predicted_seconds_total` between polls | tokens/s | accepted |
| M-I4 | Context usage | `GET /slots?model=<id>` | tokens used / context size | proposed |
| M-I5 | Server process ID | PID listening on the child `--port` from `status.args` (`netstat -ano -p TCP` on Windows) | PID | accepted |

M-I2 and M-I3 use deltas because the gauges `llamacpp:prompt_tokens_seconds` and `llamacpp:predicted_tokens_seconds` are averages since the model loaded, not current speed. When both deltas are zero (idle), the panel shows the last measured value.

Exact Prometheus metric names and JSON fields must be checked against a running `llama-server --metrics` before moving a row to `accepted`.

### Observed environment (2026-11-26, llama.cpp b12602, router mode)

The reference setup is the `local-ai-infrastructure` router: `llama-server --models-preset models.ini --models-max 1 --port 18881`.

- The router spawns one child `llama-server` per loaded model on a random port. The child's PID owns the GPU context, not the router's PID.
- `GET /models` lists every preset with `status.value` (`loaded` / `unloaded`) and `status.args`, including the child's `--port`.
- `GET /slots?model=<id>` and `GET /props?model=<id>` are proxied to the child. Without `?model=` the router answers `400`.
- `GET /metrics` answers `501` unless the child runs with `--metrics`. Since local-ai-infrastructure PR #4, presets set `metrics = true` for every model. Verified with `qwen3.5-9b`: counters `llamacpp:prompt_tokens_total`, `llamacpp:prompt_seconds_total`, `llamacpp:tokens_predicted_total`, `llamacpp:tokens_predicted_seconds_total`, gauge `llamacpp:requests_processing`.
- `/slots` exposes `n_ctx`, `is_processing`, `n_prompt_tokens`, and `next_token.n_decoded`, but no timings.
- On Windows (WDDM), `nvidia-smi --query-compute-apps` returns `used_memory` as `[N/A]`, so M-G4 is unavailable there.

## GPU (NVIDIA, local)

Only for GPUs used by the inference process (ADR-0002).

| ID | Metric | Source (`nvidia-smi --query-gpu=`) | Unit | Status |
| --- | --- | --- | --- | --- |
| M-G1 | GPU name | `name` | text | accepted |
| M-G2 | Utilization | `utilization.gpu` | % | accepted |
| M-G3 | VRAM used / total | `memory.used`, `memory.total` | MiB | accepted |
| M-G4 | VRAM used by the model process | `--query-compute-apps=used_memory` | MiB | proposed |
| M-G5 | Temperature | `temperature.gpu` | °C | accepted |
| M-G6 | Power draw / limit | `power.draw`, `power.limit` | W | accepted |

## Refresh

| Setting | Default | Status |
| --- | --- | --- |
| Poll interval | 1500 ms | proposed |
