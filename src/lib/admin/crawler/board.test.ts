import { describe, expect, it } from 'vitest'
import { buildBoardSubjectSearchUrl, extractBoardImageUrls, findLatestBoardPostUrl, isBoardPostUrl } from './board'

const LIST_URL = 'https://sunamswc.or.kr/contents/bbs/board.php?bo_table=notice'

describe('isBoardPostUrl', () => {
  it('wr_id가 있으면 게시글 주소다', () => {
    expect(isBoardPostUrl(`${LIST_URL}&wr_id=1989`)).toBe(true)
    expect(isBoardPostUrl(LIST_URL)).toBe(false)
  })
})

describe('findLatestBoardPostUrl', () => {
  const html = `
    <a href="${LIST_URL.replace('&', '&amp;')}&amp;wr_id=1992">2026년 10월 이∙미용 서비스 일정 안내</a>
    <a href="${LIST_URL.replace('&', '&amp;')}&amp;wr_id=1583">시네마 in 선암 12월 영화관람 안내</a>
    <a href="${LIST_URL.replace('&', '&amp;')}&amp;wr_id=1989"><span>시네마in선암 10월 관원 영화관람 안내</span></a>
  `
  it('띄어쓰기와 상관없이 극장 이름이 든 가장 최근 글을 고른다', () => {
    expect(findLatestBoardPostUrl(html, LIST_URL, '시네마 in 선암')).toBe(`${LIST_URL}&wr_id=1989`)
  })
  it('해당 글이 없으면 undefined', () => {
    expect(findLatestBoardPostUrl(html, LIST_URL, '정동진독립영화관')).toBeUndefined()
  })
})

describe('extractBoardImageUrls', () => {
  it('그누보드 썸네일 대신 원본 파일을 앞에 둔다', () => {
    const html = `
      <img src="https://sunamswc.or.kr/contents/theme/d_theme/img/face.png">
      <a href="https://sunamswc.or.kr/contents/bbs/view_image.php?bo_table=notice&amp;fn=abc_def.jpg" class="view_image"><img src="https://sunamswc.or.kr/contents/data/file/notice/thumb-abc_def_835x590.jpg" alt="10월 시간표"/></a>
    `
    const urls = extractBoardImageUrls(html, `${LIST_URL}&wr_id=1989`)
    expect(urls[0]).toBe('https://sunamswc.or.kr/contents/data/file/notice/abc_def.jpg')
    expect(urls).not.toContain('https://sunamswc.or.kr/contents/theme/d_theme/img/face.png')
  })
  it('에디터 본문 이미지도 그대로 잡는다', () => {
    const html = '<img src="/contents/data/editor/2412/x.jpg">'
    expect(extractBoardImageUrls(html, `${LIST_URL}&wr_id=1583`)).toEqual(['https://sunamswc.or.kr/contents/data/editor/2412/x.jpg'])
  })
})

describe('buildBoardSubjectSearchUrl', () => {
  it('공백을 뺀 이름으로 제목 검색 주소를 만든다', () => {
    const url = new URL(buildBoardSubjectSearchUrl(`${LIST_URL}&page=2`, '시네마 in 선암')!)
    expect(url.searchParams.get('bo_table')).toBe('notice')
    expect(url.searchParams.get('sfl')).toBe('wr_subject')
    expect(url.searchParams.get('stx')).toBe('시네마in선암')
    expect(url.searchParams.has('page')).toBe(false)
  })
  it('그누보드 주소가 아니면 만들지 않는다', () => {
    expect(buildBoardSubjectSearchUrl('https://example.com/notice', '시네마 in 선암')).toBeUndefined()
  })
  it('검색 결과 목록(2026-11-24 실측 제목)에서 최신 글을 고른다', () => {
    const html = `
      <a href="${LIST_URL.replace('&', '&amp;')}&amp;wr_id=2010&amp;sfl=wr_subject">시네마in선암 11월 관원 영화관람 안내</a>
      <a href="${LIST_URL.replace('&', '&amp;')}&amp;wr_id=1989&amp;sfl=wr_subject">시네마in선암 10월 관원 영화관람 안내</a>
      <a href="${LIST_URL.replace('&', '&amp;')}&amp;wr_id=1545">지역사회행사-제9회 시네마토크콘서트 행사 참여자 모집</a>`
    expect(findLatestBoardPostUrl(html, LIST_URL, '시네마 in 선암')).toContain('wr_id=2010')
  })
})
