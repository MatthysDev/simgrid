import { access } from 'node:fs/promises'
import { join } from 'node:path'

export type Runner = 'npm' | 'bun' | 'pnpm' | 'yarn'

/** Lockfiles in priority order: a specific PM's lockfile wins over package-lock.json. */
const LOCKFILES: [file: string, runner: Runner][] = [
  ['bun.lockb', 'bun'],
  ['bun.lock', 'bun'],
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['package-lock.json', 'npm'],
]

/** Which package manager a project uses, inferred from its lockfile (defaults to npm). */
export async function detectRunner(projectDir: string): Promise<Runner> {
  for (const [file, runner] of LOCKFILES) {
    try {
      await access(join(projectDir, file))
      return runner
    } catch {
      /* not this one */
    }
  }
  return 'npm'
}

/** Shell prefix that runs the project-local `expo` binary (for build command templates). */
export function expoExec(runner: Runner): string {
  switch (runner) {
    case 'bun':
      return 'bunx expo'
    case 'pnpm':
      return 'pnpm exec expo'
    case 'yarn':
      return 'yarn expo'
    default:
      return 'npx expo'
  }
}

/** Shell prefix that runs a package.json script by name. */
export function scriptRun(runner: Runner): string {
  switch (runner) {
    case 'bun':
      return 'bun run'
    case 'pnpm':
      return 'pnpm run'
    case 'yarn':
      return 'yarn'
    default:
      return 'npm run'
  }
}

/** Command + leading args to spawn `expo` with an argument array (no shell). */
export function expoArgv(runner: Runner): { command: string; prefix: string[] } {
  switch (runner) {
    case 'bun':
      return { command: 'bunx', prefix: ['expo'] }
    case 'pnpm':
      return { command: 'pnpm', prefix: ['exec', 'expo'] }
    case 'yarn':
      return { command: 'yarn', prefix: ['expo'] }
    default:
      return { command: 'npx', prefix: ['expo'] }
  }
}
