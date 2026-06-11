import { createConnection } from 'node:net'

function canConnect(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host, timeout: 500 })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
  })
}

/**
 * True when nothing is listening on the port. Probes by connecting (not binding):
 * on macOS a bind on 127.0.0.1 succeeds even when a server holds the IPv6
 * wildcard `::` — which is how Metro binds — so a bind probe misses it.
 */
export async function isPortFree(port: number): Promise<boolean> {
  const [v4, v6] = await Promise.all([canConnect(port, '127.0.0.1'), canConnect(port, '::1')])
  return !v4 && !v6
}

/** First port ≥ start that is neither registered by another session nor busy on the system. */
export async function allocatePort(
  taken: number[],
  isFree: (port: number) => Promise<boolean> = isPortFree,
  start = 8081,
): Promise<number> {
  for (let port = start; port < start + 100; port++) {
    if (taken.includes(port)) continue
    if (await isFree(port)) return port
  }
  throw new Error(`No free Metro port found in range ${start}-${start + 99}`)
}

/** Resolves once something is listening on the port (Metro is up). */
export async function waitForPort(port: number, timeoutMs = 60_000): Promise<void> {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (!(await isPortFree(port))) return
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Metro did not start listening on port ${port} within ${timeoutMs / 1000}s`)
}
