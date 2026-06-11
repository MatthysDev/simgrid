import { describe, expect, it } from 'vitest'
import { parseAppConfig } from './project.js'

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
})
