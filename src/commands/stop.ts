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
  if (mine.length > 0) {
    // let the signaled processes run their own cleanup first
    await new Promise((r) => setTimeout(r, 500))
  }
  const fresh = reconcile(await loadState())
  fresh.sessions = fresh.sessions.filter((s) => s.projectPath !== cwd)
  await saveState(fresh)
  console.log(mine.length ? pc.green(`Stopped ${mine.length} session(s).`) : 'Nothing to stop for this project.')
}
