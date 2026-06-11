import { createServer, type Server } from 'node:net'
import { describe, expect, it } from 'vitest'
import { allocatePort, isPortFree } from './ports.js'

function listen(port: number, host?: string): Promise<Server> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.once('error', reject)
    srv.listen(port, host, () => resolve(srv))
  })
}

const close = (srv: Server) => new Promise<void>((r) => srv.close(() => r()))

describe('isPortFree', () => {
  it('is true when nothing listens', async () => {
    expect(await isPortFree(8097)).toBe(true)
  })

  it('detects an IPv4 listener', async () => {
    const srv = await listen(8097, '127.0.0.1')
    try {
      expect(await isPortFree(8097)).toBe(false)
    } finally {
      await close(srv)
    }
  })

  it('detects an IPv6 wildcard listener (how Metro binds)', async () => {
    const srv = await listen(8097) // node default: '::'
    try {
      expect(await isPortFree(8097)).toBe(false)
    } finally {
      await close(srv)
    }
  })
})

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
