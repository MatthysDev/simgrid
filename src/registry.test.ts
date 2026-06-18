import { mkdtemp, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { deviceFingerprint, emptyState, loadState, mutateState, reconcile, recordFingerprint, saveState, type State } from './registry.js'

const session = (over: Partial<State['sessions'][0]> = {}): State['sessions'][0] => ({
  projectPath: '/p/yolgo',
  projectName: 'Yolgo',
  platform: 'ios-sim',
  deviceId: 'UDID-1',
  deviceName: 'iPhone 15',
  metroPort: 8081,
  pid: 1234,
  startedAt: '2026-06-11T10:00:00.000Z',
  ...over,
})

describe('registry', () => {
  it('round-trips state through a file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'simgrid-'))
    const file = join(dir, 'state.json')
    const state: State = { sessions: [session()], projectPrefs: { '/p/yolgo': { lastDeviceIds: ['UDID-1'] } } }
    await saveState(state, file)
    expect(await loadState(file)).toEqual(state)
  })

  it('records a build fingerprint per device and reads it back', () => {
    const pref = recordFingerprint({ lastDeviceIds: [] }, 'UDID-1', 'fp-abc', '2026-06-18T00:00:00.000Z')
    expect(deviceFingerprint(pref, 'UDID-1')).toBe('fp-abc')
    expect(pref.builtFingerprints?.['UDID-1'].builtAt).toBe('2026-06-18T00:00:00.000Z')
  })

  it('overwrites a device fingerprint on a new build, keeps others', () => {
    let pref = recordFingerprint({ lastDeviceIds: [] }, 'A', 'old', 't1')
    pref = recordFingerprint(pref, 'B', 'bbb', 't2')
    pref = recordFingerprint(pref, 'A', 'new', 't3')
    expect(deviceFingerprint(pref, 'A')).toBe('new')
    expect(deviceFingerprint(pref, 'B')).toBe('bbb')
  })

  it('deviceFingerprint is undefined when unknown', () => {
    expect(deviceFingerprint(undefined, 'X')).toBeUndefined()
    expect(deviceFingerprint({ lastDeviceIds: [] }, 'X')).toBeUndefined()
  })

  it('returns empty state for a missing file', async () => {
    expect(await loadState('/nonexistent/simgrid/state.json')).toEqual(emptyState())
  })

  it('returns empty state for a corrupt file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'simgrid-'))
    const file = join(dir, 'state.json')
    await writeFile(file, '{not json')
    expect(await loadState(file)).toEqual(emptyState())
  })

  it('reconcile purges sessions whose pid is dead, keeps live ones', () => {
    const state: State = {
      sessions: [session({ pid: 111 }), session({ pid: 222, deviceId: 'UDID-2' })],
      projectPrefs: {},
    }
    const next = reconcile(state, (pid) => pid === 222)
    expect(next.sessions).toHaveLength(1)
    expect(next.sessions[0].pid).toBe(222)
  })

  it('drops structurally invalid session entries', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'simgrid-'))
    const file = join(dir, 'state.json')
    await writeFile(file, JSON.stringify({ sessions: [null, { bogus: true }, session()], projectPrefs: {} }))
    expect((await loadState(file)).sessions).toEqual([session()])
  })

  it('drops sessions without a valid platform (pre-0.2 state)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'simgrid-'))
    const file = join(dir, 'state.json')
    const { platform: _omit, ...noPlatform } = session({ deviceId: 'OLD' })
    await writeFile(
      file,
      JSON.stringify({ sessions: [session(), noPlatform, session({ deviceId: 'X', platform: 'martian' as never })], projectPrefs: {} }),
    )
    expect((await loadState(file)).sessions).toEqual([session()])
  })

  it('saves atomically — no temp file left behind', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'simgrid-'))
    const file = join(dir, 'state.json')
    await saveState({ sessions: [session()], projectPrefs: {} }, file)
    const entries = await readdir(dir)
    expect(entries).toEqual(['state.json'])
  })

  it('mutateState serialises concurrent updates without losing writes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'simgrid-'))
    const file = join(dir, 'state.json')
    await saveState(emptyState(), file)
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        mutateState((s) => {
          s.sessions.push(session({ pid: i, deviceId: `D${i}` }))
        }, file),
      ),
    )
    const loaded = await loadState(file)
    expect(loaded.sessions).toHaveLength(8)
    expect(new Set(loaded.sessions.map((s) => s.deviceId)).size).toBe(8)
  })
})
