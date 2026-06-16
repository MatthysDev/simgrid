import type { ProjectPref } from './registry.js'

/** Device ids saved under a named profile for this project, if any. */
export function getProfile(pref: ProjectPref | undefined, name: string): string[] | undefined {
  return pref?.profiles?.[name]
}

/** Return a copy of the pref with `ids` saved under the named profile. */
export function saveProfile(pref: ProjectPref, name: string, ids: string[]): ProjectPref {
  return { ...pref, profiles: { ...pref.profiles, [name]: ids } }
}

/** Return a copy of the pref with the named profile removed. */
export function deleteProfile(pref: ProjectPref, name: string): ProjectPref {
  const profiles = { ...pref.profiles }
  delete profiles[name]
  return { ...pref, profiles }
}

/** One line per saved profile, or a friendly note when there are none. */
export function formatProfiles(pref: ProjectPref | undefined): string {
  const entries = Object.entries(pref?.profiles ?? {})
  if (entries.length === 0) return 'No profiles saved for this project.'
  return entries.map(([name, ids]) => `● ${name} → ${ids.length} device(s)`).join('\n')
}
