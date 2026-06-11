import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import pc from 'picocolors'

export function wireStartScript(pkg: any): any {
  const scripts = { ...(pkg.scripts ?? {}) }
  if (scripts.start && scripts.start !== 'simpit') scripts['start:orig'] = scripts.start
  scripts.start = 'simpit'
  return { ...pkg, scripts }
}

export async function init(cwd = process.cwd()): Promise<void> {
  const file = join(cwd, 'package.json')
  let pkg: any
  try {
    pkg = JSON.parse(await readFile(file, 'utf8'))
  } catch {
    console.error(pc.red('No package.json here — run simpit init at the root of an Expo project.'))
    process.exit(1)
  }
  await writeFile(file, JSON.stringify(wireStartScript(pkg), null, 2) + '\n')
  console.log(pc.green('✔ "start" now runs simpit') + pc.dim(' (previous script kept as "start:orig")'))
}
