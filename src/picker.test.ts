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
  ...over,
})

describe('deviceHint', () => {
  it('shows build + boot state', () => {
    expect(deviceHint(dev({ hasBuild: true, state: 'booted' }), undefined)).toBe('✅ build installed · 🟢 booted')
    expect(deviceHint(dev({}), undefined)).toBe('⚙️ will build')
  })

  it('flags devices busy with another project', () => {
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
    expect(deviceHint(dev({ hasBuild: true }), busy)).toBe('✅ build installed · 🔴 busy: shoootin :8082')
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
