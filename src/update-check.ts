import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import pc from 'picocolors'

export const UPDATE_CACHE_FILE = join(homedir(), '.simgrid', 'update-check.json')
const REGISTRY = 'https://registry.npmjs.org'
const PACKAGE = 'simgrid-cli'
const DAY_MS = 24 * 60 * 60 * 1000

export interface UpdateCache {
  lastCheckedAt: string
  latestVersion: string
}

/** Fetches the latest published version of a package, or null on any failure. */
export type VersionFetcher = (pkg: string) => Promise<string | null>

function parseSemver(v: string | undefined): [number, number, number] | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(v ?? '')
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

/** True when `latest` is a strictly higher semver than `current`; false for non-semver (e.g. 'dev'). */
export function isNewer(latest: string, current: string): boolean {
  const a = parseSemver(latest)
  const b = parseSemver(current)
  if (!a || !b) return false
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i]
  return false
}

export function parseRegistryVersion(doc: unknown): string | undefined {
  const v = (doc as { version?: unknown })?.version
  return typeof v === 'string' ? v : undefined
}

/** Upgrade line to show the user, or null when already up to date / no data. */
export function cachedNotice(current: string, cache: UpdateCache | undefined): string | null {
  if (!cache?.latestVersion || !isNewer(cache.latestVersion, current)) return null
  return pc.yellow(`⬆ update available: ${current} → ${cache.latestVersion} · run ${pc.bold('npm i -g simgrid-cli@latest')}`)
}

export function needsRefresh(cache: UpdateCache | undefined, now: number, intervalMs = DAY_MS): boolean {
  if (!cache?.lastCheckedAt) return true
  const t = Date.parse(cache.lastCheckedAt)
  return Number.isNaN(t) || now - t > intervalMs
}

const defaultFetcher: VersionFetcher = async (pkg) => {
  const res = await fetch(`${REGISTRY}/${pkg}/latest`, { signal: AbortSignal.timeout(2500) })
  if (!res.ok) return null
  return parseRegistryVersion(await res.json()) ?? null
}

export async function readCache(file = UPDATE_CACHE_FILE): Promise<UpdateCache | undefined> {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return undefined
  }
}

/** Fetch the latest version and persist it to the cache. Never throws. */
export async function refreshCache(now: number, opts: { file?: string; pkg?: string; fetcher?: VersionFetcher } = {}): Promise<void> {
  const file = opts.file ?? UPDATE_CACHE_FILE
  try {
    const latestVersion = await (opts.fetcher ?? defaultFetcher)(opts.pkg ?? PACKAGE)
    if (!latestVersion) return
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, JSON.stringify({ lastCheckedAt: new Date(now).toISOString(), latestVersion }, null, 2))
  } catch {
    /* offline / unwritable — silently skip */
  }
}

/**
 * Non-blocking update check: return the notice from the *cached* result instantly,
 * and refresh the cache in the background (for the next run) when it's stale.
 */
export async function updateNotice(
  current: string,
  opts: { file?: string; pkg?: string; fetcher?: VersionFetcher; now?: number } = {},
): Promise<string | null> {
  const file = opts.file ?? UPDATE_CACHE_FILE
  const now = opts.now ?? Date.now()
  const cache = await readCache(file)
  if (needsRefresh(cache, now)) void refreshCache(now, { file, pkg: opts.pkg, fetcher: opts.fetcher })
  return cachedNotice(current, cache)
}

/** On-demand, blocking check used by `simgrid doctor`. */
export async function doctorUpdateLine(current: string, opts: { pkg?: string; fetcher?: VersionFetcher } = {}): Promise<string> {
  const latest = await (opts.fetcher ?? defaultFetcher)(opts.pkg ?? PACKAGE)
  if (!latest) return pc.dim('simgrid update check: unavailable (offline?)')
  return isNewer(latest, current)
    ? pc.yellow(`⬆ simgrid v${current} — latest is ${latest}. Update: ${pc.bold('npm i -g simgrid-cli@latest')}`)
    : pc.green(`✔ simgrid v${current} is up to date`)
}
