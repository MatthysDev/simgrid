import { describe, expect, it } from 'vitest'
import { wireStartScript } from './init.js'

describe('wireStartScript', () => {
  it('sets start to simpit and preserves the previous script', () => {
    const pkg = wireStartScript({ name: 'app', scripts: { start: 'expo start' } })
    expect(pkg.scripts.start).toBe('simpit')
    expect(pkg.scripts['start:orig']).toBe('expo start')
  })

  it('handles projects with no scripts at all', () => {
    const pkg = wireStartScript({ name: 'app' })
    expect(pkg.scripts.start).toBe('simpit')
    expect(pkg.scripts['start:orig']).toBeUndefined()
  })

  it('is idempotent', () => {
    const pkg = wireStartScript(wireStartScript({ name: 'app', scripts: { start: 'expo start' } }))
    expect(pkg.scripts.start).toBe('simpit')
    expect(pkg.scripts['start:orig']).toBe('expo start')
  })
})
