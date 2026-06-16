import { describe, expect, it } from 'vitest'
import { deleteProfile, formatProfiles, getProfile, saveProfile } from './profile.js'

describe('profiles', () => {
  it('reads nothing when no profile is stored', () => {
    expect(getProfile(undefined, 'demo')).toBeUndefined()
    expect(getProfile({ lastDeviceIds: [] }, 'demo')).toBeUndefined()
  })

  it('saves and reads device ids under a named profile', () => {
    const pref = saveProfile({ lastDeviceIds: ['x'] }, 'demo', ['a', 'b'])
    expect(pref.profiles).toEqual({ demo: ['a', 'b'] })
    expect(pref.lastDeviceIds).toEqual(['x'])
    expect(getProfile(pref, 'demo')).toEqual(['a', 'b'])
    expect(getProfile(pref, 'other')).toBeUndefined()
  })

  it('saving a profile leaves other profiles untouched', () => {
    let pref = saveProfile({ lastDeviceIds: [] }, 'demo', ['a'])
    pref = saveProfile(pref, 'qa', ['b', 'c'])
    expect(getProfile(pref, 'demo')).toEqual(['a'])
    expect(getProfile(pref, 'qa')).toEqual(['b', 'c'])
  })

  it('deletes one profile without touching the others', () => {
    let pref = saveProfile({ lastDeviceIds: [] }, 'demo', ['a'])
    pref = saveProfile(pref, 'qa', ['b'])
    pref = deleteProfile(pref, 'demo')
    expect(getProfile(pref, 'demo')).toBeUndefined()
    expect(getProfile(pref, 'qa')).toEqual(['b'])
  })

  it('formats one line per profile, or a note when empty', () => {
    expect(formatProfiles(undefined)).toBe('No profiles saved for this project.')
    expect(formatProfiles({ lastDeviceIds: [] })).toBe('No profiles saved for this project.')
    const pref = saveProfile({ lastDeviceIds: [] }, 'demo', ['a', 'b'])
    expect(formatProfiles(pref)).toBe('● demo → 2 device(s)')
  })
})
