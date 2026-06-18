import { describe, expect, it } from 'vitest'
import type { ProjectInfo } from './project.js'
import { currentFingerprint, refineBuildStatus } from './fingerprint.js'

const project = (over: Partial<ProjectInfo> = {}): ProjectInfo => ({
  path: '/p/ekklo',
  name: 'ekklo',
  scheme: 'ekklo',
  iosBundleId: 'com.ekklo.app',
  androidPackage: 'com.ekklo.app',
  hasDevClient: true,
  scripts: {},
  runner: 'npm',
  version: '1.0.0',
  ...over,
})

describe('refineBuildStatus', () => {
  it('leaves non-installed statuses untouched', () => {
    expect(refineBuildStatus('absent', undefined, 'abc')).toBe('absent')
    expect(refineBuildStatus('unknown', 'abc', 'abc')).toBe('unknown')
  })

  it('stays untracked when the fingerprint is unavailable', () => {
    expect(refineBuildStatus('untracked', 'abc', null)).toBe('untracked')
  })

  it('stays untracked when there is no baseline', () => {
    expect(refineBuildStatus('untracked', undefined, 'abc')).toBe('untracked')
  })

  it('is up-to-date when baseline matches the current fingerprint', () => {
    expect(refineBuildStatus('untracked', 'abc', 'abc')).toBe('up-to-date')
  })

  it('requires a rebuild when the fingerprint changed', () => {
    expect(refineBuildStatus('untracked', 'old', 'new')).toBe('rebuild')
  })
})

describe('currentFingerprint', () => {
  it('returns the computed hash', async () => {
    const fp = await currentFingerprint(project(), { compute: async () => 'hash-123' })
    expect(fp).toBe('hash-123')
  })

  it('returns null when the computation throws', async () => {
    const fp = await currentFingerprint(project(), {
      compute: async () => {
        throw new Error('no @expo/fingerprint')
      },
    })
    expect(fp).toBeNull()
  })

  it('returns null when the computation exceeds the timeout', async () => {
    const fp = await currentFingerprint(project(), {
      timeoutMs: 10,
      compute: () => new Promise<string>(() => {}), // never resolves
    })
    expect(fp).toBeNull()
  })
})
