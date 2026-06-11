import { describe, expect, it } from 'vitest'
import { parseDevicectl } from './ios-device.js'

describe('parseDevicectl', () => {
  it('maps connected devices, skipping unavailable tunnels', () => {
    const json = {
      result: {
        devices: [
          {
            identifier: 'DEV-1',
            deviceProperties: { name: 'iPhone de Matthys' },
            hardwareProperties: { marketingName: 'iPhone 15 Pro' },
            connectionProperties: { tunnelState: 'connected' },
          },
          {
            identifier: 'DEV-2',
            deviceProperties: { name: 'Old iPad' },
            hardwareProperties: { marketingName: 'iPad Air' },
            connectionProperties: { tunnelState: 'unavailable' },
          },
        ],
      },
    }
    const devices = parseDevicectl(json)
    expect(devices).toHaveLength(1)
    expect(devices[0]).toMatchObject({ id: 'DEV-1', platform: 'ios-device', name: 'iPhone de Matthys', model: 'iPhone 15 Pro', state: 'booted' })
  })
})
