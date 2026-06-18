import { cancel, groupMultiselect, intro, isCancel } from '@clack/prompts'
import pc from 'picocolors'
import type { Device, Platform } from './devices/types.js'
import type { Session } from './registry.js'

const PLATFORM_LABELS: Record<Platform, string> = {
  'ios-sim': 'iOS Simulators',
  'ios-device': 'iPhone / iPad',
  'android-emu': 'Android Emulators',
  'android-device': 'Android Devices',
}

function buildLabel(device: Device, targetVersion: string | undefined): string {
  const v =
    device.installedVersion && targetVersion && device.installedVersion !== targetVersion
      ? ` (v${device.installedVersion} → ${targetVersion})`
      : ''
  switch (device.buildStatus) {
    case 'absent':
      return '⚙️ will build'
    case 'up-to-date':
      return `✅ up to date${v}`
    case 'rebuild':
      return `♻️ rebuild required${v}`
    case 'untracked':
      return `✅ installed (native untracked)${v}`
    default:
      return '· build status unknown'
  }
}

export function deviceHint(device: Device, busy: Session | undefined, targetVersion?: string): string {
  const parts = [buildLabel(device, targetVersion)]
  if (device.state === 'booted') parts.push('🟢 booted')
  if (busy) parts.push(`🔴 busy: ${busy.projectName} :${busy.metroPort}`)
  return parts.join(' · ')
}

/** Devices with the build installed come first (instant launch), then alphabetical. */
export function sortDevices(devices: Device[]): Device[] {
  return [...devices].sort((a, b) => Number(b.hasBuild) - Number(a.hasBuild) || a.name.localeCompare(b.name))
}

export async function pickDevices(
  devices: Device[],
  otherSessions: Session[],
  lastIds: string[],
  projectName: string,
  targetVersion?: string,
): Promise<Device[]> {
  intro(`${pc.bgCyan(pc.black(' simgrid '))} ${pc.bold(projectName)}`)

  const options: Record<string, { value: string; label: string; hint: string }[]> = {}
  for (const d of sortDevices(devices)) {
    const busy = otherSessions.find((s) => s.deviceId === d.id)
    const group = PLATFORM_LABELS[d.platform]
    ;(options[group] ??= []).push({ value: d.id, label: d.name, hint: deviceHint(d, busy, targetVersion) })
  }

  const picked = await groupMultiselect({
    message: 'Launch on which devices? (space to select, enter to launch)',
    options,
    initialValues: lastIds.filter((id) => devices.some((d) => d.id === id)),
    required: true,
  })

  if (isCancel(picked)) {
    cancel('Cancelled — nothing launched.')
    process.exit(1)
  }
  const ids = picked as string[]
  return devices.filter((d) => ids.includes(d.id))
}
