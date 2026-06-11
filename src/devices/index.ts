import type { ProjectInfo } from '../project.js'
import { discoverAndroid, hasAndroidBuild } from './android.js'
import { discoverIosDevices } from './ios-device.js'
import { discoverIosSims, hasIosBuild } from './ios-sim.js'
import type { Device } from './types.js'

export type { Device, Platform } from './types.js'

export async function discoverDevices(project: ProjectInfo): Promise<Device[]> {
  const isMac = process.platform === 'darwin'
  const [sims, iosDevices, android] = await Promise.all([
    isMac ? discoverIosSims() : Promise.resolve([]),
    isMac ? discoverIosDevices() : Promise.resolve([]),
    discoverAndroid(),
  ])
  const all = [...sims, ...iosDevices, ...android]

  await Promise.all(
    all.map(async (d) => {
      if (d.platform === 'ios-sim' && project.iosBundleId) {
        d.hasBuild = await hasIosBuild(d.id, project.iosBundleId)
      } else if ((d.platform === 'android-emu' || d.platform === 'android-device') && d.state === 'booted' && project.androidPackage) {
        d.hasBuild = await hasAndroidBuild(d.id, project.androidPackage)
      }
      // ios-device + shutdown AVDs: unknown ⇒ false (will go through expo run)
    }),
  )
  return all
}
