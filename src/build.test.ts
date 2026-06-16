import { describe, expect, it } from 'vitest'
import {
  applyBuildTemplate,
  buildKey,
  candidateBuildScripts,
  defaultBuildTemplate,
  forgetBuild,
  rememberedBuild,
  rememberBuild,
  scriptBuildTemplate,
} from './build.js'

describe('candidateBuildScripts', () => {
  const pkg = {
    scripts: {
      start: 'simgrid',
      'ios:dev': 'APP_ENV=dev expo run:ios',
      'android:dev': 'APP_ENV=dev expo run:android',
      lint: 'eslint .',
    },
  }

  it('keeps only scripts that run the matching platform', () => {
    expect(candidateBuildScripts(pkg, 'ios-sim')).toEqual([{ name: 'ios:dev', command: 'APP_ENV=dev expo run:ios' }])
    expect(candidateBuildScripts(pkg, 'android-emu')).toEqual([
      { name: 'android:dev', command: 'APP_ENV=dev expo run:android' },
    ])
  })

  it('treats ios-device like ios and android-device like android', () => {
    expect(candidateBuildScripts(pkg, 'ios-device').map((s) => s.name)).toEqual(['ios:dev'])
    expect(candidateBuildScripts(pkg, 'android-device').map((s) => s.name)).toEqual(['android:dev'])
  })

  it('returns nothing when scripts are missing or unreadable', () => {
    expect(candidateBuildScripts({}, 'ios-sim')).toEqual([])
    expect(candidateBuildScripts(undefined, 'ios-sim')).toEqual([])
  })
})

describe('build templates', () => {
  it('builds a default template with device/port placeholders for the project runner', () => {
    expect(defaultBuildTemplate('npm', 'ios-sim')).toBe('npx expo run:ios --device {device} --port {port}')
    expect(defaultBuildTemplate('npm', 'android-emu')).toBe('npx expo run:android --device {device} --port {port}')
    expect(defaultBuildTemplate('bun', 'ios-sim')).toBe('bunx expo run:ios --device {device} --port {port}')
    expect(defaultBuildTemplate('pnpm', 'android-emu')).toBe('pnpm exec expo run:android --device {device} --port {port}')
  })

  it('builds a script template that passes flags through with -- per runner', () => {
    expect(scriptBuildTemplate('npm', 'ios:dev')).toBe('npm run ios:dev -- --device {device} --port {port}')
    expect(scriptBuildTemplate('yarn', 'ios:dev')).toBe('yarn ios:dev -- --device {device} --port {port}')
    expect(scriptBuildTemplate('bun', 'android:dev')).toBe('bun run android:dev -- --device {device} --port {port}')
  })
})

describe('applyBuildTemplate', () => {
  it('substitutes device and port placeholders', () => {
    expect(applyBuildTemplate('npx expo run:ios --device {device} --port {port}', { device: 'ABC-123', port: 8082 })).toBe(
      'npx expo run:ios --device ABC-123 --port 8082',
    )
  })

  it('replaces every occurrence and leaves placeholder-free commands untouched', () => {
    expect(applyBuildTemplate('echo {device} {device}', { device: 'X', port: 8081 })).toBe('echo X X')
    expect(applyBuildTemplate('make build', { device: 'X', port: 8081 })).toBe('make build')
  })
})

describe('buildKey', () => {
  it('maps every platform to its ios/android storage slot', () => {
    expect(buildKey('ios-sim')).toBe('ios')
    expect(buildKey('ios-device')).toBe('ios')
    expect(buildKey('android-emu')).toBe('android')
    expect(buildKey('android-device')).toBe('android')
  })
})

describe('remembered build commands', () => {
  it('reads nothing when no command is stored', () => {
    expect(rememberedBuild(undefined, 'ios-sim')).toBeUndefined()
    expect(rememberedBuild({ lastDeviceIds: [] }, 'ios-sim')).toBeUndefined()
  })

  it('stores and reads a command per platform slot', () => {
    const pref = rememberBuild({ lastDeviceIds: ['a'] }, 'ios-sim', 'npx expo run:ios')
    expect(pref.buildCommands).toEqual({ ios: 'npx expo run:ios' })
    expect(pref.lastDeviceIds).toEqual(['a'])
    expect(rememberedBuild(pref, 'ios-device')).toBe('npx expo run:ios')
    expect(rememberedBuild(pref, 'android-emu')).toBeUndefined()
  })

  it('forgets a platform slot without touching the other', () => {
    let pref = rememberBuild({ lastDeviceIds: [] }, 'ios-sim', 'build-ios')
    pref = rememberBuild(pref, 'android-emu', 'build-android')
    pref = forgetBuild(pref, 'ios-sim')
    expect(rememberedBuild(pref, 'ios-sim')).toBeUndefined()
    expect(rememberedBuild(pref, 'android-emu')).toBe('build-android')
  })
})
