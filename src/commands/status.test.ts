import { describe, expect, it } from 'vitest'
import { formatStatus } from './status.js'

describe('formatStatus', () => {
  it('prints one line per session', () => {
    const out = formatStatus([
      { projectPath: '/p/y', projectName: 'Yolgo', deviceId: 'A', deviceName: 'iPhone 15', metroPort: 8081, pid: 11, startedAt: '' },
      { projectPath: '/p/s', projectName: 'shoootin', deviceId: 'B', deviceName: 'Pixel_7', metroPort: 8082, pid: 22, startedAt: '' },
    ])
    expect(out).toContain('Yolgo → iPhone 15 (Metro :8081')
    expect(out).toContain('shoootin → Pixel_7 (Metro :8082')
  })

  it('says so when nothing is running', () => {
    expect(formatStatus([])).toBe('No simpit sessions running.')
  })
})
