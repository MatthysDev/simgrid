import type { Platform } from './devices/types.js'
import type { ProjectPref } from './registry.js'
import { expoExec, type Runner, scriptRun } from './runner.js'

export interface BuildScript {
  name: string
  command: string
}

/** Which build slot a platform stores its remembered command under. */
export function buildKey(platform: Platform): 'ios' | 'android' {
  return platform.startsWith('ios') ? 'ios' : 'android'
}

/** Project scripts whose command runs `expo run:<platform>` — the build-command candidates. */
export function candidateBuildScripts(pkg: any, platform: Platform): BuildScript[] {
  const token = `expo run:${buildKey(platform)}`
  const scripts: Record<string, unknown> = pkg?.scripts ?? {}
  return Object.entries(scripts)
    .filter(([, command]) => typeof command === 'string' && command.includes(token))
    .map(([name, command]) => ({ name, command: command as string }))
}

/** Default build command template (`<runner> expo run:…`) with device/port placeholders. */
export function defaultBuildTemplate(runner: Runner, platform: Platform): string {
  return `${expoExec(runner)} run:${buildKey(platform)} --device {device} --port {port}`
}

/** Template that runs a package.json script, passing the device/port flags through with `--`. */
export function scriptBuildTemplate(runner: Runner, scriptName: string): string {
  return `${scriptRun(runner)} ${scriptName} -- --device {device} --port {port}`
}

/** Resolve a stored template into a runnable shell command. */
export function applyBuildTemplate(template: string, vars: { device: string; port: number }): string {
  return template.replaceAll('{device}', vars.device).replaceAll('{port}', String(vars.port))
}

/** The build command remembered for this project + platform, if any. */
export function rememberedBuild(pref: ProjectPref | undefined, platform: Platform): string | undefined {
  return pref?.buildCommands?.[buildKey(platform)]
}

/** Return a copy of the pref with `template` remembered for this platform's slot. */
export function rememberBuild(pref: ProjectPref, platform: Platform, template: string): ProjectPref {
  return { ...pref, buildCommands: { ...pref.buildCommands, [buildKey(platform)]: template } }
}

/** Return a copy of the pref with this platform's remembered command dropped. */
export function forgetBuild(pref: ProjectPref, platform: Platform): ProjectPref {
  const buildCommands = { ...pref.buildCommands }
  delete buildCommands[buildKey(platform)]
  return { ...pref, buildCommands }
}
