import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { execa } from 'execa'

export interface ProjectInfo {
  path: string
  name: string
  scheme: string | undefined
  iosBundleId: string | undefined
  androidPackage: string | undefined
  hasDevClient: boolean
}

/** True when expo-dev-client is declared in the project's package.json. */
export function packageHasDevClient(pkg: any): boolean {
  return Boolean(pkg?.dependencies?.['expo-dev-client'] ?? pkg?.devDependencies?.['expo-dev-client'])
}

async function readDevClient(projectPath: string): Promise<boolean> {
  try {
    return packageHasDevClient(JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf8')))
  } catch {
    return false
  }
}

/** Extract project identity from a parsed Expo config (app.json or `expo config --json`). */
export function parseAppConfig(config: any, projectPath: string, hasDevClient = false): ProjectInfo {
  const expo = config?.expo ?? config ?? {}
  return {
    path: projectPath,
    name: expo.name ?? basename(projectPath),
    scheme: Array.isArray(expo.scheme) ? expo.scheme[0] : expo.scheme,
    iosBundleId: expo.ios?.bundleIdentifier,
    androidPackage: expo.android?.package,
    hasDevClient,
  }
}

/** Resolve project identity: fast path app.json, fallback to `expo config` for app.config.{js,ts}. */
export async function resolveProject(projectPath: string): Promise<ProjectInfo> {
  const hasDevClient = await readDevClient(projectPath)
  let raw: string | undefined
  try {
    raw = await readFile(join(projectPath, 'app.json'), 'utf8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
  if (raw !== undefined) return parseAppConfig(JSON.parse(raw), projectPath, hasDevClient)
  const { stdout } = await execa('npx', ['expo', 'config', '--json'], { cwd: projectPath })
  return parseAppConfig(JSON.parse(stdout), projectPath, hasDevClient)
}
