import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { Runner } from './runner.js'

/** Lockfiles whose mtime tells us whether node_modules is behind the manifest. */
const LOCKFILES = ['bun.lockb', 'bun.lock', 'pnpm-lock.yaml', 'yarn.lock', 'package-lock.json']

export type DepsState = 'ok' | 'absent' | 'stale'

/** Install command for the project's package manager (`bun install`, `npm install`, …). */
export function installArgv(runner: Runner): { command: string; args: string[] } {
  return { command: runner, args: ['install'] }
}

/**
 * Pure decision from filesystem facts: are JS deps missing entirely, present but
 * older than the lockfile (likely after a pull), or fine?
 */
export function decideDepsState(facts: { hasNodeModules: boolean; lockMtimeMs: number | null; nodeModulesMtimeMs: number | null }): DepsState {
  if (!facts.hasNodeModules) return 'absent'
  if (facts.lockMtimeMs !== null && facts.nodeModulesMtimeMs !== null && facts.lockMtimeMs > facts.nodeModulesMtimeMs) return 'stale'
  return 'ok'
}

async function mtimeMs(path: string): Promise<number | null> {
  try {
    return (await stat(path)).mtimeMs
  } catch {
    return null
  }
}

/** Inspect a project on disk: node_modules presence vs the newest lockfile. */
export async function depsStatus(projectDir: string): Promise<DepsState> {
  const nodeModulesMtimeMs = await mtimeMs(join(projectDir, 'node_modules'))
  let lockMtimeMs: number | null = null
  for (const f of LOCKFILES) {
    const m = await mtimeMs(join(projectDir, f))
    if (m !== null && (lockMtimeMs === null || m > lockMtimeMs)) lockMtimeMs = m
  }
  return decideDepsState({ hasNodeModules: nodeModulesMtimeMs !== null, lockMtimeMs, nodeModulesMtimeMs })
}
