import { describe, expect, it } from 'vitest'
import { findKobisMovieCd, fetchScreenCountTrend, isScreenCountDeclining } from './getBoxOfficeTrend'

describe('findKobisMovieCd', () => {
  it('returns the exact title match movieCd', async () => {
    const fixture = {
      movieListResult: {
        movieList: [
          { movieCd: '20260001', movieNm: '화양연화', openDt: '20260101' },
          { movieCd: '20260002', movieNm: '화양연화 리마스터링', openDt: '20260201' },
        ],
      },
    }
    const cd = await findKobisMovieCd('key', '화양연화', 2026, async () => fixture)
    expect(cd).toBe('20260001')
  })

  it('disambiguates by openDt year when there are multiple exact-title candidates', async () => {
    const fixture = {
      movieListResult: {
        movieList: [
          { movieCd: 'old', movieNm: '동명영화', openDt: '20100101' },
          { movieCd: 'new', movieNm: '동명영화', openDt: '20260101' },
        ],
      },
    }
    const cd = await findKobisMovieCd('key', '동명영화', 2026, async () => fixture)
    expect(cd).toBe('new')
  })

  it('returns null when there is no candidate at all', async () => {
    const cd = await findKobisMovieCd('key', '존재안함', 2026, async () => ({ movieListResult: { movieList: [] } }))
    expect(cd).toBeNull()
  })

  it('falls back to the first candidate when no exact title match exists', async () => {
    const fixture = {
      movieListResult: {
        movieList: [{ movieCd: 'fuzzy', movieNm: '화양연화(재개봉판)', openDt: '20260101' }],
      },
    }
    const cd = await findKobisMovieCd('key', '화양연화', undefined, async () => fixture)
    expect(cd).toBe('fuzzy')
  })
})

describe('fetchScreenCountTrend', () => {
  it('collects scrnCnt across dates, skipping dates where the movie is not ranked', async () => {
    const fetchJson = async (url: string) => {
      if (url.includes('20260701')) {
        return { boxOfficeResult: { dailyBoxOfficeList: [{ movieCd: 'm1', scrnCnt: '40' }] } }
      }
      if (url.includes('20260703')) {
        return { boxOfficeResult: { dailyBoxOfficeList: [{ movieCd: 'm1', scrnCnt: '10' }] } }
      }
      return { boxOfficeResult: { dailyBoxOfficeList: [] } } // 20260702 — 순위 밖
    }

    const trend = await fetchScreenCountTrend('key', 'm1', ['20260701', '20260702', '20260703'], fetchJson)
    expect(trend).toEqual([
      { targetDt: '20260701', scrnCnt: 40 },
      { targetDt: '20260703', scrnCnt: 10 },
    ])
  })
})

describe('isScreenCountDeclining', () => {
  it('is false with fewer than 2 data points', () => {
    expect(isScreenCountDeclining([])).toBe(false)
    expect(isScreenCountDeclining([{ targetDt: '20260701', scrnCnt: 10 }])).toBe(false)
  })

  it('is true when the latest scrnCnt is lower than the earliest', () => {
    const trend = [
      { targetDt: '20260701', scrnCnt: 40 },
      { targetDt: '20260703', scrnCnt: 10 },
    ]
    expect(isScreenCountDeclining(trend)).toBe(true)
  })

  it('is false when scrnCnt held steady or increased', () => {
    const trend = [
      { targetDt: '20260701', scrnCnt: 10 },
      { targetDt: '20260703', scrnCnt: 15 },
    ]
    expect(isScreenCountDeclining(trend)).toBe(false)
  })
})
