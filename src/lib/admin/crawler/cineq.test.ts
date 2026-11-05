import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { parseCineQMovieTable, toCineQPlayDate } from './cineq'

const html = fs.readFileSync(path.join(__dirname, '__fixtures__/cineq-movietable2-20261106.html'), 'utf8')

describe('parseCineQMovieTable (2026-11 개편 화면)', () => {
  const rows = parseCineQMovieTable(html)

  it('하루치 회차를 모두 읽는다', () => {
    expect(rows).toHaveLength(55)
    expect(new Set(rows.map((r) => r.showDate))).toEqual(new Set(['2026-11-06']))
  })
  it('관람등급 배지를 제목에 섞지 않는다', () => {
    expect(rows[0].movieTitle).toBe('트레인스포팅')
    expect(rows.every((r) => !/^\d/.test(r.movieTitle))).toBe(true)
  })
  it('상영관·종료 시각·잔여석을 읽는다', () => {
    expect(rows[0]).toMatchObject({ screenName: '4관', showTime: '19:40', endTime: '21:19', seatAvailable: 137, seatTotal: 140 })
    expect(rows.some((r) => r.screenName === '(씨네필)9관')).toBe(true)
  })
  it('조조·기획전 표시를 따로 남긴다', () => {
    expect(rows.some((r) => r.attributes.includes('기획전'))).toBe(true)
  })
  it('예전 마크업(each-movie-title)에는 아무것도 만들지 않는다', () => {
    expect(parseCineQMovieTable('<div class="each-movie-title"><h3>x</h3></div>')).toEqual([])
  })
})

describe('toCineQPlayDate', () => {
  it('씨네Q는 하이픈 없는 날짜만 받는다', () => {
    expect(toCineQPlayDate('2026-11-06')).toBe('20261106')
  })
})
