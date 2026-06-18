import { execa } from 'execa'
import type { Device } from './types.js'

export function parseAdbDevices(stdout: string): { serial: string; type: 'emulator' | 'device' }[] {
  return stdout
    .split('\n')
    .slice(1) // header line
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 2 && parts[1] === 'device')
    .map(([serial]) => ({ serial, type: serial.startsWith('emulator-') ? ('emulator' as const) : ('device' as const) }))
}

export function parseAvdList(stdout: string): string[] {
  return stdout
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('INFO') && !l.includes('|'))
}

export function parsePmPackages(stdout: string, pkg: string): boolean {
  return stdout.split('\n').some((l) => l.trim() === `package:${pkg}`)
}

export function parseDumpsysVersion(stdout: string): string | undefined {
  return stdout.match(/versionName=(\S+)/)?.[1]
}

/** Resolve a running emulator's AVD name; console first, getprop fallback. */
async function emulatorAvdName(serial: string): Promise<string | undefined> {
  try {
    const { stdout } = await execa('adb', ['-s', serial, 'emu', 'avd', 'name'])
    const name = stdout.split('\n')[0].trim()
    if (name) return name
  } catch {
    /* console not ready — try getprop */
  }
  try {
    const { stdout } = await execa('adb', ['-s', serial, 'shell', 'getprop', 'ro.boot.qemu.avd_name'])
    const name = stdout.trim()
    if (name) return name
  } catch {
    /* still booting */
  }
  return undefined
}

/** Booted emulators/devices via adb + offline AVDs via `emulator -list-avds`. */
export async function discoverAndroid(): Promise<Device[]> {
  const devices: Device[] = []
  const runningAvds = new Set<string>()
  let unresolvedEmulators = 0

  try {
    const { stdout } = await execa('adb', ['devices'])
    for (const { serial, type } of parseAdbDevices(stdout)) {
      let name = serial
      if (type === 'emulator') {
        const avdName = await emulatorAvdName(serial)
        if (avdName) {
          name = avdName
          runningAvds.add(avdName)
        } else {
          unresolvedEmulators++
        }
      }
      devices.push({
        id: serial,
        platform: type === 'emulator' ? 'android-emu' : 'android-device',
        name,
        model: type === 'emulator' ? 'Android Emulator' : 'Android Device',
        state: 'booted',
        hasBuild: false,
        buildStatus: 'unknown',
      })
    }
  } catch {
    /* no adb on this machine */
  }

  try {
    const { stdout } = await execa('emulator', ['-list-avds'])
    // If we couldn't identify every running emulator, we can't safely tell
    // which AVDs are actually offline — skipping avoids a double boot.
    if (unresolvedEmulators === 0) {
      for (const avd of parseAvdList(stdout)) {
        if (!runningAvds.has(avd)) {
          devices.push({ id: `avd:${avd}`, platform: 'android-emu', name: avd, model: 'Android Emulator', state: 'shutdown', hasBuild: false, buildStatus: 'unknown' })
        }
      }
    }
  } catch {
    /* no emulator binary in PATH */
  }

  return devices
}

export async function hasAndroidBuild(serial: string, pkg: string): Promise<boolean> {
  try {
    const { stdout } = await execa('adb', ['-s', serial, 'shell', 'pm', 'list', 'packages', pkg])
    return parsePmPackages(stdout, pkg)
  } catch {
    return false
  }
}

/** Marketing version of the installed app via `dumpsys package` (best-effort). */
export async function androidInstalledVersion(serial: string, pkg: string): Promise<string | undefined> {
  try {
    const { stdout } = await execa('adb', ['-s', serial, 'shell', 'dumpsys', 'package', pkg])
    return parseDumpsysVersion(stdout)
  } catch {
    return undefined
  }
}

/** Find the adb serial of a freshly booted AVD by matching its name. */
export async function findEmulatorSerial(avd: string, retries = 60): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const { stdout } = await execa('adb', ['devices'])
      for (const { serial, type } of parseAdbDevices(stdout)) {
        if (type !== 'emulator') continue
        try {
          const { stdout: name } = await execa('adb', ['-s', serial, 'emu', 'avd', 'name'])
          if (name.split('\n')[0].trim() === avd) return serial
        } catch {
          /* emulator still starting */
        }
      }
    } catch {
      /* adb flaking during boot */
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error(`Emulator for AVD "${avd}" did not come online`)
}
