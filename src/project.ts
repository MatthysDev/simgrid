import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { execa } from 'execa'
import { detectRunner, expoArgv, type Runner } from './runner.js'

export interface ProjectInfo {
  path: string
  name: string
  scheme: string | undefined
  iosBundleId: string | undefined
  androidPackage: string | undefined
  hasDevClient: boolean
  scripts: Record<string, string>
  /** package manager this project uses — drives how expo/scripts are invoked */
  runner: Runner
  /** marketing version from app config (expo.version), for outdated-build hints */
  version: string | undefined
}

/** True when expo-dev-client is declared in the project's package.json. */
export function packageHasDevClient(pkg: any): boolean {
  return Boolean(pkg?.dependencies?.['expo-dev-client'] ?? pkg?.devDependencies?.['expo-dev-client'])
}

/** Keep only string-valued scripts from a parsed package.json. */
export function packageScripts(pkg: any): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [name, command] of Object.entries(pkg?.scripts ?? {})) {
    if (typeof command === 'string') out[name] = command
  }
  return out
}

async function readPackage(projectPath: string): Promise<{ hasDevClient: boolean; scripts: Record<string, string> }> {
  try {
    const pkg = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf8'))
    return { hasDevClient: packageHasDevClient(pkg), scripts: packageScripts(pkg) }
  } catch {
    return { hasDevClient: false, scripts: {} }
  }
}

/** Extract project identity from a parsed Expo config (app.json or `expo config --json`). */
export function parseAppConfig(
  config: any,
  projectPath: string,
  extras: { hasDevClient?: boolean; scripts?: Record<string, string>; runner?: Runner } = {},
): ProjectInfo {
  const expo = config?.expo ?? config ?? {}
  return {
    path: projectPath,
    name: expo.name ?? basename(projectPath),
    scheme: Array.isArray(expo.scheme) ? expo.scheme[0] : expo.scheme,
    iosBundleId: expo.ios?.bundleIdentifier,
    androidPackage: expo.android?.package,
    hasDevClient: extras.hasDevClient ?? false,
    scripts: extras.scripts ?? {},
    runner: extras.runner ?? 'npm',
    version: expo.version,
  }
}

/** Resolve project identity: fast path app.json, fallback to `expo config` for app.config.{js,ts}. */
export async function resolveProject(projectPath: string): Promise<ProjectInfo> {
  const [pkg, runner] = await Promise.all([readPackage(projectPath), detectRunner(projectPath)])
  const extras = { ...pkg, runner }
  let raw: string | undefined
  try {
    raw = await readFile(join(projectPath, 'app.json'), 'utf8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
  if (raw !== undefined) return parseAppConfig(JSON.parse(raw), projectPath, extras)
  const { command, prefix } = expoArgv(runner)
  const { stdout } = await execa(command, [...prefix, 'config', '--json'], { cwd: projectPath })
  return parseAppConfig(JSON.parse(stdout), projectPath, extras)
}
