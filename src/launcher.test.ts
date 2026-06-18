import { describe, expect, it } from 'vitest'
import type { Device } from './devices/types.js'
import { devClientUrl, openCommandFor } from './launcher.js'
import type { ProjectInfo } from './project.js'

describe('devClientUrl', () => {
  it('builds the dev-client deep link with an encoded server url', () => {
    expect(devClientUrl('yolgo', 8082)).toBe('yolgo://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8082')
  })
})

describe('openCommandFor', () => {
  const project = (over: Partial<ProjectInfo> = {}): ProjectInfo => ({
    path: '/p/yolgo',
    name: 'Yolgo',
    scheme: 'yolgo',
    iosBundleId: 'com.matthys.yolgo',
    androidPackage: 'com.matthys.yolgo',
    hasDevClient: true,
    scripts: {},
    runner: 'npm',
    version: '1.0.0',
    ...over,
  })
  const device = (over: Partial<Device> = {}): Device => ({
    id: 'UDID-1',
    platform: 'ios-sim',
    name: 'iPhone 15',
    model: '',
    state: 'booted',
    hasBuild: true,
    buildStatus: 'up-to-date',
    ...over,
  })

  it('opens the dev-client url on an iOS simulator with simctl', () => {
    expect(openCommandFor(device({ platform: 'ios-sim' }), 'UDID-1', project(), 8081)).toEqual({
      kind: 'run',
      command: 'xcrun',
      args: ['simctl', 'openurl', 'UDID-1', 'yolgo://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081'],
    })
  })

  it('opens the dev-client url on Android with an adb intent', () => {
    const r = openCommandFor(device({ platform: 'android-emu' }), 'emulator-5554', project(), 8082)
    expect(r).toEqual({
      kind: 'run',
      command: 'adb',
      args: ['-s', 'emulator-5554', 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'yolgo://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8082'],
    })
  })

  it('launches the app by bundle id on a physical iOS device', () => {
    expect(openCommandFor(device({ platform: 'ios-device' }), 'DEV-1', project(), 8081)).toEqual({
      kind: 'run',
      command: 'xcrun',
      args: ['devicectl', 'device', 'process', 'launch', '--device', 'DEV-1', 'com.matthys.yolgo'],
    })
  })

  it('falls back to manual when the project has no scheme', () => {
    const r = openCommandFor(device(), 'UDID-1', project({ scheme: undefined }), 8081)
    expect(r.kind).toBe('manual')
  })

  it('falls back to manual for a physical iOS device with no bundle id', () => {
    const r = openCommandFor(device({ platform: 'ios-device' }), 'DEV-1', project({ iosBundleId: undefined }), 8081)
    expect(r.kind).toBe('manual')
  })
})
