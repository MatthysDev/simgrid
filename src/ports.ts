import { createServer } from 'node:net'

/** True when nothing is listening on the port (localhost). */
export function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = createServer()
    srv.once('error', () => resolve(false))
    srv.listen(port, '127.0.0.1', () => srv.close(() => resolve(true)))
  })
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
