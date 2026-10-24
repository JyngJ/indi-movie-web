import { describe, expect, it } from 'vitest'
import { formatTopUnmatched, selectAutoMatchCandidates, summarizeAutoMatchOutcomes } from './autoMatchSummary'

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
      topUnmatched: [{ title: '애프터 양', screenings: 1, theaterNames: [], missing: 'movie' }],
    })
  })

  it('미매칭은 회차 많은 제목 순 최대 5편, 극장·못 찾은 쪽을 함께 남긴다', () => {
    const many = (title: string, n: number, theaterName: string, missing: 'movie' | 'theater' | 'both' = 'movie') =>
      Array.from({ length: n }, () => ({ kind: 'unmatched' as const, movieTitle: title, theaterName, missing }))
    const { topUnmatched } = summarizeAutoMatchOutcomes([
      ...many('신작', 12, '아트하우스'), ...many('신작 ', 3, '모모하우스'),
      ...many('새 극장 영화', 8, '새 극장', 'theater'),
      ...many('섞임', 2, 'A'), ...many('섞임', 1, 'B', 'both'),
      ...many('다', 1, 'x'), ...many('라', 1, 'x'), ...many('마', 1, 'x'),
      { kind: 'autoApproved', movieTitle: '승인작' },
    ])
    expect(topUnmatched.map((u) => [u.title, u.screenings])).toEqual([['신작', 15], ['새 극장 영화', 8], ['섞임', 3], ['다', 1], ['라', 1]])
    expect(topUnmatched[0].theaterNames).toEqual(['모모하우스', '아트하우스'])
    expect(topUnmatched[1].missing).toBe('theater')
    expect(topUnmatched[2].missing).toBe('both')
  })
})

describe('formatTopUnmatched', () => {
  it('제목·회차·극장(셋 이상은 외 N곳)·못 찾은 쪽을 한 줄로', () => {
    expect(formatTopUnmatched([
      { title: '신작', screenings: 1234, theaterNames: ['가', '나', '다', '라'], missing: 'movie' },
      { title: '새 극장 영화', screenings: 8, theaterNames: [], missing: 'theater' },
    ])).toEqual([
      '• 「신작」 1,234회차 — 가 · 나 외 2곳 · DB에 영화 없음',
      '• 「새 극장 영화」 8회차 — 극장 정보 없음 · 극장 미연결',
    ])
  })

  it('긴 제목은 40자에서 자른다', () => {
    const [line] = formatTopUnmatched([{ title: 'ㄱ'.repeat(60), screenings: 1, theaterNames: ['가'], missing: 'both' }])
    expect(line).toContain(`「${'ㄱ'.repeat(39)}…」`)
  })
})
