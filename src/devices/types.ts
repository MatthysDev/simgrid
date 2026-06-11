export type Platform = 'ios-sim' | 'android-emu' | 'ios-device' | 'android-device'

export interface Device {
  /** udid (iOS), adb serial (Android booted), or `avd:<name>` (Android offline AVD) */
  id: string
  platform: Platform
  name: string
  model: string
  state: 'booted' | 'shutdown'
  /** is the project's dev build already installed on this device? */
  hasBuild: boolean
}
