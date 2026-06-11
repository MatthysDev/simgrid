import { confirm, isCancel } from '@clack/prompts'
import pc from 'picocolors'
import { discoverDevices } from '../devices/index.js'
import { cloneIosSim } from '../devices/ios-sim.js'
import type { Device } from '../devices/types.js'
import { ensureBooted, openApp, startMetro } from '../launcher.js'
import { pickDevices } from '../picker.js'
import { allocatePort, waitForPort } from '../ports.js'
import { resolveProject } from '../project.js'
import { loadState, reconcile, saveState, type Session } from '../registry.js'

export async function start(cwd = process.cwd()): Promise<void> {
  const project = await resolveProject(cwd)
  const state = reconcile(await loadState())
  const otherSessions = state.sessions.filter((s) => s.projectPath !== project.path)

  const devices = await discoverDevices(project)
  if (devices.length === 0) {
    console.error(pc.red('No simulators, emulators or devices found. Install Xcode and/or Android SDK.'))
    process.exit(1)
  }

  const lastIds = state.projectPrefs[project.path]?.lastDeviceIds ?? []
  let picked = await pickDevices(devices, otherSessions, lastIds, project.name)

  // Busy iOS sims → offer a clone (two windows of the same model, zero conflict)
  const resolved: Device[] = []
  for (const d of picked) {
    const busy = otherSessions.find((s) => s.deviceId === d.id)
    if (busy && d.platform === 'ios-sim') {
      const yes = await confirm({ message: `${d.name} is busy with "${busy.projectName}". Clone a fresh ${d.name} for ${project.name}?` })
      if (isCancel(yes) || !yes) continue
      const newId = await cloneIosSim(d.id, `${d.name} — simpit`)
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

  // Remember the choice for next time
  state.projectPrefs[project.path] = { lastDeviceIds: picked.map((d) => d.id) }

  // Boot everything in parallel; collect live ids (AVDs get an adb serial once booted)
  const liveIds = await Promise.all(picked.map((d) => ensureBooted(d)))

  // One Metro per project — reuse the existing session's port when re-running
  const existing = state.sessions.find((s) => s.projectPath === project.path)
  const port = existing?.metroPort ?? (await allocatePort(state.sessions.map((s) => s.metroPort)))

  const sessions: Session[] = picked.map((d, i) => ({
    projectPath: project.path,
    projectName: project.name,
    deviceId: liveIds[i],
    deviceName: d.name,
    metroPort: port,
    pid: process.pid,
    startedAt: new Date().toISOString(),
  }))
  state.sessions = [...state.sessions.filter((s) => s.pid !== process.pid), ...sessions]
  await saveState(state)

  const metro = existing ? undefined : startMetro(project, port)

  const cleanup = async () => {
    const s = reconcile(await loadState())
    s.sessions = s.sessions.filter((x) => x.pid !== process.pid)
    await saveState(s)
  }
  process.on('SIGINT', () => {
    void cleanup().finally(() => {
      metro?.kill('SIGINT')
      process.exit(0)
    })
  })
  metro?.on('exit', (code) => {
    void cleanup().finally(() => process.exit(code ?? 0))
  })

  await waitForPort(port)
  for (let i = 0; i < picked.length; i++) {
    await openApp(picked[i], liveIds[i], project, port)
  }
  console.log(pc.green(`\n✔ ${project.name} live on ${picked.length} device(s) — Ctrl+C to stop\n`))
}
