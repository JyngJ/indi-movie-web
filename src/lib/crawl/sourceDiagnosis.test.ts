import { describe, expect, it } from 'vitest'
import { diagnoseDtryxCinema, summarizeHtmlListing, type DtryxMainList } from './sourceDiagnosis'

const main = (cinemas: DtryxMainList['CinemaList']): DtryxMainList => ({
  CinemaList: cinemas,
  MovieList: [{ MovieCd: 'm1', MovieNm: '영화', HiddenYn: 'N' }, { MovieCd: 'm2', MovieNm: '숨김', HiddenYn: 'Y' }],
  PlaySdtList: [{ PlaySDT: '2026-11-26', HiddenYn: 'N' }, { PlaySDT: '2026-11-27', HiddenYn: 'Y' }],
})

describe('diagnoseDtryxCinema', () => {
  // 가람영화관: 우리 쪽 이름은 가람영화관, 디트릭스 등록 이름은 삼척영화관(000026)
  const names = ['가람영화관', '삼척영화관']

  it('코드가 공개 상태로 있으면 listed', () => {
    const d = diagnoseDtryxCinema(main([{ CinemaCd: '000026', CinemaNm: '삼척영화관', HiddenYn: 'N' }]), '000026', names)
    expect(d).toMatchObject({ verdict: 'listed', cinemaCount: 1, visibleMovieCount: 1, visiblePlayDates: ['2026-11-26'] })
  })

  it('코드가 숨김이면 hidden — 열린 회차 없음', () => {
    const d = diagnoseDtryxCinema(main([{ CinemaCd: '000026', CinemaNm: '삼척영화관', HiddenYn: 'Y' }]), '000026', names)
    expect(d.verdict).toBe('hidden')
  })

  it('코드는 없고 이름이 같으면 renamed — 새 코드를 알려 준다', () => {
    const d = diagnoseDtryxCinema(main([{ CinemaCd: '000199', CinemaNm: '삼척 영화관', HiddenYn: 'N' }]), '000026', names)
    expect(d).toMatchObject({ verdict: 'renamed', entry: { CinemaCd: '000199' } })
  })

  it('코드도 이름도 없으면 missing, 비슷한 이름은 후보로 남긴다', () => {
    const d = diagnoseDtryxCinema(main([{ CinemaCd: '000030', CinemaNm: '정선시네마' }, { CinemaCd: '000031', CinemaNm: '삼척영화관 도계' }]), '000026', names)
    expect(d.verdict).toBe('missing')
    expect(d.nameHints.map((c) => c.CinemaCd)).toEqual(['000031'])
  })
})

describe('summarizeHtmlListing', () => {
  it('그누보드 게시판에서 글 링크·날짜·시각을 센다', () => {
    const html = `<html><head><title>상영시간표 | 동구영상미디어센터</title></head><body>
      <a href="./board.php?bo_table=6_1&amp;wr_id=101">11월 4주 상영시간표</a>
      <a href="./board.php?bo_table=6_1&amp;wr_id=101">11월 4주 상영시간표</a>
      <p>11.26 (목) 14:00 영화 A · 19:30 영화 B</p><img src="/data/x.jpg"></body></html>`
    const s = summarizeHtmlListing(html)
    expect(s.title).toBe('상영시간표 | 동구영상미디어센터')
    expect(s.boardPosts).toEqual([{ href: './board.php?bo_table=6_1&wr_id=101', title: '11월 4주 상영시간표' }])
    expect(s.timeTokens).toBe(2)
    expect(s.dateTokens).toBe(1) // 11.26 — "11월 4주"는 날짜가 아니다
    expect(s.images).toBe(1)
  })

  it('접근 거부 페이지를 알아본다', () => {
    const s = summarizeHtmlListing('<HTML><HEAD><TITLE>403 Forbidden</TITLE></HEAD><BODY><H1>Forbidden</H1></BODY></HTML>')
    expect(s.notices).toContain('Forbidden')
    expect(s.timeTokens).toBe(0)
  })
})
