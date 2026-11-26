/** Normalized inference metrics. Fields a provider cannot supply stay undefined (ADR-0003). */
export interface InferenceSample {
  provider: string
  model?: string
  promptTokensPerSecond?: number
  generationTokensPerSecond?: number
  contextUsed?: number
  contextSize?: number
  /** Requests being processed right now; 0 means the model is idle. */
  activeRequests?: number
  /** PID of the local inference server, used to find its GPUs (ADR-0002). */
  pid?: number
  sampledAt: number
}

export interface InferenceProvider {
  readonly id: string
  detect(signal?: AbortSignal): Promise<boolean>
  poll(signal?: AbortSignal): Promise<InferenceSample>
}
