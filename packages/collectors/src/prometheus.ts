/** Parses Prometheus text exposition into metric name -> value. Labels are dropped; the first sample wins. */
export function parsePrometheus(text: string): Map<string, number> {
  const metrics = new Map<string, number>()
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const match = /^([^\s{]+)(?:\{[^}]*\})?\s+(\S+)/.exec(line)
    if (!match) continue
    const [, name, value] = match
    const parsed = Number(value)
    if (name && Number.isFinite(parsed) && !metrics.has(name)) metrics.set(name, parsed)
  }
  return metrics
}
