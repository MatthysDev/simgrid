import { describe, expect, it } from 'vitest'
import { allocatePort } from './ports.js'

describe('allocatePort', () => {
  it('returns the start port when nothing is taken', async () => {
    expect(await allocatePort([], async () => true)).toBe(8081)
  })

  it('skips ports held in the registry', async () => {
    expect(await allocatePort([8081, 8082], async () => true)).toBe(8083)
  })

  it('skips ports that are busy on the system', async () => {
    const free = async (p: number) => p !== 8081
    expect(await allocatePort([], free)).toBe(8082)
  })

  it('throws when no port is available in range', async () => {
    await expect(allocatePort([], async () => false)).rejects.toThrow(/No free Metro port/)
  })
})
