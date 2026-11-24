import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  extractMoonhwainMovieTitle,
  hasMoonhwainSessions,
  parseMoonhwainReservationDates,
  parseMoonhwainReservationDay,
} from './moonhwainReservation'

// 2026-11-24 19:5x 전주 시네마타운 실제 마크업(운영자 추출). 자리 채움 범위는 파일 머리 주석 참고
const html = fs.readFileSync(path.join(__dirname, '__fixtures__/moonhwain-reservation-jcinema-20261124.html'), 'utf8')

describe('전주 시네마타운 /reservation/01.html — 날짜', () => {
  it('오늘(day sel)과 예매 열린 날(day on)을 읽는다', () => {
    expect(parseMoonhwainReservationDates(html, '2026-11-24'))
      .toEqual(['2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27'])
  })

  it('span 칸(지난 날·예매 없는 미래)은 title에 날짜가 있어도 읽지 않는다', () => {
    const dates = parseMoonhwainReservationDates(html, '2026-11-01')
    expect(dates).not.toContain('2026-11-23')
    expect(dates).not.toContain('2026-11-28')
    expect(dates).toHaveLength(4)
  })

  it('예전 파서가 놓친 경우 — 예매 열린 날이 오늘(sel) 하나뿐이어도 날짜를 찾는다', () => {
    const onlyToday = html.replace(/<div class="day on"><a href="\?ss_date=[\d-]+" title="[\d-]+">(\d+)(<em[^<]*<\/em>)<\/a><\/div>/g, '<div class="day"><span>$1$2</span></div>')
    expect(parseMoonhwainReservationDates(onlyToday, '2026-11-24')).toEqual(['2026-11-24'])
  })

  it('제목 링크의 ss_date(/movie/detail.html?…&ss_date=)는 날짜로 세지 않는다', () => {
    const withOtherDate = html.replace('p_idx=3414&amp;ss_date=2026-11-24', 'p_idx=3414&amp;ss_date=2026-11-29')
    expect(parseMoonhwainReservationDates(withOtherDate, '2026-11-24')).not.toContain('2026-11-29')
  })

  it('수집이 05시 KST에 돌아도 오늘 이전 날짜는 뺀다', () => {
    expect(parseMoonhwainReservationDates(html, '2026-11-25')).toEqual(['2026-11-25', '2026-11-26', '2026-11-27'])
  })

  it('날짜 칸이 없는 화면이면 ss_date 링크로 대신한다', () => {
    expect(parseMoonhwainReservationDates('<a href="01.html?x=1&amp;ss_date=2026-11-25">25</a>', '2026-11-24'))
      .toEqual(['2026-11-25'])
  })
})

describe('전주 시네마타운 /reservation/01.html — 회차', () => {
  const rows = parseMoonhwainReservationDay(html)

  it('7행에서 회차 11개를 읽는다 (2+1+2+1+1+3+1)', () => {
    expect(rows).toHaveLength(11)
    expect(hasMoonhwainSessions(html)).toBe(true)
  })

  it('원본 1행: 관람등급 p는 제목에서 빠지고, 상영관 앞 주석은 지운다', () => {
    expect(rows.slice(0, 2)).toEqual([
      { movieTitle: '헝거게임 50번째 추첨의 날', screenType: '디지털', screenName: '5관', showTime: '10:00', bId: 'jcinema', inSsIdx: '98339', q: '' },
      { movieTitle: '헝거게임 50번째 추첨의 날', screenType: '디지털', screenName: '5관', showTime: '15:00', bId: 'jcinema', inSsIdx: '98341', q: '' },
    ])
  })

  it('원본 2행: 최종면접 5관 12:50 (회차 98340)', () => {
    expect(rows[2]).toMatchObject({ movieTitle: '최종면접', screenName: '5관', showTime: '12:50', inSsIdx: '98340' })
  })

  it('운영자가 알려 준 나머지 행의 상영관·시각', () => {
    const summary = rows.slice(3).map((r) => `${r.movieTitle}|${r.screenName}|${r.showTime}`)
    expect(summary).toEqual([
      '폴2:데드포인트|7관|10:20', '폴2:데드포인트|7관|14:20',
      '폭설|7관|12:20',
      '헝거게임 50번째 추첨의 날|7관|16:20',
      '폭설|8관|10:00', '폭설|8관|14:50', '폭설|8관|16:40',
      '헝거게임 50번째 추첨의 날|8관|11:50',
    ])
  })

  it('머리 행(th)은 회차로 읽지 않는다', () => {
    expect(rows.some((r) => r.movieTitle === '영화제목')).toBe(false)
  })
})

describe('extractMoonhwainMovieTitle', () => {
  it('h4가 없으면 첫 칸에서 등급 p를 빼고 읽는다', () => {
    expect(extractMoonhwainMovieTitle('<td><p class="i_grade c_orange">12</p><strong>극장판 치이카와</strong></td><td>2D</td>'))
      .toBe('극장판 치이카와')
  })
})
