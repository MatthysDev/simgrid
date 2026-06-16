import { execa } from 'execa'
import pc from 'picocolors'

export interface ToolDef {
  name: string
  purpose: string
  install?: string
}

export interface ToolCheck extends ToolDef {
  found: boolean
}

/** External CLIs simgrid drives, with where to get each one. */
export const TOOLS: ToolDef[] = [
  { name: 'xcrun', purpose: 'iOS simulators & devices', install: 'Install Xcode from the App Store, then run `xcode-select --install`' },
  { name: 'adb', purpose: 'Android devices & emulators', install: 'Install Android SDK platform-tools and add them to your PATH' },
  { name: 'emulator', purpose: 'offline Android emulators (AVDs)', install: 'Install the Android SDK emulator and add it to your PATH' },
]

/** Tools that were not found on the system. */
export function missingTools(checks: ToolCheck[]): ToolCheck[] {
  return checks.filter((c) => !c.found)
}

/** Human-readable health report: one line per tool, plus install hints for what is missing. */
export function formatHealth(checks: ToolCheck[]): string {
  const lines = checks.map((c) => {
    const head = c.found ? pc.green(`✓ ${c.name}`) : pc.red(`✗ ${c.name}`)
    return `${head} ${pc.dim(`— ${c.purpose}`)}`
  })
  const missing = missingTools(checks)
  if (missing.length === 0) {
    lines.push('', pc.green('All good — every tool simgrid needs is on your PATH.'))
  } else {
    lines.push('', pc.yellow('Missing:'))
    for (const m of missing) if (m.install) lines.push(`  ${pc.bold(m.name)}: ${m.install}`)
  }
  return lines.join('\n')
}

/** True when the binary resolves on the current PATH. */
export async function isOnPath(bin: string): Promise<boolean> {
  try {
    await execa('which', [bin])
    return true
  } catch {
    return false
  }
}

/** Probe every known tool on the system. */
export async function checkTools(tools: ToolDef[] = TOOLS): Promise<ToolCheck[]> {
  return Promise.all(tools.map(async (t) => ({ ...t, found: await isOnPath(t.name) })))
}
