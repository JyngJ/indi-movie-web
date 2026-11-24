import { describe, expect, it } from 'vitest'
import { extractMoonhwainMovieTitle, hasMoonhwainSessions, parseMoonhwainReservationDates } from './moonhwainReservation'

/*
 * 전주 시네마타운 /reservation/01.html 모양 — 2026-11-24 19:50 KST 운영자 브라우저 확인 내용으로 재구성한
 * 축약본이다(실측 HTML 원본이 아님. 수집 환경에서 :451 포트에 닿지 않아 원본을 못 받았다).
 * 지난 날짜는 링크 없는 텍스트, 예매 가능한 날짜는 ?ss_date= 링크, 행 첫 칸에 관람등급 <p>.
 */
const JCINEMA_20261124 = `
<div class="date_list">
  <div class="day"><span>01</span><em>토</em></div>
  <div class="day"><span>23</span><em>월</em></div>
  <div class="day today"><a href="?ss_date=2026-11-24"><span>24</span><em>화</em></a></div>
  <div class="day"><a href="?ss_date=2026-11-25"><span>25</span><em>수</em></a></div>
  <div class="day"><a href="?ss_date=2026-11-26"><span>26</span><em>목</em></a></div>
  <div class="day"><a href="?ss_date=2026-11-27"><span>27</span><em>금</em></a></div>
</div>
<table>
  <tr><th>영화제목</th><th>상영타입</th><th>상영관</th><th>상영시간</th></tr>
  <tr>
    <td><p class="grade">15</p><h4>세계의 주인</h4></td>
    <td>2D</td>
    <td>1관</td>
    <td><a href="javascript:wRsvMovie('jcinema','1234','q1')">10:30</a></td>
  </tr>
</table>`

const LEGACY_DAY_ON = `
<div class="day on"><a href="#" title="2026-11-05">5</a></div>
<div class="day on"><a href="#" title="2026-11-06">6</a></div>`

describe('parseMoonhwainReservationDates', () => {
  it('ss_date 링크를 날짜로 읽고 링크 없는 지난 날짜는 뺀다', () => {
    expect(parseMoonhwainReservationDates(JCINEMA_20261124, '2026-11-24'))
      .toEqual(['2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27'])
  })

  it('오늘 이전 날짜 링크(지난주 이동 등)는 버린다', () => {
    const html = `${JCINEMA_20261124}<a class="prev" href="01.html?ss_date=2026-11-17">이전 주</a>`
    expect(parseMoonhwainReservationDates(html, '2026-11-24')).not.toContain('2026-11-17')
  })

  it('&amp;로 이어진 링크도 읽는다', () => {
    expect(parseMoonhwainReservationDates('<a href="01.html?x=1&amp;ss_date=2026-11-25">', '2026-11-24'))
      .toEqual(['2026-11-25'])
  })

  it('옛 마크업(day on 칸의 title)도 계속 읽는다', () => {
    expect(parseMoonhwainReservationDates(LEGACY_DAY_ON, '2026-11-05')).toEqual(['2026-11-05', '2026-11-06'])
  })
})

describe('extractMoonhwainMovieTitle', () => {
  it('관람등급 <p>를 제목에 섞지 않는다', () => {
    const row = '<td><p class="grade">15</p><h4>세계의 주인</h4></td><td>2D</td>'
    expect(extractMoonhwainMovieTitle(row)).toBe('세계의 주인')
  })

  it('h4가 없으면 첫 칸에서 등급을 빼고 읽는다', () => {
    const row = '<td><p>12</p><strong>극장판 치이카와</strong></td><td>2D</td>'
    expect(extractMoonhwainMovieTitle(row)).toBe('극장판 치이카와')
  })
})

describe('hasMoonhwainSessions', () => {
  it('예매 링크가 있는 표를 알아본다', () => {
    expect(hasMoonhwainSessions(JCINEMA_20261124)).toBe(true)
    expect(hasMoonhwainSessions(LEGACY_DAY_ON)).toBe(false)
  })
})
