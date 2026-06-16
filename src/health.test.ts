import { describe, expect, it } from 'vitest'
import { type ToolCheck, formatHealth, missingTools } from './health.js'

const checks: ToolCheck[] = [
  { name: 'xcrun', found: true, purpose: 'iOS simulators & devices', install: 'Install Xcode from the App Store' },
  { name: 'adb', found: false, purpose: 'Android devices & emulators', install: 'Install Android SDK platform-tools' },
]

describe('missingTools', () => {
  it('lists only the tools that were not found', () => {
    expect(missingTools(checks).map((t) => t.name)).toEqual(['adb'])
  })

  it('is empty when everything is present', () => {
    expect(missingTools([{ name: 'xcrun', found: true, purpose: '' }])).toEqual([])
  })
})

describe('formatHealth', () => {
  it('marks found tools with a check and missing ones with a cross plus install hint', () => {
    const out = formatHealth(checks)
    expect(out).toContain('✓ xcrun')
    expect(out).toContain('iOS simulators & devices')
    expect(out).toContain('✗ adb')
    expect(out).toContain('Install Android SDK platform-tools')
  })

  it('reports all-clear when nothing is missing', () => {
    const out = formatHealth([{ name: 'xcrun', found: true, purpose: 'iOS' }])
    expect(out).toContain('✓ xcrun')
    expect(out).toContain('All good')
  })
})
