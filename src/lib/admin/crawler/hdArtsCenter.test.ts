import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { parseHdArtsCenterList } from './hdArtsCenter'

const html = fs.readFileSync(path.join(__dirname, '__fixtures__/hd-artscenter-list.html'), 'utf8')

describe('parseHdArtsCenterList', () => {
  const showtimes = parseHdArtsCenterList(html)

  it('목록의 모든 회차를 읽는다', () => {
    expect(showtimes).toHaveLength(15)
  })
  it('제목을 HTML 텍스트 그대로 읽는다 (OCR 오독 없음)', () => {
    expect(new Set(showtimes.map((s) => s.movieTitle))).toEqual(new Set([
      '(더빙) 극장판 치이카와:인어 섬의 비밀', '부활남:더 레드', '타짜:벨제붑의 노래', '암살자들', '인턴',
    ]))
  })
  it('공연장 상영관 이름과 잔여석·매진을 읽는다', () => {
    const tazza = showtimes.filter((s) => s.movieTitle === '타짜:벨제붑의 노래')
    expect(tazza).toContainEqual(expect.objectContaining({ showTime: '10:00', screenName: '소공연장', soldOut: true }))
    expect(tazza).toContainEqual(expect.objectContaining({ showTime: '19:30', screenName: '소공연장', soldOut: false, seatAvailable: 164 }))
    expect(showtimes.every((s) => s.screenName !== '상영관')).toBe(true)
  })
  it('영화 코드를 함께 남긴다', () => {
    expect(showtimes.find((s) => s.movieTitle === '암살자들')?.movieCode).toBe('20255033D')
  })
})
