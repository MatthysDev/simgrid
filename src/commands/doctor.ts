import { checkTools, formatHealth } from '../health.js'

export async function doctor(): Promise<void> {
  console.log(formatHealth(await checkTools()))
}
