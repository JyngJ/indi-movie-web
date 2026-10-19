import { afterEach, expect, it, vi } from 'vitest'
import { sendGmail } from './gmail'
const message = { to: 'reader@example.com', subject: '상영 소식', text: '본문', html: '<p>본문</p>', messageId: 'test-id' }
function credentials() { for (const key of ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN']) vi.stubEnv(key, 'test') }
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
it('Gmail에 수신자별 MIME 메일을 보낸다', async () => {
  credentials()
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ access_token: 'access' })).mockResolvedValueOnce(Response.json({ id: 'gmail-id' }))
  vi.stubGlobal('fetch', fetcher)
  expect(await sendGmail(message)).toBe('gmail-id')
  const request = JSON.parse(fetcher.mock.calls[1][1].body)
  const mime = Buffer.from(request.raw, 'base64url').toString()
  expect(mime).toContain('indi.movie.map@gmail.com')
  expect(mime).toContain('To: reader@example.com')
  expect(mime).toMatch(/Date: .+ GMT/)
})
it('전송 이후 네트워크 실패는 불확실 상태로 구분한다', async () => {
  credentials()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ access_token: 'access' })).mockRejectedValueOnce(new Error('timeout')))
  await expect(sendGmail(message)).rejects.toMatchObject({ uncertain: true })
})
it('전송 거부와 인증 실패는 안전한 재시도 대상으로 구분한다', async () => {
  credentials()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({}, { status: 401 })))
  await expect(sendGmail(message)).rejects.toMatchObject({ uncertain: false })
})
it('토큰을 얻기 전 네트워크 실패는 발송 전 실패이므로 재시도할 수 있다', async () => {
  credentials()
  vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('token timeout')))
  await expect(sendGmail(message)).rejects.toMatchObject({ uncertain: false })
})
