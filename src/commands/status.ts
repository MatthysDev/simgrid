import { mutateState, reconcile, type Session } from '../registry.js'

export function formatStatus(sessions: Session[]): string {
  if (sessions.length === 0) return 'No simgrid sessions running.'
  return sessions.map((s) => `● ${s.projectName} → ${s.deviceName} (Metro :${s.metroPort}, pid ${s.pid})`).join('\n')
}

export async function status(): Promise<void> {
  const state = await mutateState((s) => reconcile(s)) // reconcile + persist the cleanup, atomically
  console.log(formatStatus(state.sessions))
}
