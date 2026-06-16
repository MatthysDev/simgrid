import { describe, expect, it } from 'vitest'
import type { Session } from './registry.js'
import { logCommandFor, matchSessions } from './logs.js'

const session = (over: Partial<Session> = {}): Session => ({
  projectPath: '/p/yolgo',
  projectName: 'Yolgo',
  platform: 'ios-sim',
  deviceId: 'UDID-1',
  deviceName: 'iPhone 15',
  metroPort: 8081,
  pid: 1,
  startedAt: '',
  ...over,
})

describe('matchSessions', () => {
  const sessions = [
    session({ deviceName: 'iPhone 15', deviceId: 'UDID-1' }),
    session({ deviceName: 'Pixel 7', deviceId: 'emulator-5554', platform: 'android-emu' }),
  ]

  it('returns every session when there is no query', () => {
    expect(matchSessions(sessions)).toHaveLength(2)
  })

  it('matches by device name, case-insensitively', () => {
    expect(matchSessions(sessions, 'pixel').map((s) => s.deviceId)).toEqual(['emulator-5554'])
  })

  it('matches by device id', () => {
    expect(matchSessions(sessions, 'UDID-1').map((s) => s.deviceName)).toEqual(['iPhone 15'])
  })

  it('returns nothing when the query matches no session', () => {
    expect(matchSessions(sessions, 'nope')).toEqual([])
  })
})

describe('logCommandFor', () => {
  it('streams a booted iOS simulator through simctl, filtered to the app', () => {
    expect(logCommandFor({ platform: 'ios-sim', deviceId: 'UDID-1', appName: 'Yolgo' })).toEqual({
      command: 'xcrun',
      args: ['simctl', 'spawn', 'UDID-1', 'log', 'stream', '--level=debug', '--style=compact', '--predicate', 'process == "Yolgo"'],
    })
  })

  it('streams an iOS simulator without a predicate when the app name is unknown', () => {
    expect(logCommandFor({ platform: 'ios-sim', deviceId: 'UDID-1' })).toEqual({
      command: 'xcrun',
      args: ['simctl', 'spawn', 'UDID-1', 'log', 'stream', '--level=debug', '--style=compact'],
    })
  })

  it('tails logcat for Android emulators and devices', () => {
    expect(logCommandFor({ platform: 'android-emu', deviceId: 'emulator-5554' })).toEqual({
      command: 'adb',
      args: ['-s', 'emulator-5554', 'logcat'],
    })
    expect(logCommandFor({ platform: 'android-device', deviceId: 'R58M' })).toEqual({
      command: 'adb',
      args: ['-s', 'R58M', 'logcat'],
    })
  })

  it('refuses physical iOS devices with a clear error', () => {
    expect(() => logCommandFor({ platform: 'ios-device', deviceId: 'X' })).toThrow(/physical iOS/i)
  })
})
