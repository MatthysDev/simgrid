import pc from 'picocolors'
import { doctor } from './commands/doctor.js'
import { init } from './commands/init.js'
import { logs } from './commands/logs.js'
import { profiles } from './commands/profiles.js'
import { start } from './commands/start.js'
import { status } from './commands/status.js'
import { stop } from './commands/stop.js'
import { VERSION } from './ui.js'

const HELP = `
${pc.bold('simgrid')} — one grid for all your simulators

Usage:
  simgrid                      interactive picker, then launch (default)
  simgrid --profile <name>     launch a saved device set (saves it on first use)
  simgrid init                 wire "start": "simgrid" into this project's package.json
  simgrid status               show which project runs on which device
  simgrid logs [device]        stream a running device's system logs
  simgrid profiles             list saved device profiles for this project
  simgrid doctor               check that required tools are installed
  simgrid stop                 stop this project's sessions
  simgrid help                 this message
`

const cmd = process.argv[2] ?? 'start'

switch (cmd) {
  case 'start':
    await start()
    break
  case 'init':
    await init()
    break
  case 'status':
    await status()
    break
  case 'logs':
    await logs()
    break
  case 'profiles':
    await profiles()
    break
  case 'doctor':
    await doctor()
    break
  case 'stop':
    await stop()
    break
  case 'help':
  case '--help':
  case '-h':
    console.log(HELP)
    break
  case 'version':
  case '--version':
  case '-v':
    console.log(`simgrid v${VERSION}`)
    break
  default:
    // bare flags (e.g. `simgrid --profile demo`) fall through to start;
    // the flag sits at argv[2], so hand start the slice that includes it.
    if (cmd.startsWith('-')) {
      await start(process.cwd(), process.argv.slice(2))
      break
    }
    console.error(pc.red(`Unknown command: ${cmd}`))
    console.log(HELP)
    process.exit(1)
}
