import pc from 'picocolors'
import { mutateState, reconcile, type Session } from '../registry.js'
import { platformEmoji } from '../ui.js'

/** Compact human uptime: `5s`, `4m`, `1h2m`. */
export function formatUptime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h${m % 60}m`
}

const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - s.length))

/** Aligned table: emoji · project · device · Metro port · uptime. */
export function formatStatus(sessions: Session[], now: number = Date.now()): string {
  if (sessions.length === 0) return 'No simgrid sessions running.'
  const rows = sessions.map((s) => ({
    emoji: platformEmoji(s.platform),
    project: s.projectName,
    device: s.deviceName,
    port: `:${s.metroPort}`,
    up: formatUptime(now - Date.parse(s.startedAt)),
  }))
  const w = {
    project: Math.max(...rows.map((r) => r.project.length)),
    device: Math.max(...rows.map((r) => r.device.length)),
    port: Math.max(...rows.map((r) => r.port.length)),
  }
  return rows
    .map(
      (r) =>
        `${pc.green('●')} ${r.emoji}  ${pc.bold(pad(r.project, w.project))}  ${pc.cyan(pad(r.device, w.device))}  ${pc.dim('Metro')} ${pad(r.port, w.port)}  ${pc.dim(r.up)}`,
    )
    .join('\n')
}

export async function status(): Promise<void> {
  const state = await mutateState((s) => reconcile(s)) // reconcile + persist the cleanup, atomically
  console.log(formatStatus(state.sessions))
}
