import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export interface Session {
  projectPath: string
  projectName: string
  deviceId: string
  deviceName: string
  metroPort: number
  pid: number
  startedAt: string
}

export interface ProjectPref {
  lastDeviceIds: string[]
  /** Build command template per platform slot, remembered after the first build. */
  buildCommands?: { ios?: string; android?: string }
}

export interface State {
  sessions: Session[]
  projectPrefs: Record<string, ProjectPref>
}

export const STATE_FILE = join(homedir(), '.simgrid', 'state.json')

export const emptyState = (): State => ({ sessions: [], projectPrefs: {} })

export async function loadState(file = STATE_FILE): Promise<State> {
  try {
    const raw = JSON.parse(await readFile(file, 'utf8'))
    return {
      sessions: Array.isArray(raw.sessions)
        ? raw.sessions.filter(
            (s: unknown): s is Session =>
              s !== null &&
              typeof s === 'object' &&
              typeof (s as Session).pid === 'number' &&
              typeof (s as Session).projectPath === 'string',
          )
        : [],
      projectPrefs: raw.projectPrefs && typeof raw.projectPrefs === 'object' ? raw.projectPrefs : {},
    }
  } catch {
    return emptyState()
  }
}

export async function saveState(state: State, file = STATE_FILE): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(state, null, 2))
}

export function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/** Self-healing: drop sessions whose owning process is gone (crash, kill -9, …). */
export function reconcile(state: State, alive: (pid: number) => boolean = isPidAlive): State {
  return { ...state, sessions: state.sessions.filter((s) => alive(s.pid)) }
}
