import { mkdir, open, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { Platform } from './devices/types.js'

export interface Session {
  projectPath: string
  projectName: string
  /** platform of the target device — drives `simgrid logs` */
  platform: Platform
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
  /** Named device sets the user can relaunch in one shot (`--profile <name>`). */
  profiles?: Record<string, string[]>
}

export interface State {
  sessions: Session[]
  projectPrefs: Record<string, ProjectPref>
}

export const STATE_FILE = join(homedir(), '.simgrid', 'state.json')

export const emptyState = (): State => ({ sessions: [], projectPrefs: {} })

const PLATFORMS: ReadonlySet<string> = new Set<Platform>(['ios-sim', 'android-emu', 'ios-device', 'android-device'])

function isValidSession(s: unknown): s is Session {
  return (
    s !== null &&
    typeof s === 'object' &&
    typeof (s as Session).pid === 'number' &&
    typeof (s as Session).projectPath === 'string' &&
    PLATFORMS.has((s as Session).platform)
  )
}

export async function loadState(file = STATE_FILE): Promise<State> {
  try {
    const raw = JSON.parse(await readFile(file, 'utf8'))
    return {
      sessions: Array.isArray(raw.sessions) ? raw.sessions.filter(isValidSession) : [],
      projectPrefs: raw.projectPrefs && typeof raw.projectPrefs === 'object' ? raw.projectPrefs : {},
    }
  } catch {
    return emptyState()
  }
}

/** Write the state via temp-file + atomic rename so a crash never leaves torn JSON. */
export async function saveState(state: State, file = STATE_FILE): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await writeFile(tmp, JSON.stringify(state, null, 2))
  await rename(tmp, file)
}

/** Acquire an exclusive lock file, stealing it if a previous holder died and left it stale. */
async function acquireLock(lockPath: string, timeoutMs = 5000, staleMs = 15_000): Promise<void> {
  const started = Date.now()
  for (;;) {
    try {
      const fd = await open(lockPath, 'wx')
      await fd.close()
      return
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err
      try {
        const st = await stat(lockPath)
        if (Date.now() - st.mtimeMs > staleMs) {
          await unlink(lockPath).catch(() => {})
          continue
        }
      } catch {
        /* lock vanished — retry immediately */
      }
      if (Date.now() - started > timeoutMs) throw new Error(`Timed out acquiring lock ${lockPath}`)
      await new Promise((r) => setTimeout(r, 20))
    }
  }
}

/**
 * Read → modify → write the state under a cross-process lock, so concurrent simgrid
 * invocations can't clobber each other's sessions. `fn` mutates the draft in place
 * (or returns a replacement). Returns the persisted state.
 */
export async function mutateState(fn: (state: State) => State | void, file = STATE_FILE): Promise<State> {
  await mkdir(dirname(file), { recursive: true })
  const lockPath = `${file}.lock`
  await acquireLock(lockPath)
  try {
    const state = await loadState(file)
    const next = fn(state) ?? state
    await saveState(next, file)
    return next
  } finally {
    await unlink(lockPath).catch(() => {})
  }
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
