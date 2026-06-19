import { mkdtemp, mkdir, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { decideDepsState, depsStatus, installArgv } from './deps.js'

describe('installArgv', () => {
  it('maps each runner to its install command', () => {
    expect(installArgv('bun')).toEqual({ command: 'bun', args: ['install'] })
    expect(installArgv('npm')).toEqual({ command: 'npm', args: ['install'] })
    expect(installArgv('pnpm')).toEqual({ command: 'pnpm', args: ['install'] })
    expect(installArgv('yarn')).toEqual({ command: 'yarn', args: ['install'] })
  })
})

describe('decideDepsState', () => {
  it('is absent when node_modules is missing', () => {
    expect(decideDepsState({ hasNodeModules: false, lockMtimeMs: 100, nodeModulesMtimeMs: null })).toBe('absent')
  })

  it('is stale when the lockfile is newer than node_modules', () => {
    expect(decideDepsState({ hasNodeModules: true, lockMtimeMs: 200, nodeModulesMtimeMs: 100 })).toBe('stale')
  })

  it('is ok when node_modules is at least as new as the lockfile', () => {
    expect(decideDepsState({ hasNodeModules: true, lockMtimeMs: 100, nodeModulesMtimeMs: 200 })).toBe('ok')
    expect(decideDepsState({ hasNodeModules: true, lockMtimeMs: 100, nodeModulesMtimeMs: 100 })).toBe('ok')
  })

  it('is ok when there is no lockfile to compare against', () => {
    expect(decideDepsState({ hasNodeModules: true, lockMtimeMs: null, nodeModulesMtimeMs: 100 })).toBe('ok')
  })
})

describe('depsStatus', () => {
  async function tmpProject(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'simgrid-deps-'))
  }

  it('reports absent when there is no node_modules', async () => {
    const dir = await tmpProject()
    await writeFile(join(dir, 'bun.lock'), '')
    expect(await depsStatus(dir)).toBe('absent')
  })

  it('reports stale when the lockfile is touched after node_modules', async () => {
    const dir = await tmpProject()
    await mkdir(join(dir, 'node_modules'))
    const old = new Date(2020, 0, 1)
    await utimes(join(dir, 'node_modules'), old, old)
    await writeFile(join(dir, 'bun.lock'), '')
    const recent = new Date(2024, 0, 1)
    await utimes(join(dir, 'bun.lock'), recent, recent)
    expect(await depsStatus(dir)).toBe('stale')
  })

  it('reports ok when node_modules is newer than the lockfile', async () => {
    const dir = await tmpProject()
    await writeFile(join(dir, 'package-lock.json'), '{}')
    const old = new Date(2020, 0, 1)
    await utimes(join(dir, 'package-lock.json'), old, old)
    await mkdir(join(dir, 'node_modules'))
    expect(await depsStatus(dir)).toBe('ok')
  })
})
