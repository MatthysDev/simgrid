import { confirm, isCancel, select, text } from '@clack/prompts'
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
import { checkTools, missingTools } from '../health.js'
import { ensureBooted, openApp, runBuild, startMetro } from '../launcher.js'
import { pickDevices } from '../picker.js'
import { allocatePort, isPortFree, waitForPort } from '../ports.js'
import { getProfile, saveProfile } from '../profile.js'
import { type ProjectInfo, resolveProject } from '../project.js'
import { loadState, reconcile, saveState, type Session, type State } from '../registry.js'

const CUSTOM = '__custom__'

export async function start(cwd = process.cwd(), argv: string[] = process.argv.slice(3)): Promise<void> {
  const { profile: profileName } = parseStartArgs(argv)

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
      await execa('npx', ['expo', 'install', 'expo-dev-client'], { cwd: project.path, stdio: 'inherit' })
      project.hasDevClient = true
    } else {
      console.log(pc.yellow('  continuing without expo-dev-client — Metro will run in Expo Go mode.'))
    }
  }
  const state = reconcile(await loadState())
  const otherSessions = state.sessions.filter((s) => s.projectPath !== project.path)

  const devices = await discoverDevices(project)
  if (devices.length === 0) {
    console.error(pc.red('No simulators, emulators or devices found. Install Xcode and/or Android SDK.'))
    process.exit(1)
  }

  const pref = state.projectPrefs[project.path]
  const lastIds = pref?.lastDeviceIds ?? []

  // `--profile <name>`: launch a saved set directly when it exists, otherwise pick and save it under that name.
  const savedProfile = profileName ? getProfile(pref, profileName) : undefined
  const availableProfileIds = savedProfile?.filter((id) => devices.some((d) => d.id === id)) ?? []
  let picked: Device[]
  if (savedProfile && availableProfileIds.length > 0) {
    picked = devices.filter((d) => availableProfileIds.includes(d.id))
    console.log(pc.cyan(`▶ profile ${pc.bold(profileName as string)} — ${picked.map((d) => d.name).join(', ')}`))
  } else {
    if (savedProfile) console.log(pc.yellow(`Profile "${profileName}" has no available devices right now — picking manually.`))
    picked = await pickDevices(devices, otherSessions, lastIds, project.name)
  }

  // Busy iOS sims → offer a clone (two windows of the same model, zero conflict)
  const resolved: Device[] = []
  for (const d of picked) {
    const busy = otherSessions.find((s) => s.deviceId === d.id)
    if (busy && d.platform === 'ios-sim') {
      const yes = await confirm({ message: `${d.name} is busy with "${busy.projectName}". Clone a fresh ${d.name} for ${project.name}?` })
      if (isCancel(yes) || !yes) continue
      const newId = await cloneIosSim(d.id, `${d.name} — simgrid`)
      resolved.push({ ...d, id: newId, state: 'shutdown', hasBuild: false })
    } else {
      resolved.push(d)
    }
  }
  picked = resolved
  if (picked.length === 0) {
    console.log('Nothing to launch.')
    return
  }

  // Remember the choice for next time (keep any remembered build commands)
  const pickedIds = picked.map((d) => d.id)
  state.projectPrefs[project.path] = { ...state.projectPrefs[project.path], lastDeviceIds: pickedIds }
  // First use of a new `--profile <name>`: persist this selection under that name.
  if (profileName && !savedProfile) {
    state.projectPrefs[project.path] = saveProfile(state.projectPrefs[project.path], profileName, pickedIds)
    console.log(pc.dim(`  saved profile "${profileName}" (${pickedIds.length} device(s)) — replay it with: simgrid --profile ${profileName}`))
  }

  // Boot everything in parallel; collect live ids (AVDs get an adb serial once booted)
  const liveIds = await Promise.all(picked.map((d) => ensureBooted(d)))

  // One Metro per project — reuse the existing session's port when re-running
  const existing = state.sessions.find((s) => s.projectPath === project.path)
  const metroAlreadyRunning = existing !== undefined && !(await isPortFree(existing.metroPort))
  const port = metroAlreadyRunning ? existing.metroPort : await allocatePort(state.sessions.map((s) => s.metroPort))

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
  state.sessions = [...state.sessions.filter((s) => s.pid !== process.pid), ...sessions]
  await saveState(state)

  const metro = metroAlreadyRunning ? undefined : startMetro(project, port)

  const cleanup = async () => {
    const s = reconcile(await loadState())
    s.sessions = s.sessions.filter((x) => x.pid !== process.pid)
    await saveState(s)
  }
  let cleaning = false
  process.on('SIGINT', () => {
    if (cleaning) return
    cleaning = true
    metro?.kill('SIGINT')
    void cleanup()
      .catch((e) => console.error(e))
      .finally(() => process.exit(0))
  })
  metro?.on('exit', (code) => {
    if (cleaning) return
    cleaning = true
    void cleanup()
      .catch((e) => console.error(e))
      .finally(() => process.exit(code ?? 0))
  })

  await waitForPort(port)
  const resolvedBuilds = new Map<'ios' | 'android', string>()
  for (let i = 0; i < picked.length; i++) {
    const device = picked[i]
    if (device.hasBuild) {
      await openApp(device, liveIds[i], project, port)
      continue
    }
    const template = await resolveBuildCommand(project, device.platform, state, resolvedBuilds)
    if (template === null) {
      console.log(pc.dim(`  ${device.name}: skipped (no build command)`))
      continue
    }
    try {
      await runBuild(project, liveIds[i], port, template)
    } catch (err) {
      resolvedBuilds.delete(buildKey(device.platform))
      state.projectPrefs[project.path] = forgetBuild(state.projectPrefs[project.path], device.platform)
      await saveState(state)
      console.error(pc.red(`  ${device.name}: build failed — I'll ask for the command again next time.`))
      console.error(err instanceof Error ? err.message : err)
    }
  }
  console.log(pc.green(`\n✔ ${project.name} — Ctrl+C to stop\n`))
}

/** Resolve a platform's build command: remembered → reuse; otherwise ask once and persist. */
async function resolveBuildCommand(
  project: ProjectInfo,
  platform: Platform,
  state: State,
  cache: Map<'ios' | 'android', string>,
): Promise<string | null> {
  const key = buildKey(platform)
  const cached = cache.get(key)
  if (cached) return cached

  const remembered = rememberedBuild(state.projectPrefs[project.path], platform)
  if (remembered) {
    cache.set(key, remembered)
    return remembered
  }

  const template = await askBuildCommand(project, platform)
  if (template === null) return null

  cache.set(key, template)
  state.projectPrefs[project.path] = rememberBuild(state.projectPrefs[project.path], platform, template)
  await saveState(state)
  return template
}

/** First-time picker: detected scripts, the expo default, or a custom command. */
async function askBuildCommand(project: ProjectInfo, platform: Platform): Promise<string | null> {
  const scripts = candidateBuildScripts({ scripts: project.scripts }, platform)
  const choice = await select({
    message: `No dev build for ${buildKey(platform)}. How should I build ${project.name}?`,
    options: [
      ...scripts.map((s) => ({ value: scriptBuildTemplate(s.name), label: `npm run ${s.name}`, hint: s.command })),
      { value: defaultBuildTemplate(platform), label: `npx expo run:${buildKey(platform)}`, hint: 'default' },
      { value: CUSTOM, label: 'Custom command…' },
    ],
  })
  if (isCancel(choice)) return null
  if (choice !== CUSTOM) return choice as string

  const custom = await text({
    message: 'Build command (use {device} and {port} where needed):',
    placeholder: defaultBuildTemplate(platform),
  })
  if (isCancel(custom) || !custom) return null
  return custom
}
