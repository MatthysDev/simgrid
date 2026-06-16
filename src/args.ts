export interface StartArgs {
  /** Named profile to launch directly (existing) or save the picked devices under (new). */
  profile?: string
}

/** Parse `simgrid start` flags. Supports `--profile <name>` and `--profile=<name>`. */
export function parseStartArgs(argv: string[]): StartArgs {
  const out: StartArgs = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--profile=')) {
      out.profile = arg.slice('--profile='.length)
    } else if (arg === '--profile') {
      const next = argv[i + 1]
      if (next !== undefined && !next.startsWith('-')) {
        out.profile = next
        i++
      }
    }
  }
  return out
}
