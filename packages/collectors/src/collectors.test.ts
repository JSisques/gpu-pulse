import assert from "node:assert/strict"
import { test } from "node:test"
import { parsePrometheus } from "./prometheus.ts"
import { findLoadedModel, rate } from "./inference/llama-router.ts"
import { parseListeningPid } from "./platform/port-pid.ts"
import { parseComputeApps, parseGpus, selectGpus } from "./gpu/nvidia-smi.ts"

test("parsePrometheus reads samples and skips comments", () => {
  const text = [
    "# HELP llamacpp:prompt_tokens_total Number of prompt tokens processed.",
    "# TYPE llamacpp:prompt_tokens_total counter",
    "llamacpp:prompt_tokens_total 1520",
    "llamacpp:tokens_predicted_seconds_total 3.25",
    'labeled{slot="0"} 7',
  ].join("\n")
  const m = parsePrometheus(text)
  assert.equal(m.get("llamacpp:prompt_tokens_total"), 1520)
  assert.equal(m.get("llamacpp:tokens_predicted_seconds_total"), 3.25)
  assert.equal(m.get("labeled"), 7)
})

test("findLoadedModel returns the loaded model and its child port", () => {
  const models = {
    data: [
      { id: "a", status: { value: "unloaded", args: ["--port", "0"] } },
      { id: "b", status: { value: "loaded", args: ["llama-server.exe", "--metrics", "--port", "51143"] } },
    ],
  }
  assert.deepEqual(findLoadedModel(models), { id: "b", port: 51143 })
  assert.equal(findLoadedModel({ data: [] }), undefined)
})

test("rate is the counter delta over the busy-time delta", () => {
  assert.equal(rate({ tokens: 100, seconds: 2 }, { tokens: 240, seconds: 4 }), 70)
  assert.equal(rate({ tokens: 100, seconds: 2 }, { tokens: 100, seconds: 2 }), undefined)
  assert.equal(rate({ tokens: 500, seconds: 9 }, { tokens: 10, seconds: 1 }), undefined, "counter reset")
  assert.equal(rate(undefined, { tokens: 10, seconds: 1 }), undefined)
})

test("parseListeningPid finds the PID listening on a port", () => {
  const out = [
    "  TCP    127.0.0.1:18881        0.0.0.0:0              LISTENING       30052",
    "  TCP    127.0.0.1:51143        0.0.0.0:0              LISTENING       14132",
    "  TCP    127.0.0.1:51143        127.0.0.1:60000        ESTABLISHED     999",
  ].join("\r\n")
  assert.equal(parseListeningPid(out, 51143), 14132)
  assert.equal(parseListeningPid(out, 1), undefined)
})

test("nvidia-smi parsers and GPU selection by PID", () => {
  const gpus = parseGpus(
    "GPU-aaa, NVIDIA GeForce RTX 5080, 4, 15112, 16303, 38.04, 17.96, 360.00\nGPU-bbb, Other, [N/A], 1, 2, [N/A], [N/A], [N/A]\n",
    42,
  )
  assert.deepEqual(gpus[0], {
    uuid: "GPU-aaa",
    name: "NVIDIA GeForce RTX 5080",
    utilizationPercent: 4,
    memoryUsedMiB: 15112,
    memoryTotalMiB: 16303,
    temperatureC: 38.04,
    powerDrawW: 17.96,
    powerLimitW: 360,
    sampledAt: 42,
  })
  assert.equal(gpus[1]?.utilizationPercent, undefined)
  const apps = parseComputeApps("14132, GPU-aaa, [N/A]\n7, GPU-bbb, 512\n")
  assert.deepEqual(apps, [
    { pid: 14132, uuid: "GPU-aaa", usedMiB: undefined },
    { pid: 7, uuid: "GPU-bbb", usedMiB: 512 },
  ])
  const selected = selectGpus(gpus, apps, [7])
  assert.deepEqual(
    selected.map((g) => [g.uuid, g.processMemoryMiB]),
    [["GPU-bbb", 512]],
  )
  assert.deepEqual(selectGpus(gpus, apps, []), [])
})
