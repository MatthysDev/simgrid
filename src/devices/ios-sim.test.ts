import { describe, expect, it } from 'vitest'
import { findCloneSpec, parseSimctlDevices } from './ios-sim.js'

const SIMCTL_JSON = {
  devices: {
    'com.apple.CoreSimulator.SimRuntime.iOS-17-5': [
      {
        udid: 'AAA',
        name: 'iPhone 15',
        state: 'Booted',
        isAvailable: true,
        deviceTypeIdentifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-15',
      },
      {
        udid: 'BBB',
        name: 'iPhone SE (3rd generation)',
        state: 'Shutdown',
        isAvailable: true,
        deviceTypeIdentifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-SE-3rd-generation',
      },
      {
        udid: 'CCC',
        name: 'Broken',
        state: 'Shutdown',
        isAvailable: false,
        deviceTypeIdentifier: 'x',
      },
    ],
  },
}

describe('parseSimctlDevices', () => {
  it('normalizes available simulators and maps Booted state', () => {
    const devices = parseSimctlDevices(SIMCTL_JSON)
    expect(devices).toHaveLength(2)
    expect(devices[0]).toMatchObject({ id: 'AAA', platform: 'ios-sim', name: 'iPhone 15', state: 'booted', model: 'iOS 17 5' })
    expect(devices[1].state).toBe('shutdown')
  })

  it('excludes unavailable runtimes/devices', () => {
    expect(parseSimctlDevices(SIMCTL_JSON).some((d) => d.id === 'CCC')).toBe(false)
  })
})

describe('findCloneSpec', () => {
  it('returns deviceType + runtime for a udid', () => {
    expect(findCloneSpec(SIMCTL_JSON, 'AAA')).toEqual({
      deviceType: 'com.apple.CoreSimulator.SimDeviceType.iPhone-15',
      runtime: 'com.apple.CoreSimulator.SimRuntime.iOS-17-5',
    })
  })

  it('returns undefined for an unknown udid', () => {
    expect(findCloneSpec(SIMCTL_JSON, 'ZZZ')).toBeUndefined()
  })
})
