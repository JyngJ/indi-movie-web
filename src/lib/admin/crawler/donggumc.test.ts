import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import type { AdminTheaterSource } from '@/types/admin'
import { parseShowtimeCandidates } from '../crawler'
import {
  decodeHtmlBytes,
  donggumcCandidates,
  donggumcHttpError,
  parseDonggumcBoard,
  parseDonggumcDate,
  parseDonggumcTime,
} from './donggumc'

const html = fs.readFileSync(path.join(__dirname, '__fixtures__/donggumc-board-6_1-20261126.html'), 'utf8')
const LISTING = 'http://www.donggumc.kr/bbs/board.php?bo_table=6_1&me_code=60'
const source = {
  id: '9a697308-5c91-4c24-bc47-fb599e0631ed',
  theaterId: 'dca63dee-8a72-49ae-a1fd-b12d3fc8ca17',
  theaterName: '동구영상미디어센터',
  homepageUrl: 'http://www.donggumc.kr',
  listingUrl: LISTING,
  parser: 'donggumcBoard',
  enabled: true,
  cadence: 'daily',
  health: 'healthy',
} as AdminTheaterSource
const context = { source, inputKind: 'url' as const, sourceUrl: LISTING }

describe('parseDonggumcBoard', () => {
  const screenings = parseDonggumcBoard(html)

  it('글마다 상영일·시각·장소·러닝타임을 읽는다 — 파이어하트 11월 27일 저녁 7시', () => {
    expect(screenings[0]).toEqual({
      postId: '290', movieTitle: '파이어하트', showDate: '2026-11-27', showTime: '19:00',
      timeGuessed: false, screenName: '5층 아트홀', runtimeMinutes: 92,
    })
  })

  it('구분선 행이 끼어도 글 순서대로 모두 읽는다', () => {
    expect(screenings.map((s) => [s.postId, s.movieTitle, s.showDate, s.showTime])).toEqual([
      ['290', '파이어하트', '2026-11-27', '19:00'],
      ['289', '조선명탐정', '2026-11-13', '19:00'],
      ['288', '라따뚜이', '2026-10-23', '15:30'],
    ])
  })

  it('범용 파서(tableText)는 이 표를 한 건도 못 읽는다 — 5월 31일 이후 매일 0건의 원인', () => {
    expect(parseShowtimeCandidates(html, { ...context, source: { ...source, parser: 'tableText' } })).toHaveLength(0)
  })
})

describe('donggumcCandidates', () => {
  it('지난 상영은 빼고 종료 시각·글 주소를 붙인다', () => {
    const candidates = donggumcCandidates(parseDonggumcBoard(html), context, LISTING, '2026-11-26')
    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      movieTitle: '파이어하트', showDate: '2026-11-27', showTime: '19:00', endTime: '20:32', screenName: '5층 아트홀',
      bookingUrl: 'http://www.donggumc.kr/bbs/board.php?bo_table=6_1&me_code=60&wr_id=290',
    })
    expect(candidates[0].warnings).toEqual([])
  })
})

describe('parseDonggumcDate / parseDonggumcTime', () => {
  it('한국어 날짜를 읽는다', () => {
    expect(parseDonggumcDate('2026년 11월 27일 금요일')).toBe('2026-11-27')
    expect(parseDonggumcDate('미정')).toBeNull()
  })

  it('저녁·오후·오전·24시간 표기를 읽는다', () => {
    expect(parseDonggumcTime('저녁 7시')).toEqual({ time: '19:00', guessed: false })
    expect(parseDonggumcTime('오후 3시 30분')).toEqual({ time: '15:30', guessed: false })
    expect(parseDonggumcTime('오후 2시 반')).toEqual({ time: '14:30', guessed: false })
    expect(parseDonggumcTime('오전 10시')).toEqual({ time: '10:00', guessed: false })
    expect(parseDonggumcTime('14:00')).toEqual({ time: '14:00', guessed: false })
  })

  it('오전·오후 표기가 없으면 오후로 읽고 추정했다고 표시한다', () => {
    expect(parseDonggumcTime('7시')).toEqual({ time: '19:00', guessed: true })
    expect(parseDonggumcTime('추후 공지')).toBeNull()
  })
})

describe('donggumc fetch helpers', () => {
  it('403은 차단 가능성과 확인 방법을 남긴다', () => {
    expect(donggumcHttpError(403)).toContain('HTTP 403')
    expect(donggumcHttpError(403)).toContain('diagnose-stale-sources')
    expect(donggumcHttpError(500)).toBe('동구영상미디어센터 게시판 요청 실패: HTTP 500')
  })

  it('euc-kr 페이지도 읽는다', () => {
    // "상영" = EUC-KR BB F3 BF B5
    const bytes = new Uint8Array([0x3c, 0x6d, 0x65, 0x74, 0x61, 0x20, 0x63, 0x68, 0x61, 0x72, 0x73, 0x65, 0x74, 0x3d, 0x65, 0x75, 0x63, 0x2d, 0x6b, 0x72, 0x3e, 0xbb, 0xf3, 0xbf, 0xb5])
    expect(decodeHtmlBytes(bytes.buffer, null)).toContain('상영')
    expect(decodeHtmlBytes(new TextEncoder().encode('상영').buffer as ArrayBuffer, 'text/html; charset=utf-8')).toBe('상영')
  })
})
