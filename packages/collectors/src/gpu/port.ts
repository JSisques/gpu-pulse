export interface GpuSample {
  uuid: string
  name: string
  utilizationPercent?: number
  memoryUsedMiB?: number
  memoryTotalMiB?: number
  /** VRAM held by the inference process on this GPU. */
  processMemoryMiB?: number
  temperatureC?: number
  powerDrawW?: number
  powerLimitW?: number
  sampledAt: number
}

/** Returns samples only for the GPUs used by the given processes (ADR-0002). */
export interface GpuSource {
  readonly id: string
  sample(pids: readonly number[], signal?: AbortSignal): Promise<GpuSample[]>
}
