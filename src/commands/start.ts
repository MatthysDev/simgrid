import { confirm, isCancel, select, spinner, text } from '@clack/prompts'
import { execa } from 'execa'
import pc from 'picocolors'
import { parseStartArgs } from '../args.js'
import {
  buildKey,
  candidateBuildScripts,
  defaultBuildTemplate,
  forgetBuild,
  rememberBuild,
  rememberedBuild,
  scriptBuildTemplate,
} from '../build.js'
import { discoverDevices } from '../devices/index.js'
import { cloneIosSim } from '../devices/ios-sim.js'
import type { Device, Platform } from '../devices/types.js'
import { currentFingerprint, refineBuildStatus } from '../fingerprint.js'
import { checkTools, missingTools } from '../health.js'
import { ensureBooted, openApp, runBuild, startMetro } from '../launcher.js'
import { pickDevices } from '../picker.js'
import { pickMetroPort, waitForPort } from '../ports.js'
import { getProfile, saveProfile } from '../profile.js'
import { type ProjectInfo, resolveProject } from '../project.js'
import { deviceFingerprint, loadState, mutateState, type ProjectPref, recordFingerprint, reconcile, type Session } from '../registry.js'
import { expoArgv, expoExec, scriptRun } from '../runner.js'
import { banner, launchSummary, VERSION } from '../ui.js'
import { updateNotice } from '../update-check.js'

const CUSTOM = '__custom__'

export async function start(cwd = process.cwd(), argv: string[] = process.argv.slice(3)): Promise<void> {
  const { profile: profileName } = parseStartArgs(argv)

  console.log(`\n${banner()}\n`)

  // Non-blocking self-update notice: shown from cache, refreshed in the background.
  const notice = await updateNotice(VERSION)
  if (notice) console.log(`${notice}\n`)

  // Pre-flight: warn (but never block) about device tools that aren't on PATH.
  const missing = missingTools(await checkTools())
  if (missing.length > 0) {
    console.log(pc.yellow(`⚠ Missing tools: ${missing.map((m) => m.name).join(', ')} — run ${pc.bold('simgrid doctor')} for details.`))
  }

  const project = await resolveProject(cwd)
  if (!project.hasDevClient) {
    const yes = await confirm({
      message: `${project.name} has no expo-dev-client (needed for dev-client deep links). Install it now?`,
    })
    if (!isCancel(yes) && yes) {
      const { command, prefix } = expoArgv(project.runner)
      await execa(command, [...prefix, 'install', 'expo-dev-client'], { cwd: project.path, stdio: 'inherit' })
      project.hasDevClient = true
    } else {
      console.log(pc.yellow('  continuing without expo-dev-client — Metro will run in Expo Go mode.'))
    }
  }
  const state = reconcile(await loadState())
  const otherSessions = state.sessions.filter((s) => s.projectPath !== project.path)

  const findSp = spinner()
  findSp.start('Finding simulators & devices')
  const devices = await discoverDevices(project)
  findSp.stop(devices.length ? pc.dim(`${devices.length} device(s) found`) : 'No devices found')
  if (devices.length === 0) {
    console.error(pc.red('No simulators, emulators or devices found. Install Xcode and/or Android SDK.'))
    process.exit(1)
  }

  const pref = state.projectPrefs[project.path]
  const lastIds = pref?.lastDeviceIds ?? []

  // Classify each installed build as up-to-date / rebuild-needed by comparing the
  // project's current native fingerprint to the baseline simgrid saved at build time.
  const buildSp = spinner()
  buildSp.start('Checking builds')
  const fingerprint = await currentFingerprint(project)
  for (const d of devices) {
    d.buildStatus = refineBuildStatus(d.buildStatus, deviceFingerprint(pref, d.id), fingerprint)
  }
  const stale = devices.filter((d) => d.buildStatus === 'rebuild').length
  buildSp.stop(pc.dim(fingerprint === null ? 'build freshness unavailable' : stale ? `${stale} build(s) need a rebuild` : 'builds checked'))

  // `--profile <name>`: launch a saved set directly when it exists, otherwise pick and save it under that name.
  const savedProfile = profileName ? getProfile(pref, profileName) : undefined
  const availableProfileIds = savedProfile?.filter((id) => devices.some((d) => d.id === id)) ?? []
  let picked: Device[]
  if (savedProfile && availableProfileIds.length > 0) {
    picked = devices.filter((d) => availableProfileIds.includes(d.id))
    console.log(pc.cyan(`▶ profile ${pc.bold(profileName as string)} — ${picked.map((d) => d.name).join(', ')}`))
  } else {
    if (savedProfile) console.log(pc.yellow(`Profile "${profileName}" has no available devices right now — picking manually.`))
    picked = await pickDevices(devices, otherSessions, lastIds, project.name, project.version)
  }

  // Busy iOS sims → offer a clone (two windows of the same model, zero conflict)
  const resolved: Device[] = []
  for (const d of picked) {
    const busy = otherSessions.find((s) => s.deviceId === d.id)
    if (busy && d.platform === 'ios-sim') {
      const yes = await confirm({ message: `${d.name} is busy with "${busy.projectName}". Clone a fresh ${d.name} for ${project.name}?` })
      if (isCancel(yes) || !yes) continue
      const newId = await cloneIosSim(d.id, `${d.name} — simgrid`)
      resolved.push({ ...d, id: newId, state: 'shutdown', hasBuild: false, buildStatus: 'absent' })
    } else {
      resolved.push(d)
    }
  }
  picked = resolved
  if (picked.length === 0) {
    console.log('Nothing to launch.')
    return
  }

  // Remember the choice (and, on first use of a new --profile, save it) — locked delta.
  const pickedIds = picked.map((d) => d.id)
  await mutateState((s) => {
    const cur = s.projectPrefs[project.path] ?? { lastDeviceIds: [] }
    let next: ProjectPref = { ...cur, lastDeviceIds: pickedIds }
    if (profileName && !savedProfile) next = saveProfile(next, profileName, pickedIds)
    s.projectPrefs[project.path] = next
  })
  if (profileName && !savedProfile) {
    console.log(pc.dim(`  saved profile "${profileName}" (${pickedIds.length} device(s)) — replay it with: simgrid --profile ${profileName}`))
  }

  // Boot everything in parallel; collect live ids (AVDs get an adb serial once booted)
  const bootSp = spinner()
  bootSp.start('Booting devices (AVDs can take a minute)')
  const liveIds = await Promise.all(picked.map((d) => ensureBooted(d)))
  bootSp.stop(pc.dim(`${picked.length} device(s) ready`))

  // One Metro per project — reuse the running one when re-launching (decided against fresh state)
  const fresh = reconcile(await loadState())
  const { port, reused } = await pickMetroPort(fresh.sessions, project.path)

  const sessions: Session[] = picked.map((d, i) => ({
    projectPath: project.path,
    projectName: project.name,
    platform: d.platform,
    deviceId: liveIds[i],
    deviceName: d.name,
    metroPort: port,
    pid: process.pid,
    startedAt: new Date().toISOString(),
  }))
  await mutateState((s) => {
    s.sessions = [...s.sessions.filter((x) => x.pid !== process.pid), ...sessions]
  })

  const metro = reused ? undefined : startMetro(project, port)

  let cleaning = false
  const cleanup = () =>
    mutateState((s) => {
      const r = reconcile(s)
      return { ...r, sessions: r.sessions.filter((x) => x.pid !== process.pid) }
    })
  process.on('SIGINT', () => {
    if (cleaning) return
    cleaning = true
    try {
      metro?.kill('SIGINT')
    } catch {
      /* already gone */
    }
    cleanup()
      .catch((e) => console.error(e))
      .finally(() => process.exit(0))
  })
  metro?.on('exit', (code) => {
    if (cleaning) return
    cleaning = true
    cleanup()
      .catch((e) => console.error(e))
      .finally(() => process.exit(code ?? 0))
  })

  try {
    await waitForPort(port)
  } catch (err) {
    cleaning = true
    try {
      metro?.kill('SIGINT')
    } catch {
      /* already gone */
    }
    console.error(pc.red(`  Metro never started listening on port ${port}.`))
    console.error(err instanceof Error ? err.message : String(err))
    await cleanup().catch((e) => console.error(e))
    process.exit(1)
  }

  let prefs: ProjectPref | undefined = (await loadState()).projectPrefs[project.path]
  const cache = new Map<'ios' | 'android', string>()
  for (let i = 0; i < picked.length; i++) {
    const device = picked[i]
    if (device.hasBuild) {
      await openApp(device, liveIds[i], project, port)
      continue
    }
    const key = buildKey(device.platform)
    let template: string | null = cache.get(key) ?? rememberedBuild(prefs, device.platform) ?? null
    const wasKnown = template !== null
    if (!template) template = await askBuildCommand(project, device.platform)
    if (template === null) {
      console.log(pc.dim(`  ${device.name}: skipped (no build command)`))
      continue
    }
    cache.set(key, template)
    if (!wasKnown) prefs = await rememberBuildCommand(project.path, device.platform, template)
    try {
      await runBuild(project, liveIds[i], port, template)
      // Baseline this fresh build so we can flag it outdated on the next launch.
      if (fingerprint) prefs = await rememberDeviceFingerprint(project.path, liveIds[i], fingerprint)
    } catch (err) {
      cache.delete(key)
      prefs = await forgetBuildCommand(project.path, device.platform)
      console.error(pc.red(`  ${device.name}: build failed — I'll ask for the command again next time.`))
      console.error(err instanceof Error ? err.message : err)
    }
  }
  console.log(
    `\n${launchSummary(
      project.name,
      sessions.map((s) => ({ platform: s.platform, deviceName: s.deviceName, metroPort: s.metroPort })),
    )}\n`,
  )
}

/** Persist a freshly chosen build command for this project + platform (locked delta). */
async function rememberBuildCommand(path: string, platform: Platform, template: string): Promise<ProjectPref> {
  const s = await mutateState((st) => {
    const cur = st.projectPrefs[path] ?? { lastDeviceIds: [] }
    st.projectPrefs[path] = rememberBuild(cur, platform, template)
  })
  return s.projectPrefs[path]
}

/** Save the native fingerprint baseline for a freshly built device (locked delta). */
async function rememberDeviceFingerprint(path: string, deviceId: string, fingerprint: string): Promise<ProjectPref> {
  const s = await mutateState((st) => {
    const cur = st.projectPrefs[path] ?? { lastDeviceIds: [] }
    st.projectPrefs[path] = recordFingerprint(cur, deviceId, fingerprint, new Date().toISOString())
  })
  return s.projectPrefs[path]
}

/** Forget a build command after it failed, so simgrid asks again next time (locked delta). */
async function forgetBuildCommand(path: string, platform: Platform): Promise<ProjectPref> {
  const s = await mutateState((st) => {
    const cur = st.projectPrefs[path] ?? { lastDeviceIds: [] }
    st.projectPrefs[path] = forgetBuild(cur, platform)
  })
  return s.projectPrefs[path]
}

/** First-time picker: detected scripts, the runner's expo default, or a custom command. */
async function askBuildCommand(project: ProjectInfo, platform: Platform): Promise<string | null> {
  const scripts = candidateBuildScripts({ scripts: project.scripts }, platform)
  const choice = await select({
    message: `No dev build for ${buildKey(platform)}. How should I build ${project.name}?`,
    options: [
      ...scripts.map((s) => ({ value: scriptBuildTemplate(project.runner, s.name), label: `${scriptRun(project.runner)} ${s.name}`, hint: s.command })),
      { value: defaultBuildTemplate(project.runner, platform), label: `${expoExec(project.runner)} run:${buildKey(platform)}`, hint: 'default' },
      { value: CUSTOM, label: 'Custom command…' },
    ],
  })
  if (isCancel(choice)) return null
  if (choice !== CUSTOM) return choice as string

  const custom = await text({
    message: 'Build command (use {device} and {port} where needed):',
    placeholder: defaultBuildTemplate(project.runner, platform),
  })
  if (isCancel(custom) || !custom) return null
  return custom
}
