import { spawn, type ChildProcess } from 'node:child_process'
import { execa } from 'execa'
import pc from 'picocolors'
import { applyBuildTemplate } from './build.js'
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
  const args = ['expo', 'start', '--port', String(port)]
  if (project.hasDevClient) args.push('--dev-client')
  return spawn('npx', args, {
    cwd: project.path,
    stdio: 'inherit',
    env: process.env,
  })
}

/**
 * Compile, install and launch the app against our Metro using the resolved build
 * command template. Throws if the build exits non-zero (caller forgets the command).
 */
export async function runBuild(project: ProjectInfo, liveId: string, port: number, template: string): Promise<void> {
  const command = applyBuildTemplate(template, { device: liveId, port })
  console.log(pc.yellow(`  building (first build takes a while): ${command}`))
  await execa(command, { cwd: project.path, stdio: 'inherit', shell: true })
}

export type OpenAction =
  | { kind: 'run'; command: string; args: string[] }
  | { kind: 'manual'; reason: string }

/**
 * Decide how to open the dev client on a device, or why it can't be done
 * automatically. Pure: no process is spawned here (see {@link openApp}).
 */
export function openCommandFor(device: Device, liveId: string, project: ProjectInfo, port: number): OpenAction {
  if (!project.scheme) {
    return { kind: 'manual', reason: `no "scheme" in app config — open the dev client manually and pick localhost:${port}` }
  }
  const url = devClientUrl(project.scheme, port)
  if (device.platform === 'ios-sim') {
    return { kind: 'run', command: 'xcrun', args: ['simctl', 'openurl', liveId, url] }
  }
  if (device.platform === 'android-emu' || device.platform === 'android-device') {
    return { kind: 'run', command: 'adb', args: ['-s', liveId, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url] }
  }
  if (device.platform === 'ios-device' && project.iosBundleId) {
    // launch the app; the dev client reconnects or lists local servers
    return { kind: 'run', command: 'xcrun', args: ['devicectl', 'device', 'process', 'launch', '--device', liveId, project.iosBundleId] }
  }
  return { kind: 'manual', reason: `cannot open the dev client automatically — open it manually and pick localhost:${port}` }
}

/**
 * Open the already-installed dev build straight onto our Metro (instant).
 * Devices without a build go through {@link runBuild} instead.
 */
export async function openApp(device: Device, liveId: string, project: ProjectInfo, port: number): Promise<void> {
  const action = openCommandFor(device, liveId, project, port)
  if (action.kind === 'manual') {
    console.log(pc.yellow(`  ${device.name}: ${action.reason}`))
    return
  }
  await execa(action.command, action.args)
  console.log(pc.green(`  ${device.name}: dev client → localhost:${port} ✓`))
}
