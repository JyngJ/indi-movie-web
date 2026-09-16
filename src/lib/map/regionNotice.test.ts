import { describe, expect, it } from 'vitest'
import { buildRegionNotice } from './regionNotice'

const base = { movieTitle: '오디세이', movieId: 'm1', regionId: '서울' }

describe('buildRegionNotice', () => {
  it('지역에 상영이 있으면 결과를 요약한다', () => {
    const notice = buildRegionNotice({ ...base, split: { inRegion: 3, inRegionShowtimes: 18, outRegion: 41, regionCount: 9 } })
    expect(notice).toEqual({ kind: 'summary', key: 'm1:서울', message: '극장 3곳에서 상영 18회를 찾았어요' })
  })

  it('지역에 상영이 없고 다른 지역에 있으면 그 사실을 알린다', () => {
    const notice = buildRegionNotice({ ...base, split: { inRegion: 0, inRegionShowtimes: 0, outRegion: 5, regionCount: 2 } })
    expect(notice?.kind).toBe('empty')
    expect(notice?.message).toBe('서울에서 「오디세이」를 상영하는 극장이 없어요. 다른 2개 지역에서 상영 중이에요')
  })

  it('어디에도 상영이 없으면 알리지 않는다', () => {
    expect(buildRegionNotice({ ...base, split: { inRegion: 0, inRegionShowtimes: 0, outRegion: 0, regionCount: 0 } })).toBeNull()
  })

  it('지역 필터가 없으면 가려진 상영이 없으므로 알리지 않는다', () => {
    expect(buildRegionNotice({ ...base, regionId: null, split: { inRegion: 0, inRegionShowtimes: 0, outRegion: 9, regionCount: 3 } })).toBeNull()
  })
})
