import { checkTools, formatHealth } from '../health.js'
import { VERSION } from '../ui.js'
import { doctorUpdateLine } from '../update-check.js'

export async function doctor(): Promise<void> {
  console.log(formatHealth(await checkTools()))
  console.log(await doctorUpdateLine(VERSION))
}
