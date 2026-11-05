import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { parseDrfaCalendar } from './drfa'

const html = fs.readFileSync(path.join(__dirname, '__fixtures__/drfa-timetable-202611.html'), 'utf8')

describe('parseDrfaCalendar', () => {
  const rows = parseDrfaCalendar(html)

  it('날짜를 칸 id에서 읽어 소개 문구의 "1965년 12월"에 속지 않는다', () => {
    expect(rows).toHaveLength(30)
    expect(rows.every((r) => r.showDate.startsWith('2026-11-'))).toBe(true)
  })
  it('하루 두 회차를 각각 읽고 오후 시각을 24시간제로 바꾼다', () => {
    expect(rows.filter((r) => r.showDate === '2026-11-05')).toEqual([
      expect.objectContaining({ movieTitle: '알프스에 사는 나의 할아버지', showTime: '13:00', seatAvailable: 23 }),
      expect.objectContaining({ movieTitle: '거기 누가 노래해', showTime: '15:00', releaseYear: 1980, seatAvailable: 32 }),
    ])
  })
  it('오전 회차와 상세 주소를 읽는다', () => {
    expect(rows.find((r) => r.showDate === '2026-11-07')).toMatchObject({
      movieTitle: '7일간의 사랑', showTime: '11:00', releaseYear: 1983, detailUrl: 'https://drfa.co.kr/TIMETABLE/127549',
    })
  })
})
