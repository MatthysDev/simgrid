export type Platform = 'ios-sim' | 'android-emu' | 'ios-device' | 'android-device'

/**
 * Freshness of the dev build on a device, computed without booting it:
 * - `absent`      not installed
 * - `up-to-date`  installed, native fingerprint matches the project
 * - `rebuild`     installed, native fingerprint differs (a rebuild is needed)
 * - `untracked`   installed, but no simgrid baseline / fingerprint unavailable
 * - `unknown`     device can't be probed (off, or no bundle id / package)
 */
export type BuildStatus = 'absent' | 'up-to-date' | 'rebuild' | 'untracked' | 'unknown'

export interface Device {
  /** udid (iOS), adb serial (Android booted), or `avd:<name>` (Android offline AVD) */
  id: string
  platform: Platform
  name: string
  model: string
  state: 'booted' | 'shutdown'
  /** is the project's dev build already installed on this device? */
  hasBuild: boolean
  /** freshness of that build (see BuildStatus); defaults to 'unknown' until probed */
  buildStatus: BuildStatus
  /** marketing version baked into the installed app (e.g. "1.1.0"), if readable */
  installedVersion?: string
}
