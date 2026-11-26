import { Plugin } from "@opencode/plugin/tui"
import { createSignal, For, Show } from "solid-js"
import { LlamaRouterProvider, NvidiaSmiSource, type GpuSample, type InferenceSample } from "@gpu-pulse/collectors"

const POLL_MS = 1500

const fmt = (value: number | undefined, unit: string, digits = 0) =>
  value === undefined ? "-" : `${value.toFixed(digits)}${unit}`

export default Plugin.define({
  id: "gpu-pulse.tui",
  setup(context) {
    const inference = new LlamaRouterProvider()
    const gpuSource = new NvidiaSmiSource()
    const [sample, setSample] = createSignal<InferenceSample>()
    const [gpus, setGpus] = createSignal<GpuSample[]>([])
    const [error, setError] = createSignal<string>()

    let running = false
    let controller = new AbortController()
    const tick = async () => {
      if (running) return
      running = true
      try {
        const next = await inference.poll(controller.signal)
        setSample(next)
        setGpus(await gpuSource.sample(next.pid ? [next.pid] : [], controller.signal))
        setError(undefined)
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause))
      } finally {
        running = false
      }
    }
    void tick()
    const timer = setInterval(tick, POLL_MS)

    const title = () => context.theme.text.base
    const color = () => context.theme.text.muted
    const removeSlot = context.ui.slot({
      append: "sidebar.content",
      render: () => (
        <box flexDirection="column">
          <text fg={title()}>
            <b>GPU Pulse</b>
          </text>
          <Show when={!error()} fallback={<text fg={color()}>llama.cpp unreachable</text>}>
            <text fg={color()}>{sample()?.model ?? "no model loaded"}</text>
            <Show when={sample()?.model}>
              <text fg={color()}>
                gen {fmt(sample()?.generationTokensPerSecond, " t/s", 1)} · pp {fmt(sample()?.promptTokensPerSecond, " t/s", 1)}
              </text>
              <text fg={color()}>{(sample()?.activeRequests ?? 0) > 0 ? "generating" : "idle"}</text>
            </Show>
            <For each={gpus()}>
              {(gpu) => (
                <box flexDirection="column">
                  <text fg={color()}>{gpu.name}</text>
                  <text fg={color()}>
                    util {fmt(gpu.utilizationPercent, "%")} · {fmt(gpu.temperatureC, "°C")} · {fmt(gpu.powerDrawW, " W")}
                  </text>
                  <text fg={color()}>
                    vram {fmt(gpu.memoryUsedMiB, "")}/{fmt(gpu.memoryTotalMiB, " MiB")}
                  </text>
                </box>
              )}
            </For>
          </Show>
        </box>
      ),
    })

    return () => {
      clearInterval(timer)
      controller.abort()
      controller = new AbortController()
      removeSlot()
    }
  },
})
