import pc from 'picocolors'
import { init } from './commands/init.js'
import { start } from './commands/start.js'
import { status } from './commands/status.js'
import { stop } from './commands/stop.js'

const HELP = `
${pc.bold('simpit')} — pit crew for your simulators

Usage:
  simpit            interactive picker, then launch (default)
  simpit init       wire "start": "simpit" into this project's package.json
  simpit status     show which project runs on which device
  simpit stop       stop this project's sessions
  simpit help       this message
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
  case 'stop':
    await stop()
    break
  case 'help':
  case '--help':
  case '-h':
    console.log(HELP)
    break
  default:
    console.error(pc.red(`Unknown command: ${cmd}`))
    console.log(HELP)
    process.exit(1)
}
