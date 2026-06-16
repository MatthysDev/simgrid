import { spawn } from 'node:child_process'
import { isCancel, select } from '@clack/prompts'
import pc from 'picocolors'
import { logCommandFor, matchSessions } from '../logs.js'
import { resolveProject } from '../project.js'
import { loadState, reconcile, saveState, type Session } from '../registry.js'

export async function logs(cwd = process.cwd(), argv: string[] = process.argv.slice(3)): Promise<void> {
  const query = argv.find((a) => !a.startsWith('-'))
  const state = reconcile(await loadState())
  await saveState(state)

  const mine = state.sessions.filter((s) => s.projectPath === cwd)
  if (mine.length === 0) {
    console.log('No running session for this project — start one with simgrid first.')
    return
  }

  const matches = matchSessions(mine, query)
  if (matches.length === 0) {
    console.error(pc.red(`No running device matches "${query}". Running: ${mine.map((s) => s.deviceName).join(', ')}`))
    process.exit(1)
  }

  let target: Session | undefined = matches[0]
  if (matches.length > 1) {
    const chosen = await select({
      message: 'Stream logs from which device?',
      options: matches.map((s) => ({ value: s.deviceId, label: `${s.deviceName} ${pc.dim(`(${s.platform})`)}` })),
    })
    if (isCancel(chosen)) return
    target = matches.find((s) => s.deviceId === chosen)
  }
  if (!target) return

  const project = await resolveProject(cwd).catch(() => undefined)
  let command: string
  let args: string[]
  try {
    ;({ command, args } = logCommandFor({ platform: target.platform, deviceId: target.deviceId, appName: project?.name }))
  } catch (err) {
    console.error(pc.red(err instanceof Error ? err.message : String(err)))
    process.exit(1)
  }

  console.log(pc.cyan(`▶ logs: ${target.deviceName} ${pc.dim('— Ctrl+C to stop')}\n`))
  const child = spawn(command, args, { stdio: 'inherit' })
  process.on('SIGINT', () => child.kill('SIGINT'))
  child.on('exit', (code) => process.exit(code ?? 0))
}
