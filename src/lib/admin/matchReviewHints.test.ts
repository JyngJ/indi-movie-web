import { describe, expect, it } from 'vitest'
import { extractListingHints, formatListingHints, movieeMovieRef, parseRawJson, runtimeMatchIndex } from './matchReviewHints'

const movieeShowtime = '{"T_ID":"130","M_ID":"M000121756","GRPM_ID":"M000121755","M_NM":"괴물(기획전)","GRADE":"12","PLAY_DT":"2026-09-25"}'
const movieeDetail = { M_ID: 'M000121756', RUNTIME: '126', GENRE: '드라마,미스터리,독립예술', DIRECTOR: null, GRADE: '12' }

describe('extractListingHints', () => {
  it('무비이 상세에서 러닝타임·장르·등급을 뽑고 독립예술 분류는 뺀다', () => {
    expect(extractListingHints(movieeDetail)).toEqual({
      director: undefined, runtimeMinutes: 126, genre: '드라마, 미스터리', grade: '12', year: undefined,
    })
  })
  it('크롤러가 준 개봉연도를 우선한다', () => {
    expect(extractListingHints({ ReleaseDT: '2006-07-27' }, 2023).year).toBe(2023)
    expect(extractListingHints({ ReleaseDT: '2006-07-27' }).year).toBe(2006)
  })
  it('JSON이 아닌 rawText는 빈 힌트', () => {
    expect(extractListingHints(parseRawJson('괴물 13:10 1관'))).toEqual({})
  })
})

describe('formatListingHints', () => {
  it('감독이 없으면 없다고 적는다', () => {
    expect(formatListingHints(extractListingHints(movieeDetail))).toBe('감독 정보 없음 · 126분 · 드라마, 미스터리 · 12세')
  })
})

describe('movieeMovieRef', () => {
  it('무비이 회차에서 상세 조회 키를 만든다', () => {
    expect(movieeMovieRef(parseRawJson(movieeShowtime), 'https://moviee.co.kr/Theater/Index?thsynid=130')).toEqual({
      origin: 'https://moviee.co.kr', tid: '130', mId: 'M000121756', gId: 'M000121755',
    })
  })
  it('다른 사이트면 undefined', () => {
    expect(movieeMovieRef(parseRawJson(movieeShowtime), 'https://www.dtryx.com/cinema/main.do')).toBeUndefined()
  })
})

describe('runtimeMatchIndex', () => {
  it('±2분 안에서 한 후보와만 맞을 때 인덱스', () => {
    expect(runtimeMatchIndex(126, [126, 119])).toBe(0)
    expect(runtimeMatchIndex(120, [126, 119])).toBe(1)
  })
  it('둘 다 맞거나 정보가 없으면 undefined', () => {
    expect(runtimeMatchIndex(120, [119, 121])).toBeUndefined()
    expect(runtimeMatchIndex(undefined, [126, 119])).toBeUndefined()
    expect(runtimeMatchIndex(126, [null, null])).toBeUndefined()
  })
})
