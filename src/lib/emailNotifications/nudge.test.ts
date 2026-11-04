import { expect, it } from 'vitest'
import { nudgeDue, renderNudge } from './nudge'

// 2026-11-02(월) 20:00 KST 구독
const base = { subscribedAt: '2026-11-02T11:00:00Z', favoriteCount: 0, previousNudges: [] as string[] }
it('구독 3일 뒤 첫 발송일에 보낸다', () => {
  expect(nudgeDue({ ...base, slot: '2026-11-02' })).toBe(false)
  expect(nudgeDue({ ...base, slot: '2026-11-05' })).toBe(true)
  expect(nudgeDue({ ...base, slot: '2026-11-06' })).toBe(true)
})
it('관심이 하나라도 있으면 보내지 않는다', () => {
  expect(nudgeDue({ ...base, slot: '2026-11-06', favoriteCount: 1 })).toBe(false)
})
it('직전 안내 날짜 기준 14일·28일 뒤에 보내고, 시각이 늦어도 날짜만 본다', () => {
  // 11-06(금) 16:25 KST에 첫 안내
  const first = ['2026-11-06T07:25:00Z']
  expect(nudgeDue({ ...base, slot: '2026-11-16', previousNudges: first })).toBe(false)
  expect(nudgeDue({ ...base, slot: '2026-11-20', previousNudges: first })).toBe(true)
  const second = [...first, '2026-11-20T00:13:00Z']
  expect(nudgeDue({ ...base, slot: '2026-12-14', previousNudges: second })).toBe(false)
  expect(nudgeDue({ ...base, slot: '2026-12-18', previousNudges: second })).toBe(true)
})
it('다시 구독하면 구독일부터 간격을 다시 잰다', () => {
  const old = ['2026-05-01T00:00:00Z']
  expect(nudgeDue({ ...base, subscribedAt: '2026-11-02T11:00:00Z', slot: '2026-11-06', previousNudges: old })).toBe(false)
  expect(nudgeDue({ ...base, subscribedAt: '2026-11-02T11:00:00Z', slot: '2026-11-16', previousNudges: old })).toBe(true)
})
it('3통을 보냈으면 다시 구독해도 더 보내지 않는다', () => {
  const three = ['2026-11-06T00:00:00Z', '2026-11-20T00:00:00Z', '2026-12-18T00:00:00Z']
  expect(nudgeDue({ ...base, subscribedAt: '2027-03-01T00:00:00Z', slot: '2027-06-04', previousNudges: three })).toBe(false)
})
it('추천 영화 제목을 HTML로 실행하지 않고 안내 횟수를 밝힌다', () => {
  const content = renderNudge({ origin: 'https://example.com', unsubscribeUrl: 'https://example.com/unsubscribe',
    recommendations: [{ eventIds: [], title: '<영화>', description: '극장 · 11월 6일', path: '/movie/m1?tab=theaters' }] })
  expect(content.html).toContain('&lt;영화&gt;')
  expect(content.html).toContain('https://example.com/films')
  expect(content.text).toContain('최대 3번')
  expect(renderNudge({ origin: 'https://example.com', unsubscribeUrl: 'u', recommendations: [] }).html).not.toContain('이번 주 이런 상영도')
})
