import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { decorateDigest, emailCampaignUrl, emailDestination, readTrackingToken, signTrackingToken } from './tracking'
import { resolveEmailTracking } from './trackingServer'
import { captureEmailMetric } from './analytics'

const id = '59229738-0719-4874-b578-f646c86fd7c5'
const sent = { id, user_id: 'private-account', revision: 'revision', slot: '2026-10-23', sent_at: '2026-10-23T00:00:00Z' }
const payload = { v: 1 as const, id, kind: 'click' as const, path: '/movie/one?tab=theaters', expires: Date.now() + 60000 }
beforeEach(() => {
  vi.stubEnv('EMAIL_NOTIFICATION_TOKEN_SECRET', 'test-secret-'.repeat(4))
  vi.stubEnv('EMAIL_ANALYTICS_ENABLED', 'true')
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_TOKEN', 'project-test-token')
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
describe('이메일 계측 보안과 발송 분리', () => {
  it('위조·만료·외부 리다이렉트·관리 링크를 거절한다', () => {
    const token = signTrackingToken(payload)
    expect(readTrackingToken(token)?.id).toBe(id)
    expect(readTrackingToken(token + 'x')).toBeNull()
    expect(readTrackingToken(signTrackingToken({ ...payload, expires: 1 }))).toBeNull()
    for (const path of ['https://evil.test/', '//evil.test/', '/\\evil.test/', '/email/manage?token=secret', '/films?redirect=https://evil.test', '/api/email-notifications/manage']) {
      expect(emailDestination(path)).toBe(false)
      expect(() => signTrackingToken({ ...payload, path })).toThrow()
    }
  })
  it('HTML·일반 텍스트 서비스 링크에만 계측을 넣고 인증·해지·이미지 URL을 유지한다', () => {
    const content = { html: '<body><a href="https://movie.test/movie/one?tab=theaters">예매</a><a href="https://movie.test/email/manage?token=private&amp;action=unsubscribe">해지</a><img src="https://movie.test/email/header.png"></body>', text: 'https://movie.test/films\nhttps://movie.test/email/manage?token=private' }
    const decorated = decorateDigest(content, 'https://movie.test', id)
    expect(decorated.html).toContain('/api/email-notifications/track?token=')
    expect(decorated.html).toContain('alt="이메일 열람 확인용 이미지"')
    expect(decorated.html).toContain('token=private&amp;action=unsubscribe')
    expect(decorated.html).toContain('src="https://movie.test/email/header.png"')
    expect(decorated.text).toContain('https://movie.test/email/manage?token=private')
    vi.stubEnv('EMAIL_ANALYTICS_ENABLED', 'false')
    expect(decorateDigest(content, 'https://movie.test', id)).toEqual(content)
  })
  it('유효한 발송분만 집계하고 해지 후에는 집계하지 않으며 상영 링크는 계속 연다', async () => {
    const capture = vi.fn().mockResolvedValue(true)
    const repo = { getSentDelivery: vi.fn().mockResolvedValue(sent), isActive: vi.fn().mockResolvedValue(true) }
    const token = signTrackingToken(payload)
    const resolved = await resolveEmailTracking(token, 'https://movie.test', () => repo, capture)
    expect(capture).toHaveBeenCalledWith('clicked', sent)
    expect(resolved?.location).toBe(emailCampaignUrl('https://movie.test', payload.path, sent.slot))
    expect(resolved?.location).not.toContain(id)
    expect(resolved?.location).not.toContain('token')
    capture.mockClear(); repo.isActive.mockResolvedValue(false)
    expect((await resolveEmailTracking(token, 'https://movie.test', () => repo, capture))?.kind).toBe('click')
    expect(capture).not.toHaveBeenCalled()
    repo.getSentDelivery.mockResolvedValue(null)
    await resolveEmailTracking(token, 'https://movie.test', () => repo, capture)
    expect(capture).not.toHaveBeenCalled()
  })
  it('분석·저장소 장애에도 유효한 링크는 열고 위조 요청은 저장소를 조회하지 않는다', async () => {
    const repo = vi.fn(() => { throw new Error('offline') })
    expect((await resolveEmailTracking(signTrackingToken(payload), 'https://movie.test', repo))?.location).toContain('utm_medium=email')
    repo.mockClear()
    expect(await resolveEmailTracking('invalid', 'https://movie.test', repo)).toBeNull()
    expect(repo).not.toHaveBeenCalled()
  })
  it('IP·주소·계정·인증 토큰을 보내지 않고 발송일 기준으로 묶으며 실패를 삼킨다', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetcher)
    expect(await captureEmailMetric('sent', sent)).toBe(true)
    const body = JSON.parse(fetcher.mock.calls[0][1].body)
    expect(body.timestamp).toBe(sent.sent_at)
    expect(body.properties.delivery_id).toBe(id)
    expect(body.distinct_id).toMatch(/^email:[a-f0-9]{64}$/)
    expect(body.properties.$process_person_profile).toBe(false)
    expect(JSON.stringify(body)).not.toContain(sent.user_id)
    expect(JSON.stringify(body)).not.toContain('test-secret')
    fetcher.mockRejectedValue(new Error('offline'))
    expect(await captureEmailMetric('opened', sent)).toBe(false)
  })
})
