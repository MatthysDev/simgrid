import { describe, expect, it } from 'vitest'
import { devClientUrl } from './launcher.js'

describe('devClientUrl', () => {
  it('builds the dev-client deep link with an encoded server url', () => {
    expect(devClientUrl('yolgo', 8082)).toBe('yolgo://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8082')
  })
})
