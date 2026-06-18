import type { ProjectInfo } from '../project.js'
import { androidInstalledVersion, discoverAndroid, hasAndroidBuild } from './android.js'
import { discoverIosDevices } from './ios-device.js'
import { discoverIosSims, hasIosBuild, iosInstalledVersion } from './ios-sim.js'
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
      // Probe install + read the installed version where we cheaply can. Devices we
      // can't probe (ios-device, shutdown AVDs, missing bundle id/pkg) stay 'unknown'.
      // 'untracked' = installed-but-freshness-TBD; start() refines it via fingerprint.
      if (d.platform === 'ios-sim' && project.iosBundleId) {
        d.hasBuild = await hasIosBuild(d.id, project.iosBundleId)
        d.buildStatus = d.hasBuild ? 'untracked' : 'absent'
        if (d.hasBuild) d.installedVersion = await iosInstalledVersion(d.id, project.iosBundleId)
      } else if ((d.platform === 'android-emu' || d.platform === 'android-device') && d.state === 'booted' && project.androidPackage) {
        d.hasBuild = await hasAndroidBuild(d.id, project.androidPackage)
        d.buildStatus = d.hasBuild ? 'untracked' : 'absent'
        if (d.hasBuild) d.installedVersion = await androidInstalledVersion(d.id, project.androidPackage)
      }
    }),
  )
  return all
}
