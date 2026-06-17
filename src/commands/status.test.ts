import { describe, expect, it } from 'vitest'
import type { Session } from '../registry.js'
import { formatStatus, formatUptime } from './status.js'

const session = (over: Partial<Session> = {}): Session => ({
  projectPath: '/p/a',
  projectName: 'Storefront',
  platform: 'ios-sim',
  deviceId: 'A',
  deviceName: 'iPhone 15',
  metroPort: 8081,
  pid: 11,
  startedAt: '2026-06-17T00:00:00.000Z',
  ...over,
})

describe('formatUptime', () => {
  it('formats seconds, minutes and hours', () => {
    expect(formatUptime(5_000)).toBe('5s')
    expect(formatUptime(4 * 60_000)).toBe('4m')
    expect(formatUptime(62 * 60_000)).toBe('1h2m')
    expect(formatUptime(-1000)).toBe('0s')
  })
})

describe('formatStatus', () => {
  it('renders one row per session with project, device, port and uptime', () => {
    const now = Date.parse('2026-06-17T00:04:00.000Z')
    const out = formatStatus(
      [
        session({ projectName: 'Storefront', deviceName: 'iPhone 15', metroPort: 8081 }),
        session({ projectName: 'Dashboard', deviceName: 'Pixel 7', platform: 'android-emu', metroPort: 8082, startedAt: '2026-06-17T00:03:00.000Z' }),
      ],
      now,
    )
    expect(out).toContain('Storefront')
    expect(out).toContain('iPhone 15')
    expect(out).toContain(':8081')
    expect(out).toContain('4m')
    expect(out).toContain('Dashboard')
    expect(out).toContain('Pixel 7')
    expect(out).toContain('1m')
  })

  it('says so when nothing is running', () => {
    expect(formatStatus([])).toBe('No simgrid sessions running.')
  })
})
