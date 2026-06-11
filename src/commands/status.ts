import { loadState, reconcile, saveState, type Session } from '../registry.js'

export function formatStatus(sessions: Session[]): string {
  if (sessions.length === 0) return 'No simgrid sessions running.'
  return sessions.map((s) => `● ${s.projectName} → ${s.deviceName} (Metro :${s.metroPort}, pid ${s.pid})`).join('\n')
}

export async function status(): Promise<void> {
  const state = reconcile(await loadState())
  await saveState(state) // persist the cleanup
  console.log(formatStatus(state.sessions))
}
