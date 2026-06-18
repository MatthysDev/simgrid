import { describe, expect, it } from 'vitest'
import { packageHasDevClient, packageScripts, parseAppConfig } from './project.js'

describe('parseAppConfig', () => {
  it('reads identity from an app.json shape (expo wrapper)', () => {
    const info = parseAppConfig(
      {
        expo: {
          name: 'Yolgo',
          scheme: 'yolgo',
          ios: { bundleIdentifier: 'com.matthys.yolgo' },
          android: { package: 'com.matthys.yolgo' },
        },
      },
      '/p/yolgo',
    )
    expect(info).toEqual({
      path: '/p/yolgo',
      name: 'Yolgo',
      scheme: 'yolgo',
      iosBundleId: 'com.matthys.yolgo',
      androidPackage: 'com.matthys.yolgo',
      hasDevClient: false,
      scripts: {},
      runner: 'npm',
    })
  })

  it('accepts a bare config (no expo wrapper) and scheme arrays', () => {
    const info = parseAppConfig({ name: 'Track', scheme: ['track', 'trk'] }, '/p/track')
    expect(info.scheme).toBe('track')
    expect(info.iosBundleId).toBeUndefined()
  })

  it('falls back to the directory name when name is missing', () => {
    const info = parseAppConfig({}, '/projects/shoootin')
    expect(info.name).toBe('shoootin')
  })

  it('reads the marketing version', () => {
    expect(parseAppConfig({ expo: { name: 'Ekklo', version: '1.2.0' } }, '/p/ekklo').version).toBe('1.2.0')
    expect(parseAppConfig({ name: 'Track' }, '/p/track').version).toBeUndefined()
  })
})

describe('packageHasDevClient', () => {
  it('finds expo-dev-client in dependencies or devDependencies', () => {
    expect(packageHasDevClient({ dependencies: { 'expo-dev-client': '~6.0.0' } })).toBe(true)
    expect(packageHasDevClient({ devDependencies: { 'expo-dev-client': '~6.0.0' } })).toBe(true)
  })

  it('is false when absent or package.json is unreadable', () => {
    expect(packageHasDevClient({ dependencies: { expo: '~55.0.0' } })).toBe(false)
    expect(packageHasDevClient(undefined)).toBe(false)
  })
})

describe('packageScripts', () => {
  it('keeps string-valued scripts and drops the rest', () => {
    expect(packageScripts({ scripts: { start: 'simgrid', bad: 123 } })).toEqual({ start: 'simgrid' })
    expect(packageScripts({})).toEqual({})
    expect(packageScripts(undefined)).toEqual({})
  })
})
