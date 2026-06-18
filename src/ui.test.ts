import { describe, expect, it } from 'vitest'
import { banner, launchSummary, platformEmoji, VERSION } from './ui.js'

const stripAnsi = (s: string) => s.replace(/\[[0-9;]*m/g, '')

describe('platformEmoji', () => {
  it('maps each platform to an icon', () => {
    expect(platformEmoji('ios-sim')).toBe('🍏')
    expect(platformEmoji('ios-device')).toBe('📱')
    expect(platformEmoji('android-emu')).toBe('🤖')
    expect(platformEmoji('android-device')).toBe('🤖')
  })
})

describe('banner', () => {
  it('shows the brand, version and tagline', () => {
    const out = banner()
    expect(out).toContain('simgrid')
    expect(out).toContain(VERSION)
    expect(out.toLowerCase()).toContain('one grid')
  })

  it('renders a multi-line ASCII art that stays within 60 columns', () => {
    const lines = stripAnsi(banner()).split('\n')
    expect(lines.length).toBeGreaterThanOrEqual(4)
    for (const line of lines) {
      expect([...line].length).toBeLessThanOrEqual(60)
    }
  })
})

describe('launchSummary', () => {
  it('lists every device with its Metro port under the project name', () => {
    const out = launchSummary('Storefront', [
      { platform: 'ios-sim', deviceName: 'iPhone 15', metroPort: 8081 },
      { platform: 'android-emu', deviceName: 'Pixel 7', metroPort: 8081 },
    ])
    expect(out).toContain('Storefront')
    expect(out).toContain('iPhone 15')
    expect(out).toContain('Pixel 7')
    expect(out).toContain(':8081')
    expect(out).toContain('Ctrl+C')
  })
})
