import { describe, expect, it } from 'vitest'
import { genreWeights, pickSimilarNowShowing, similarReasonLabel, type SimilarCandidate } from './similarNowShowing'

const m = (id: string, over: Partial<SimilarCandidate> = {}): SimilarCandidate => ({
  id, title: id, year: 2020, director: [], nation: '한국', genre: ['드라마'], posterUrl: null, ...over,
})

/** 상영작 대부분이 드라마인 실제 분포를 흉내 낸 배경 */
const filler = Array.from({ length: 8 }, (_, i) => m(`filler${i}`))

describe('pickSimilarNowShowing', () => {
  const target = { id: 'self', director: ['연상호'], nation: '한국', year: 2026, genre: ['액션', '스릴러'] }

  it('감독 > 장르 두 개 > 드문 장르 하나 순', () => {
    const pool = [
      ...filler,
      m('thriller', { genre: ['스릴러'] }),
      m('both', { genre: ['액션', '스릴러'] }),
      m('dir', { director: ['연 상호'], genre: ['드라마'] }),
    ]
    expect(pickSimilarNowShowing(target, pool).map((p) => p.id)).toEqual(['dir', 'both', 'thriller'])
  })

  it('흔한 장르(드라마) 하나만 겹치면 고르지 않는다 — 한국 영화라는 이유만으로도 안 고른다', () => {
    const drama = { ...target, genre: ['드라마'], director: [] }
    expect(pickSimilarNowShowing(drama, [...filler, m('k', { genre: ['드라마'] })])).toEqual([])
  })

  it('겹친 장르보다 다른 장르가 많은 후보는 뺀다 — 액션 하나 겹친 어린이 애니메이션', () => {
    const pool = [...filler, m('kids', { genre: ['액션', '애니메이션', '가족'] }), m('a', { genre: ['액션'] })]
    expect(pickSimilarNowShowing(target, pool).map((p) => p.id)).toEqual(['a'])
  })

  it('장르 점수가 같으면 같은 나라·가까운 연도가 앞선다', () => {
    const pool = [...filler, m('fr', { genre: ['스릴러'], nation: '프랑스', year: 1990 }), m('kr', { genre: ['스릴러'], nation: '한국', year: 2024 })]
    expect(pickSimilarNowShowing(target, pool).map((p) => p.id)).toEqual(['kr', 'fr'])
  })

  it('자기 자신은 빼고 limit만큼만', () => {
    const pool = [m('self', { director: ['연상호'] }), ...Array.from({ length: 10 }, (_, i) => m(`d${i}`, { director: ['연상호'] }))]
    const picks = pickSimilarNowShowing(target, pool, 4)
    expect(picks).toHaveLength(4)
    expect(picks.some((p) => p.id === 'self')).toBe(false)
  })

  it('이유 문구는 가장 센 근거 하나', () => {
    const pool = [...filler, m('d', { director: ['연상호'], genre: ['스릴러'] }), m('g', { genre: ['스릴러'] })]
    const picks = pickSimilarNowShowing(target, pool)
    expect(similarReasonLabel(picks.find((p) => p.id === 'd')!.reason)).toBe('같은 감독')
    expect(similarReasonLabel(picks.find((p) => p.id === 'g')!.reason)).toBe('스릴러')
    const both = pickSimilarNowShowing(target, [...filler, m('b', { genre: ['액션', '스릴러'] })])
    expect(similarReasonLabel(both[0].reason).split('·').sort()).toEqual(['스릴러', '액션'])
  })
})

describe('genreWeights', () => {
  it('드문 장르일수록 무겁다', () => {
    const w = genreWeights([...filler, m('t', { genre: ['스릴러'] })])
    expect(w.get('스릴러')!).toBeGreaterThan(w.get('드라마')!)
  })
})
