import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { detectRunner, expoArgv, expoExec, scriptRun } from './runner.js'

async function dirWith(...lockfiles: string[]): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'simgrid-runner-'))
  for (const f of lockfiles) await writeFile(join(dir, f), '')
  return dir
}

describe('detectRunner', () => {
  it('defaults to npm when no lockfile is present', async () => {
    expect(await detectRunner(await dirWith())).toBe('npm')
  })

  it('detects bun, pnpm and yarn from their lockfiles', async () => {
    expect(await detectRunner(await dirWith('bun.lockb'))).toBe('bun')
    expect(await detectRunner(await dirWith('pnpm-lock.yaml'))).toBe('pnpm')
    expect(await detectRunner(await dirWith('yarn.lock'))).toBe('yarn')
    expect(await detectRunner(await dirWith('package-lock.json'))).toBe('npm')
  })

  it('prefers a more specific lockfile over package-lock.json', async () => {
    expect(await detectRunner(await dirWith('package-lock.json', 'pnpm-lock.yaml'))).toBe('pnpm')
  })
})

describe('expoExec — run the local expo binary', () => {
  it('maps each runner to its exec prefix', () => {
    expect(expoExec('npm')).toBe('npx expo')
    expect(expoExec('bun')).toBe('bunx expo')
    expect(expoExec('pnpm')).toBe('pnpm exec expo')
    expect(expoExec('yarn')).toBe('yarn expo')
  })
})

describe('scriptRun — run a package.json script', () => {
  it('maps each runner to its script prefix', () => {
    expect(scriptRun('npm')).toBe('npm run')
    expect(scriptRun('bun')).toBe('bun run')
    expect(scriptRun('pnpm')).toBe('pnpm run')
    expect(scriptRun('yarn')).toBe('yarn')
  })
})

describe('expoArgv — spawn expo with an argument array', () => {
  it('returns command + prefix args per runner', () => {
    expect(expoArgv('npm')).toEqual({ command: 'npx', prefix: ['expo'] })
    expect(expoArgv('bun')).toEqual({ command: 'bunx', prefix: ['expo'] })
    expect(expoArgv('pnpm')).toEqual({ command: 'pnpm', prefix: ['exec', 'expo'] })
    expect(expoArgv('yarn')).toEqual({ command: 'yarn', prefix: ['expo'] })
  })
})
