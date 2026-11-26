import { execFile } from "node:child_process"
import { promisify } from "node:util"

const run = promisify(execFile)

/** Finds the PID in `netstat -ano` output that is LISTENING on the given local port. */
export function parseListeningPid(output: string, port: number): number | undefined {
  for (const line of output.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/)
    if (cols[0] !== "TCP" || cols[3] !== "LISTENING") continue
    if (cols[1]?.endsWith(`:${port}`)) {
      const pid = Number(cols[4])
      if (Number.isInteger(pid) && pid > 0) return pid
    }
  }
  return undefined
}

/** Resolves the PID listening on a local TCP port. Windows only for the MVP; other platforms return undefined. */
export async function pidListeningOn(port: number, signal?: AbortSignal): Promise<number | undefined> {
  if (process.platform !== "win32") return undefined
  const { stdout } = await run("netstat", ["-ano", "-p", "TCP"], { signal, windowsHide: true })
  return parseListeningPid(stdout, port)
}
