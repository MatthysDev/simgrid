import { execa } from 'execa'
import type { Device } from './types.js'

interface SimctlDevice {
  udid: string
  name: string
  state: string
  isAvailable: boolean
  deviceTypeIdentifier: string
}

export interface SimctlList {
  devices: Record<string, SimctlDevice[]>
}

export function parseSimctlDevices(json: SimctlList): Device[] {
  return Object.entries(json.devices).flatMap(([runtime, devices]) =>
    devices
      .filter((d) => d.isAvailable)
      .map((d) => ({
        id: d.udid,
        platform: 'ios-sim' as const,
        name: d.name,
        model: runtime.split('.').pop()?.replace(/-/g, ' ') ?? runtime,
        state: d.state === 'Booted' ? ('booted' as const) : ('shutdown' as const),
        hasBuild: false,
      })),
  )
}

export function findCloneSpec(json: SimctlList, udid: string): { deviceType: string; runtime: string } | undefined {
  for (const [runtime, devices] of Object.entries(json.devices)) {
    const d = devices.find((x) => x.udid === udid && x.isAvailable)
    if (d) return { deviceType: d.deviceTypeIdentifier, runtime }
  }
  return undefined
}

async function simctlList(): Promise<SimctlList> {
  const { stdout } = await execa('xcrun', ['simctl', 'list', 'devices', '--json'])
  return JSON.parse(stdout)
}

export async function discoverIosSims(): Promise<Device[]> {
  try {
    return parseSimctlDevices(await simctlList())
  } catch {
    return [] // no Xcode on this machine
  }
}

/** Works for shutdown sims too: exit 0 ⇔ the app container exists. */
export async function hasIosBuild(udid: string, bundleId: string): Promise<boolean> {
  try {
    await execa('xcrun', ['simctl', 'get_app_container', udid, bundleId, 'app'])
    return true
  } catch {
    return false
  }
}

export async function bootIosSim(udid: string): Promise<void> {
  try {
    await execa('xcrun', ['simctl', 'boot', udid])
  } catch (e: unknown) {
    const msg = String((e as { stderr?: string }).stderr ?? e)
    if (!/already booted|current state: Booted/i.test(msg)) throw e
  }
  await execa('open', ['-a', 'Simulator']) // make the window(s) visible
}

/** Create a second instance of the same model+runtime (e.g. a second "iPhone 15"). */
export async function cloneIosSim(udid: string, newName: string): Promise<string> {
  const spec = findCloneSpec(await simctlList(), udid)
  if (!spec) throw new Error(`Cannot find simulator ${udid} to clone`)
  const { stdout } = await execa('xcrun', ['simctl', 'create', newName, spec.deviceType, spec.runtime])
  return stdout.trim()
}
