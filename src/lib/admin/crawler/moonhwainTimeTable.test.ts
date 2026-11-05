import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { parseMoonhwainTimeTableDates, parseMoonhwainTimeTableDay } from './moonhwainTimeTable'

const html = fs.readFileSync(path.join(__dirname, '__fixtures__/moonhwain-timetable-goheung-20261105.html'), 'utf8')

describe('문화인 homePy 시간표', () => {
  it('상영일 선택 상자에서 날짜를 읽는다', () => {
    const dates = parseMoonhwainTimeTableDates(html)
    expect(dates[0]).toBe('2026-11-05')
    expect(dates).not.toContain('2026-11-09') // 월요일 휴관
  })

  const rows = parseMoonhwainTimeTableDay(html)
  it('예매 가능한 회차는 예매 번호·종료 시각·잔여석을 갖는다', () => {
    expect(rows).toContainEqual({
      movieTitle: '최종면접', screenName: '1관', showTime: '19:35', ssIdx: '176836', endTime: '21:22', seatAvailable: 87,
    })
  })
  it('지난 회차도 시각은 남기되 예매 번호가 없다', () => {
    expect(rows).toContainEqual(expect.objectContaining({ movieTitle: '최종면접', showTime: '09:40', ssIdx: undefined }))
  })
  it('자막 표기는 제목에 그대로 둔다(매칭 단계가 정리한다)', () => {
    expect(rows.some((r) => r.movieTitle === '(자막)하트 오브 비스트')).toBe(true)
  })
})
