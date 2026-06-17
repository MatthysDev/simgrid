import pc from 'picocolors'
import type { Platform } from './devices/types.js'

// Inlined at build time by tsup; falls back to 'dev' under tsx/vitest.
declare const __SIMGRID_VERSION__: string
export const VERSION = typeof __SIMGRID_VERSION__ !== 'undefined' ? __SIMGRID_VERSION__ : 'dev'

const PLATFORM_EMOJI: Record<Platform, string> = {
  'ios-sim': '🍏',
  'ios-device': '📱',
  'android-emu': '🤖',
  'android-device': '🤖',
}

export function platformEmoji(platform: Platform): string {
  return PLATFORM_EMOJI[platform] ?? '•'
}

/** Branded header printed at launch. */
export function banner(): string {
  return [
    `${pc.bgCyan(pc.black(' simgrid '))} ${pc.dim(`v${VERSION}`)}`,
    pc.dim('one grid for all your simulators'),
  ].join('\n')
}

const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - s.length))

export interface SummaryItem {
  platform: Platform
  deviceName: string
  metroPort: number
}

/** Final recap: project, each device + Metro port, how to stop. */
export function launchSummary(projectName: string, items: SummaryItem[]): string {
  const w = Math.max(...items.map((i) => i.deviceName.length))
  const rows = items.map((it, i) => {
    const branch = i === items.length - 1 ? '└' : '├'
    return `  ${pc.dim(branch)} ${platformEmoji(it.platform)} ${pad(it.deviceName, w)}  ${pc.dim('Metro')} ${pc.cyan(`:${it.metroPort}`)}`
  })
  return [`${pc.green('✔')} ${pc.bold(projectName)} ${pc.green('is live')}`, ...rows, pc.dim('  Press Ctrl+C to stop')].join('\n')
}
