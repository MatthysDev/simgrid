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

/** Booted emulators/devices via adb + offline AVDs via `emulator -list-avds`. */
export async function discoverAndroid(): Promise<Device[]> {
  const devices: Device[] = []
  const runningAvds = new Set<string>()

  try {
    const { stdout } = await execa('adb', ['devices'])
    for (const { serial, type } of parseAdbDevices(stdout)) {
      let name = serial
      if (type === 'emulator') {
        try {
          const { stdout: avd } = await execa('adb', ['-s', serial, 'emu', 'avd', 'name'])
          name = avd.split('\n')[0].trim() || serial
          runningAvds.add(name)
        } catch {
          /* keep serial as name */
        }
      }
      devices.push({
        id: serial,
        platform: type === 'emulator' ? 'android-emu' : 'android-device',
        name,
        model: type === 'emulator' ? 'Android Emulator' : 'Android Device',
        state: 'booted',
        hasBuild: false,
      })
    }
  } catch {
    /* no adb on this machine */
  }

  try {
    const { stdout } = await execa('emulator', ['-list-avds'])
    for (const avd of parseAvdList(stdout)) {
      if (!runningAvds.has(avd)) {
        devices.push({ id: `avd:${avd}`, platform: 'android-emu', name: avd, model: 'Android Emulator', state: 'shutdown', hasBuild: false })
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
