import { readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execa } from 'execa'
import type { Device } from './types.js'

export function parseDevicectl(json: any): Device[] {
  const devices: any[] = json?.result?.devices ?? []
  return devices
    .filter((d) => d?.connectionProperties?.tunnelState !== 'unavailable')
    .map((d) => ({
      id: d.identifier,
      platform: 'ios-device' as const,
      name: d.deviceProperties?.name ?? d.identifier,
      model: d.hardwareProperties?.marketingName ?? 'iPhone/iPad',
      state: 'booted' as const, // physical devices are always "on"
      hasBuild: false, // not cheaply detectable — expo run:ios handles install
    }))
}

export async function discoverIosDevices(): Promise<Device[]> {
  const out = join(tmpdir(), `simgrid-devicectl-${process.pid}.json`)
  try {
    await execa('xcrun', ['devicectl', 'list', 'devices', '--json-output', out], { timeout: 10_000 })
    const devices = parseDevicectl(JSON.parse(await readFile(out, 'utf8')))
    return devices
  } catch {
    return [] // devicectl missing (old Xcode) or no devices
  } finally {
    await rm(out, { force: true })
  }
}
