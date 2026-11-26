import { execFile } from "node:child_process"
import { promisify } from "node:util"
import type { GpuSample, GpuSource } from "./port.ts"

const run = promisify(execFile)

const GPU_FIELDS = "uuid,name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,power.limit"

export interface ComputeApp {
  pid: number
  uuid: string
  /** Undefined on Windows WDDM, where nvidia-smi reports [N/A]. */
  usedMiB: number | undefined
}

function num(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const parsed = Number(value.trim())
  return value.trim() === "" || !Number.isFinite(parsed) ? undefined : parsed
}

function rows(csv: string): string[][] {
  return csv
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => line.split(",").map((cell) => cell.trim()))
}

export function parseGpus(csv: string, sampledAt: number): GpuSample[] {
  return rows(csv).map(([uuid = "", name = "", util, used, total, temp, draw, limit]) => ({
    uuid,
    name,
    utilizationPercent: num(util),
    memoryUsedMiB: num(used),
    memoryTotalMiB: num(total),
    temperatureC: num(temp),
    powerDrawW: num(draw),
    powerLimitW: num(limit),
    sampledAt,
  }))
}

export function parseComputeApps(csv: string): ComputeApp[] {
  return rows(csv).flatMap(([pid, uuid, used]) => {
    const parsed = num(pid)
    return parsed === undefined || !uuid ? [] : [{ pid: parsed, uuid, usedMiB: num(used) }]
  })
}

/** Keeps only the GPUs the given PIDs run on (ADR-0002), adding their VRAM when the driver reports it. */
export function selectGpus(gpus: GpuSample[], apps: ComputeApp[], pids: readonly number[]): GpuSample[] {
  const owned = apps.filter((app) => pids.includes(app.pid))
  return gpus.flatMap((gpu) => {
    const mine = owned.filter((app) => app.uuid === gpu.uuid)
    if (mine.length === 0) return []
    const known = mine.map((app) => app.usedMiB).filter((v): v is number => v !== undefined)
    return [{ ...gpu, processMemoryMiB: known.length ? known.reduce((a, b) => a + b, 0) : undefined }]
  })
}

export class NvidiaSmiSource implements GpuSource {
  readonly id = "nvidia-smi"

  private readonly binary: string

  constructor(binary = "nvidia-smi") {
    this.binary = binary
  }

  async sample(pids: readonly number[], signal?: AbortSignal): Promise<GpuSample[]> {
    if (pids.length === 0) return []
    const opts = { signal, windowsHide: true }
    const [gpus, apps] = await Promise.all([
      run(this.binary, [`--query-gpu=${GPU_FIELDS}`, "--format=csv,noheader,nounits"], opts),
      run(this.binary, ["--query-compute-apps=pid,gpu_uuid,used_memory", "--format=csv,noheader,nounits"], opts),
    ])
    return selectGpus(parseGpus(gpus.stdout, Date.now()), parseComputeApps(apps.stdout), pids)
  }
}
