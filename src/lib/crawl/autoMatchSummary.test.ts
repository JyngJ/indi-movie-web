import { describe, expect, it } from 'vitest'
import { selectAutoMatchCandidates, summarizeAutoMatchOutcomes } from './autoMatchSummary'

describe('selectAutoMatchCandidates', () => {
  it('KST 오늘 날짜를 포함하고 지난 날짜만 제외한다', () => {
    const candidates = [
      { showDate: '2026-10-16', movieTitle: '지난 상영' },
      { showDate: '2026-10-17', movieTitle: '오늘 상영' },
      { showDate: '2026-10-18', movieTitle: '예정 상영' },
    ]

    expect(selectAutoMatchCandidates(candidates, '2026-10-17', false)).toEqual(candidates.slice(1))
  })

  it('명시적으로 ID를 지정한 수동 재처리는 지난 회차도 유지한다', () => {
    const candidates = [{ showDate: '2026-10-16', movieTitle: '과거 상영' }]

    expect(selectAutoMatchCandidates(candidates, '2026-10-17', true)).toEqual(candidates)
  })
})

describe('summarizeAutoMatchOutcomes', () => {
  it('상태별 회차와 정규화한 고유 영화 제목을 집계한다', () => {
    expect(summarizeAutoMatchOutcomes([
      { kind: 'autoApproved', movieTitle: '  기생충  ' },
      { kind: 'autoApproved', movieTitle: '기생충' },
      { kind: 'matchedNeedsReview', movieTitle: '기생충' },
      { kind: 'matchedNeedsReview', movieTitle: '애프터   양' },
      { kind: 'unmatched', movieTitle: ' 애프터 양 ' },
      { kind: 'unmatched', movieTitle: '   ' },
      { kind: 'writeFailed', movieTitle: '저장 실패 작품' },
    ])).toEqual({
      autoApproved: { screenings: 2, uniqueTitles: 1 },
      matchedNeedsReview: { screenings: 2, uniqueTitles: 2 },
      unmatched: { screenings: 2, uniqueTitles: 1 },
      writeFailed: { screenings: 1, uniqueTitles: 1 },
      uniqueMovieTitles: 3,
    })
  })
})
