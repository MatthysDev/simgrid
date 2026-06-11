import pc from 'picocolors'
import { loadState, reconcile, saveState } from '../registry.js'

export async function stop(cwd = process.cwd()): Promise<void> {
  const state = reconcile(await loadState())
  const mine = state.sessions.filter((s) => s.projectPath === cwd)
  for (const s of mine) {
    try {
      process.kill(s.pid, 'SIGINT')
    } catch {
      /* already gone */
    }
  }
  state.sessions = state.sessions.filter((s) => s.projectPath !== cwd)
  await saveState(state)
  console.log(mine.length ? pc.green(`Stopped ${mine.length} session(s).`) : 'Nothing to stop for this project.')
}
