import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { execa } from 'execa'

export interface ProjectInfo {
  path: string
  name: string
  scheme: string | undefined
  iosBundleId: string | undefined
  androidPackage: string | undefined
}

/** Extract project identity from a parsed Expo config (app.json or `expo config --json`). */
export function parseAppConfig(config: any, projectPath: string): ProjectInfo {
  const expo = config?.expo ?? config ?? {}
  return {
    path: projectPath,
    name: expo.name ?? basename(projectPath),
    scheme: Array.isArray(expo.scheme) ? expo.scheme[0] : expo.scheme,
    iosBundleId: expo.ios?.bundleIdentifier,
    androidPackage: expo.android?.package,
  }
}

/** Resolve project identity: fast path app.json, fallback to `expo config` for app.config.{js,ts}. */
export async function resolveProject(projectPath: string): Promise<ProjectInfo> {
  try {
    const raw = await readFile(join(projectPath, 'app.json'), 'utf8')
    return parseAppConfig(JSON.parse(raw), projectPath)
  } catch {
    const { stdout } = await execa('npx', ['expo', 'config', '--json'], { cwd: projectPath })
    return parseAppConfig(JSON.parse(stdout), projectPath)
  }
}
