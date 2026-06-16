import { describe, expect, it } from 'vitest'
import { parseStartArgs } from './args.js'

describe('parseStartArgs', () => {
  it('defaults to no profile', () => {
    expect(parseStartArgs([])).toEqual({})
  })

  it('reads --profile <name>', () => {
    expect(parseStartArgs(['--profile', 'demo'])).toEqual({ profile: 'demo' })
  })

  it('reads --profile=<name>', () => {
    expect(parseStartArgs(['--profile=qa'])).toEqual({ profile: 'qa' })
  })

  it('ignores a dangling --profile with no value', () => {
    expect(parseStartArgs(['--profile'])).toEqual({})
  })
})
