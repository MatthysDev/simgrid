import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { emptyState, loadState, reconcile, saveState, type State } from './registry.js'

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
})
