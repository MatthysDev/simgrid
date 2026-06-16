import type { Platform } from './devices/types.js'
import type { Session } from './registry.js'

/** Sessions matching a free-text query (device name or id, case-insensitive); all when no query. */
export function matchSessions(sessions: Session[], query?: string): Session[] {
  if (!query) return sessions
  const q = query.toLowerCase()
  return sessions.filter((s) => s.deviceName.toLowerCase().includes(q) || s.deviceId.toLowerCase().includes(q))
}

export interface LogTarget {
  platform: Platform
  deviceId: string
  appName?: string
}

/** The system-log command for a device. iOS simulators filter to the app when its name is known. */
export function logCommandFor(target: LogTarget): { command: string; args: string[] } {
  switch (target.platform) {
    case 'ios-sim': {
      const args = ['simctl', 'spawn', target.deviceId, 'log', 'stream', '--level=debug', '--style=compact']
      if (target.appName) args.push('--predicate', `process == "${target.appName}"`)
      return { command: 'xcrun', args }
    }
    case 'android-emu':
    case 'android-device':
      return { command: 'adb', args: ['-s', target.deviceId, 'logcat'] }
    case 'ios-device':
      throw new Error('Streaming logs from a physical iOS device is not supported yet.')
  }
}
