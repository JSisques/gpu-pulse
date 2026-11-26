import { parsePrometheus } from "../prometheus.ts"
import { pidListeningOn } from "../platform/port-pid.ts"
import type { InferenceProvider, InferenceSample } from "./port.ts"

export interface Counter {
  tokens: number
  seconds: number
}

interface RouterModel {
  id?: string
  status?: { value?: string; args?: string[] }
}

/** Picks the model the router reports as loaded, with the port of its child llama-server. */
export function findLoadedModel(models: { data?: RouterModel[] }): { id: string; port?: number } | undefined {
  const loaded = models.data?.find((m) => m.status?.value === "loaded" && m.id)
  if (!loaded?.id) return undefined
  const args = loaded.status?.args ?? []
  const port = Number(args[args.indexOf("--port") + 1])
  return { id: loaded.id, port: args.includes("--port") && port > 0 ? port : undefined }
}

/** Tokens per second of busy time between two counter readings (spec M-I2, M-I3). */
export function rate(prev: Counter | undefined, curr: Counter): number | undefined {
  if (!prev) return undefined
  const tokens = curr.tokens - prev.tokens
  const seconds = curr.seconds - prev.seconds
  if (tokens <= 0 || seconds <= 0) return undefined
  return tokens / seconds
}

interface State {
  model: string
  prompt: Counter
  generation: Counter
  promptRate?: number
  generationRate?: number
  pid?: number
}

export interface LlamaRouterOptions {
  baseUrl?: string
  fetch?: typeof fetch
  resolvePid?: (port: number, signal?: AbortSignal) => Promise<number | undefined>
}

/** llama.cpp in router mode: one child llama-server per loaded model (see specs/metrics). */
export class LlamaRouterProvider implements InferenceProvider {
  readonly id = "llama.cpp"
  private readonly baseUrl: string
  private readonly http: typeof fetch
  private readonly resolvePid: NonNullable<LlamaRouterOptions["resolvePid"]>
  private state: State | undefined

  constructor(options: LlamaRouterOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "http://127.0.0.1:18881").replace(/\/$/, "")
    this.http = options.fetch ?? fetch
    this.resolvePid = options.resolvePid ?? pidListeningOn
  }

  async detect(signal?: AbortSignal): Promise<boolean> {
    try {
      return (await this.http(`${this.baseUrl}/models`, { signal })).ok
    } catch {
      return false
    }
  }

  async poll(signal?: AbortSignal): Promise<InferenceSample> {
    const sampledAt = Date.now()
    const models = (await (await this.http(`${this.baseUrl}/models`, { signal })).json()) as { data?: RouterModel[] }
    const loaded = findLoadedModel(models)
    if (!loaded) {
      this.state = undefined
      return { provider: this.id, sampledAt }
    }

    const res = await this.http(`${this.baseUrl}/metrics?model=${encodeURIComponent(loaded.id)}`, { signal })
    const metrics = parsePrometheus(res.ok ? await res.text() : "")
    const prompt = {
      tokens: metrics.get("llamacpp:prompt_tokens_total") ?? 0,
      seconds: metrics.get("llamacpp:prompt_seconds_total") ?? 0,
    }
    const generation = {
      tokens: metrics.get("llamacpp:tokens_predicted_total") ?? 0,
      seconds: metrics.get("llamacpp:tokens_predicted_seconds_total") ?? 0,
    }

    const prev = this.state?.model === loaded.id ? this.state : undefined
    const pid = prev?.pid ?? (loaded.port ? await this.resolvePid(loaded.port, signal).catch(() => undefined) : undefined)
    // Idle polls keep the last measured rate instead of dropping to zero.
    this.state = {
      model: loaded.id,
      prompt,
      generation,
      pid,
      promptRate: rate(prev?.prompt, prompt) ?? prev?.promptRate,
      generationRate: rate(prev?.generation, generation) ?? prev?.generationRate,
    }

    return {
      provider: this.id,
      model: loaded.id,
      promptTokensPerSecond: this.state.promptRate,
      generationTokensPerSecond: this.state.generationRate,
      activeRequests: metrics.get("llamacpp:requests_processing"),
      pid,
      sampledAt,
    }
  }
}
