import { spawn, type ChildProcess } from 'node:child_process'
import { execa } from 'execa'
import pc from 'picocolors'
import { findEmulatorSerial } from './devices/android.js'
import { bootIosSim } from './devices/ios-sim.js'
import type { Device } from './devices/types.js'
import type { ProjectInfo } from './project.js'

export function devClientUrl(scheme: string, port: number): string {
  return `${scheme}://expo-development-client/?url=${encodeURIComponent(`http://localhost:${port}`)}`
}

/** Boot the device if needed. Returns the live device id (AVD boots get an adb serial). */
export async function ensureBooted(device: Device): Promise<string> {
  if (device.state === 'booted') return device.id

  if (device.platform === 'ios-sim') {
    console.log(pc.dim(`  booting ${device.name}…`))
    await bootIosSim(device.id)
    return device.id
  }

  if (device.platform === 'android-emu' && device.id.startsWith('avd:')) {
    const avd = device.id.slice('avd:'.length)
    console.log(pc.dim(`  booting AVD ${avd}… (this can take a minute)`))
    const child = spawn('emulator', ['-avd', avd], { detached: true, stdio: 'ignore' })
    child.unref()
    return await findEmulatorSerial(avd)
  }

  return device.id
}

/** One Metro per project; every selected device connects to it. */
export function startMetro(project: ProjectInfo, port: number): ChildProcess {
  console.log(pc.cyan(`\n▶ Metro for ${pc.bold(project.name)} on port ${port}\n`))
  return spawn('npx', ['expo', 'start', '--port', String(port)], {
    cwd: project.path,
    stdio: 'inherit',
    env: process.env,
  })
}

/**
 * Get the app running on the device:
 * - build installed → open the dev client straight onto our Metro (instant)
 * - no build → `expo run:<platform>` compiles, installs and launches against our Metro
 */
export async function openApp(device: Device, liveId: string, project: ProjectInfo, port: number): Promise<void> {
  if (!device.hasBuild) {
    console.log(pc.yellow(`  ${device.name}: no dev build — running expo run (first build takes a while)…`))
    const args =
      device.platform === 'ios-sim' || device.platform === 'ios-device'
        ? ['expo', 'run:ios', '--port', String(port), '--no-bundler', '--device', liveId]
        : ['expo', 'run:android', '--port', String(port), '--no-bundler', '--device', liveId]
    await execa('npx', args, { cwd: project.path, stdio: 'inherit' })
    return
  }

  if (!project.scheme) {
    console.log(pc.yellow(`  ${device.name}: no "scheme" in app config — open the dev client manually and pick localhost:${port}`))
    return
  }

  const url = devClientUrl(project.scheme, port)
  if (device.platform === 'ios-sim') {
    await execa('xcrun', ['simctl', 'openurl', liveId, url])
  } else if (device.platform === 'android-emu' || device.platform === 'android-device') {
    await execa('adb', ['-s', liveId, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url])
  } else if (project.iosBundleId) {
    // ios-device: launch the app; the dev client reconnects or lists local servers
    await execa('xcrun', ['devicectl', 'device', 'process', 'launch', '--device', liveId, project.iosBundleId])
  }
  console.log(pc.green(`  ${device.name}: dev client → localhost:${port} ✓`))
}
