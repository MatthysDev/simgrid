import { formatProfiles } from '../profile.js'
import { loadState } from '../registry.js'

export async function profiles(cwd = process.cwd()): Promise<void> {
  const state = await loadState()
  console.log(formatProfiles(state.projectPrefs[cwd]))
}
