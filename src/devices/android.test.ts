import { describe, expect, it } from 'vitest'
import { parseAdbDevices, parseAvdList, parseDumpsysVersion, parsePmPackages } from './android.js'

describe('parseAdbDevices', () => {
  it('parses emulators and physical devices, skipping offline/unauthorized', () => {
    const out = [
      'List of devices attached',
      'emulator-5554\tdevice',
      'R58M123ABC\tdevice',
      'emulator-5556\toffline',
      'XYZ\tunauthorized',
      '',
    ].join('\n')
    expect(parseAdbDevices(out)).toEqual([
      { serial: 'emulator-5554', type: 'emulator' },
      { serial: 'R58M123ABC', type: 'device' },
    ])
  })
})

describe('parseAvdList', () => {
  it('keeps AVD names, drops INFO noise and blank lines', () => {
    const out = 'INFO    | Storing crashdata in: /tmp/x\nPixel_7_API_34\nPixel_Tablet\n\n'
    expect(parseAvdList(out)).toEqual(['Pixel_7_API_34', 'Pixel_Tablet'])
  })
})

describe('parsePmPackages', () => {
  it('matches the exact package only', () => {
    const out = 'package:com.matthys.yolgo.dev\npackage:com.matthys.yolgo\n'
    expect(parsePmPackages(out, 'com.matthys.yolgo')).toBe(true)
    expect(parsePmPackages(out, 'com.matthys.yol')).toBe(false)
  })
})

describe('parseDumpsysVersion', () => {
  it('extracts versionName from dumpsys package output', () => {
    const out = ['Packages:', '  Package [com.matthys.yolgo] (abc):', '    versionCode=42 minSdk=24', '    versionName=1.1.0'].join('\n')
    expect(parseDumpsysVersion(out)).toBe('1.1.0')
  })

  it('is undefined when no versionName is present', () => {
    expect(parseDumpsysVersion('Packages:\n  nothing here')).toBeUndefined()
  })
})
