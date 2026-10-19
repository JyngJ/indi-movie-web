import { afterEach, expect, it, vi } from 'vitest'
import { readManagementToken, signManagementToken } from './tokens'
afterEach(() => vi.unstubAllEnvs())
it('해지·빈도 토큰의 위조와 만료를 거부한다', () => {
  vi.stubEnv('EMAIL_NOTIFICATION_TOKEN_SECRET', 'a'.repeat(32))
  const payload = { userId: 'user', revision: 'revision', purpose: 'frequency' as const, expires: Date.now() + 60000 }
  const token = signManagementToken(payload)
  expect(readManagementToken(token)).toEqual(payload)
  expect(readManagementToken(token + 'x')).toBeNull()
  expect(readManagementToken(token + '.extra')).toBeNull()
  expect(readManagementToken(signManagementToken({ ...payload, expires: 0 }))).toBeNull()
  vi.stubEnv('EMAIL_NOTIFICATION_TOKEN_SECRET', 'b'.repeat(32))
  expect(readManagementToken(token)).toBeNull()
})
