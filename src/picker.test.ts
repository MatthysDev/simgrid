import { describe, expect, it } from 'vitest'
import type { Device } from './devices/types.js'
import { deviceHint, sortDevices } from './picker.js'

const dev = (over: Partial<Device>): Device => ({
  id: 'X',
  platform: 'ios-sim',
  name: 'iPhone 15',
  model: 'iOS 17 5',
  state: 'shutdown',
  hasBuild: false,
  buildStatus: 'unknown',
  ...over,
})

describe('deviceHint', () => {
  it('renders each build status', () => {
    expect(deviceHint(dev({ buildStatus: 'absent' }), undefined)).toBe('⚙️ will build')
    expect(deviceHint(dev({ buildStatus: 'up-to-date', hasBuild: true }), undefined)).toBe('✅ up to date')
    expect(deviceHint(dev({ buildStatus: 'rebuild', hasBuild: true }), undefined)).toBe('♻️ rebuild required')
    expect(deviceHint(dev({ buildStatus: 'untracked', hasBuild: true }), undefined)).toBe('✅ installed (native untracked)')
    expect(deviceHint(dev({ buildStatus: 'unknown' }), undefined)).toBe('· build status unknown')
  })

  it('appends an installed→target version diff when they differ', () => {
    expect(deviceHint(dev({ buildStatus: 'rebuild', hasBuild: true, installedVersion: '1.1.0' }), undefined, '1.2.0')).toBe(
      '♻️ rebuild required (v1.1.0 → 1.2.0)',
    )
    // same version → no suffix
    expect(deviceHint(dev({ buildStatus: 'up-to-date', hasBuild: true, installedVersion: '1.2.0' }), undefined, '1.2.0')).toBe('✅ up to date')
  })

  it('shows boot state and busy owner alongside the build status', () => {
    const busy = {
      projectPath: '/p/shoootin',
      projectName: 'shoootin',
      platform: 'ios-sim' as const,
      deviceId: 'X',
      deviceName: 'iPhone 15',
      metroPort: 8082,
      pid: 1,
      startedAt: '',
    }
    expect(deviceHint(dev({ buildStatus: 'up-to-date', hasBuild: true, state: 'booted' }), undefined)).toBe('✅ up to date · 🟢 booted')
    expect(deviceHint(dev({ buildStatus: 'up-to-date', hasBuild: true }), busy)).toBe('✅ up to date · 🔴 busy: shoootin :8082')
  })
})

describe('sortDevices', () => {
  it('puts devices with a build first, then alphabetical', () => {
    const sorted = sortDevices([
      dev({ name: 'B — no build' }),
      dev({ name: 'Z — build', hasBuild: true }),
      dev({ name: 'A — no build' }),
    ])
    expect(sorted.map((d) => d.name)).toEqual(['Z — build', 'A — no build', 'B — no build'])
  })
})
