import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cachedNotice, doctorUpdateLine, isNewer, needsRefresh, parseRegistryVersion, readCache, refreshCache, updateNotice } from './update-check.js'

const stripAnsi = (s: string) => s.replace(/\[[0-9;]*m/g, '')

describe('isNewer', () => {
  it('compares semver triples', () => {
    expect(isNewer('0.5.0', '0.4.0')).toBe(true)
    expect(isNewer('0.4.1', '0.4.0')).toBe(true)
    expect(isNewer('1.0.0', '0.9.9')).toBe(true)
    expect(isNewer('0.4.0', '0.4.0')).toBe(false)
    expect(isNewer('0.4.0', '0.5.0')).toBe(false)
  })

  it('is false for non-semver inputs (e.g. dev builds)', () => {
    expect(isNewer('0.5.0', 'dev')).toBe(false)
    expect(isNewer('garbage', '0.4.0')).toBe(false)
  })
})

describe('cachedNotice', () => {
  it('returns an upgrade line when the cache is newer', () => {
    const n = cachedNotice('0.4.0', { lastCheckedAt: 't', latestVersion: '0.5.0' })
    expect(n).toContain('0.4.0')
    expect(n).toContain('0.5.0')
    expect(n).toContain('simgrid-cli@latest')
  })

  it('is null when up to date or cache empty', () => {
    expect(cachedNotice('0.5.0', { lastCheckedAt: 't', latestVersion: '0.5.0' })).toBeNull()
    expect(cachedNotice('0.4.0', undefined)).toBeNull()
  })
})

describe('needsRefresh', () => {
  const now = Date.parse('2026-06-18T12:00:00.000Z')
  it('is true with no cache', () => {
    expect(needsRefresh(undefined, now)).toBe(true)
  })
  it('is false within the interval', () => {
    expect(needsRefresh({ lastCheckedAt: '2026-06-18T06:00:00.000Z', latestVersion: '0.4.0' }, now)).toBe(false)
  })
  it('is true once the interval elapsed', () => {
    expect(needsRefresh({ lastCheckedAt: '2026-06-16T06:00:00.000Z', latestVersion: '0.4.0' }, now)).toBe(true)
  })
})

describe('parseRegistryVersion', () => {
  it('reads version from a registry document', () => {
    expect(parseRegistryVersion({ name: 'simgrid-cli', version: '0.5.0' })).toBe('0.5.0')
    expect(parseRegistryVersion({})).toBeUndefined()
  })
})

describe('refreshCache', () => {
  it('writes the fetched version with a timestamp', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'simgrid-upd-'))
    const file = join(dir, 'update-check.json')
    const now = Date.parse('2026-06-18T12:00:00.000Z')
    await refreshCache(now, { file, fetcher: async () => '0.9.0' })
    const cache = JSON.parse(await readFile(file, 'utf8'))
    expect(cache.latestVersion).toBe('0.9.0')
    expect(cache.lastCheckedAt).toBe('2026-06-18T12:00:00.000Z')
  })

  it('never throws and writes nothing when the fetch fails', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'simgrid-upd-'))
    const file = join(dir, 'update-check.json')
    await refreshCache(Date.now(), { file, fetcher: async () => null })
    expect(await readCache(file)).toBeUndefined()
  })
})

describe('updateNotice', () => {
  it('returns the cached notice without waiting on the network', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'simgrid-upd-'))
    const file = join(dir, 'update-check.json')
    const now = Date.parse('2026-06-18T12:00:00.000Z')
    await refreshCache(now, { file, fetcher: async () => '0.5.0' })
    const notice = await updateNotice('0.4.0', { file, now, fetcher: async () => '0.5.0' })
    expect(notice).toContain('0.4.0 → 0.5.0')
  })
})

describe('doctorUpdateLine', () => {
  it('flags an available update', async () => {
    const line = stripAnsi(await doctorUpdateLine('0.4.0', { fetcher: async () => '0.5.0' }))
    expect(line).toContain('latest is 0.5.0')
  })
  it('confirms when up to date', async () => {
    const line = stripAnsi(await doctorUpdateLine('0.5.0', { fetcher: async () => '0.5.0' }))
    expect(line).toContain('up to date')
  })
  it('degrades gracefully when offline', async () => {
    const line = stripAnsi(await doctorUpdateLine('0.5.0', { fetcher: async () => null }))
    expect(line.toLowerCase()).toContain('unavailable')
  })
})
