import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { BuildStatus } from './devices/types.js'
import type { ProjectInfo } from './project.js'

/** Computes a project's current native fingerprint hash; throws if it can't. */
export type FingerprintComputer = (projectPath: string) => Promise<string>

/**
 * Resolve `@expo/fingerprint` from the *target* project (its version must match
 * the project's Expo SDK) and hash its native inputs.
 */
const defaultCompute: FingerprintComputer = async (projectPath) => {
  const require = createRequire(join(projectPath, 'package.json'))
  const entry = require.resolve('@expo/fingerprint')
  const fp = (await import(pathToFileURL(entry).href)) as {
    createFingerprintAsync: (root: string) => Promise<{ hash: string }>
  }
  const { hash } = await fp.createFingerprintAsync(projectPath)
  return hash
}

/**
 * Current native fingerprint of the project, or `null` when it can't be computed
 * (no `@expo/fingerprint`, error, or timeout). Never throws — callers degrade to
 * an `untracked` build status.
 */
export async function currentFingerprint(
  project: ProjectInfo,
  opts: { compute?: FingerprintComputer; timeoutMs?: number } = {},
): Promise<string | null> {
  const compute = opts.compute ?? defaultCompute
  const timeoutMs = opts.timeoutMs ?? 8000
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), timeoutMs)
    })
    return await Promise.race([compute(project.path).catch(() => null), timeout])
  } catch {
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Refine a device's discovered status (`absent` / `untracked` / `unknown`) into a
 * freshness verdict by comparing the build's recorded baseline to the project's
 * current fingerprint. Only `untracked` (installed, freshness TBD) is refined.
 */
export function refineBuildStatus(discovered: BuildStatus, baseline: string | undefined, current: string | null): BuildStatus {
  if (discovered !== 'untracked') return discovered
  if (current === null || baseline === undefined) return 'untracked'
  return baseline === current ? 'up-to-date' : 'rebuild'
}
