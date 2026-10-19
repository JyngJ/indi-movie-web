import { expect, it } from 'vitest'
import { DEFAULT_PREFS, type FavoriteRef, type ScreeningFact } from '@/lib/notifications/types'
import { renderDigest, selectDigestItems, selectWeeklyRecommendations, type DigestEvent } from './digest'
const events: DigestEvent[] = [{ id: 'e1', kind: 'new_screening', subject_type: 'movie', subject_id: 'm1', movie_id: 'm1', theater_id: null }]
const favorites: FavoriteRef[] = [{ userId: 'u', type: 'movie', id: 'm1' }]
const screenings: ScreeningFact[] = [{ movieId: 'm1', movieTitle: '<영화>', directors: [], theaterId: 't1', theaterName: '극장', regionId: '서울', dates: ['2026-10-20'] }]
const input = { events, favorites, screenings, prefs: { ...DEFAULT_PREFS, userId: 'u' }, lastWeek: [], today: '2026-10-19' }
it('관심 해제·설정 해제·지난 상영·다른 지역은 요약에서 제외한다', () => {
  expect(selectDigestItems(input)).toHaveLength(1)
  expect(selectDigestItems({ ...input, favorites: [] })).toEqual([])
  expect(selectDigestItems({ ...input, prefs: { ...input.prefs, newScreening: false } })).toEqual([])
  expect(selectDigestItems({ ...input, today: '2026-10-21' })).toEqual([])
  expect(selectDigestItems({ ...input, prefs: { ...input.prefs, regionIds: ['부산'] } })).toEqual([])
})
it('같은 영화의 이벤트를 한 항목으로 묶되 모든 발송 키를 보존한다', () => {
  const items = selectDigestItems({ ...input, events: [...events, { ...events[0], id: 'e2' }] })
  expect(items).toHaveLength(1)
  expect(items[0].eventIds).toEqual(['e1', 'e2'])
})
it('막바지 판정이 철회되면 보내지 않는다', () => {
  const withLast = { ...input, events: [{ ...events[0], kind: 'last_week' as const }] }
  expect(selectDigestItems(withLast)).toEqual([])
  expect(selectDigestItems({ ...withLast, lastWeek: [{ movieId: 'm1', daysLeft: 1, confidence: 'likely' }] })).toHaveLength(1)
})
it('세 번째 메일에도 설문을 넣지 않고 영화 제목을 HTML로 실행하지 않는다', () => {
  const options = { items: selectDigestItems(input), origin: 'https://example.com', unsubscribeUrl: 'https://example.com/unsubscribe', frequencyUrl: 'https://example.com/frequency?token=x', sentCount: 2 }
  const content = renderDigest(options)
  expect(content.html).toContain('&lt;영화&gt;')
  expect(content.text).not.toContain('더 자주')
  expect(content.html).not.toContain('&amp;choice=less')
  expect(content.html).not.toContain('&amp;choice=same')
  expect(content.text).not.toContain('지금 정도')
  expect(renderDigest({ ...options, sentCount: 1 }).text).not.toContain('더 자주')
})
it('묶인 소식의 실제 회차가 사라지면 다른 상영으로 대체해 보내지 않는다', () => {
  const event = { ...events[0], payload: { screeningRefs: [{ movieId: 'm1', theaterId: 'removed' }] } }
  expect(selectDigestItems({ ...input, events: [event] })).toEqual([])
  const theaterEvent = { ...events[0], subject_type: 'theater' as const, subject_id: 't1', movie_id: null, theater_id: 't1', payload: { movieTitle: '이미 끝난 영화' } }
  expect(selectDigestItems({ ...input, favorites: [{ userId: 'u', type: 'theater', id: 't1' }], events: [theaterEvent] })).toEqual([])
})

it('이번 주 추천은 일요일까지·지역·중복·최대 3편을 지킨다', () => {
  const more = (id: string, dates: string[], regionId = '서울'): ScreeningFact => ({ ...screenings[0], movieId: id, movieTitle: id, dates, regionId })
  const picks = selectWeeklyRecommendations({ today: '2026-10-19', prefs: { ...input.prefs, regionIds: ['서울'] }, favorites, items: selectDigestItems(input), screenings: [
    ...screenings, more('next-week', ['2026-10-26']), more('past', ['2026-10-18']), more('busan', ['2026-10-20'], '부산'), more('a', ['2026-10-20']), more('a', ['2026-10-21']), more('b', ['2026-10-25']), more('c', ['2026-10-24']), more('d', ['2026-10-25']),
  ] })
  expect(picks.map(p => p.title)).toEqual(['a', 'c', 'b'])
  expect(picks.every(p => p.path.endsWith('?tab=theaters'))).toBe(true)
  const mail = renderDigest({ items: selectDigestItems(input), recommendations: picks, origin: 'https://example.com', unsubscribeUrl: 'https://example.com/unsubscribe', frequencyUrl: '', sentCount: 0 })
  expect(mail.html).toContain('이번 주 이런 상영도 있어요')
  expect(mail.text).toContain('다른 상영 구경하러 가기')
})

it('관심 극장에 묶인 여러 영화의 제목·감독·이동 경로와 발송 키를 보존한다', () => {
  const event: DigestEvent = { ...events[0], subject_type: 'theater', subject_id: 't1', movie_id: null, theater_id: 't1', payload: { screeningRefs: [{ movieId: 'm1', theaterId: 't1' }, { movieId: 'm2', theaterId: 't1' }] } }
  const items = selectDigestItems({ ...input, events: [event], favorites: [{ userId: 'u', type: 'theater', id: 't1' }], screenings: [...screenings, { ...screenings[0], movieId: 'm2', movieTitle: '다른 영화', directors: ['감독 이름'] }] })
  expect(items[0].groupName).toBe('극장')
  expect(items[0].films?.map(f => f.title)).toEqual(['<영화>', '다른 영화'])
  expect(items[0].films?.[1].directors).toEqual(['감독 이름'])
  const content = renderDigest({ items, origin: 'https://example.com', unsubscribeUrl: 'https://example.com/unsubscribe', frequencyUrl: '', sentCount: 0 })
  expect(content.subject).toBe('🎬 극장에서 <영화> 상영해요')
  expect(content.html).toContain('관심 극장 · 극장')
  expect(content.html).toContain('width="33.33%"')
  expect(content.html).toContain('다른 영화')
  expect(content.html).toContain('감독 이름')
  expect(content.text).toContain('https://example.com/movie/m2?tab=theaters')
})

it('메일 제목은 실제로 포함된 영화·감독·극장 이름을 쓴다', () => {
  const movie = { ...selectDigestItems(input)[0], title: '영화 이름' }
  const director = { ...movie, groupType: 'director' as const, groupName: '감독 이름' }
  const theater = { ...movie, groupType: 'theater' as const, groupName: '극장 이름', films: [{ title: '다른 영화', path: '/movie/2', description: '' }] }
  const mail = renderDigest({ items: [movie, director, theater], origin: 'https://example.com', unsubscribeUrl: '', frequencyUrl: '', sentCount: 0 })
  expect(mail.subject).toBe('🎬 영화 이름 상영해요, 감독 이름의 영화가 상영해요, 극장 이름에서 다른 영화 상영해요')
})
