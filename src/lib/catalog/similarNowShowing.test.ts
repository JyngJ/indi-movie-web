import { describe, expect, it } from 'vitest'
import { pickSimilarNowShowing, type SimilarCandidate } from './similarNowShowing'

const m = (id: string, over: Partial<SimilarCandidate> = {}): SimilarCandidate => ({
  id, title: id, year: 2020, director: [], nation: null, posterUrl: null, ...over,
})

describe('pickSimilarNowShowing', () => {
  const movie = { id: 'self', director: ['홍상수'], nation: '한국', year: 2010 }

  it('같은 감독이 먼저, 그다음 같은 국가(연도가 가까운 순)', () => {
    const showing = [
      m('k2020', { nation: '한국', year: 2020 }),
      m('k2011', { nation: '한국', year: 2011 }),
      m('hong', { director: ['홍 상수'], nation: '한국' }),
      m('fr', { nation: '프랑스' }),
    ]
    expect(pickSimilarNowShowing(movie, showing).map((p) => [p.id, p.reason])).toEqual([
      ['hong', 'director'], ['k2011', 'nation'], ['k2020', 'nation'],
    ])
  })

  it('자기 자신은 빼고, 관계없는 영화로 채우지 않는다', () => {
    const showing = [m('self', { director: ['홍상수'] }), m('fr', { nation: '프랑스' })]
    expect(pickSimilarNowShowing(movie, showing)).toEqual([])
  })

  it('공동 제작 국가는 하나만 겹쳐도 같은 국가로 본다', () => {
    const showing = [m('co', { nation: '프랑스, 한국' })]
    expect(pickSimilarNowShowing(movie, showing).map((p) => p.id)).toEqual(['co'])
  })

  it('limit만큼만', () => {
    const showing = Array.from({ length: 10 }, (_, i) => m(`k${i}`, { nation: '한국' }))
    expect(pickSimilarNowShowing(movie, showing, 4)).toHaveLength(4)
  })

  it('감독·국가 정보가 없으면 빈 목록', () => {
    expect(pickSimilarNowShowing({ id: 'x', director: [] }, [m('a', { nation: '한국' })])).toEqual([])
  })
})
