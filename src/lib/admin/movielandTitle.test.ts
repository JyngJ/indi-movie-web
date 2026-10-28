import { describe, expect, it } from 'vitest'
import { extractMovielandMovieTitle } from './crawler'

// 2026-10-28 무비랜드 상품 페이지 실측 — 영문상품명 칸 뒤가 '판매가'가 아니라 '월 렌탈 금액'이라
// 본문 정규식이 실패하고 og:title("I'M YOUR MAN - MOVIE LAND")이 제목으로 들어가 미매칭됐다.
const page = (koreanTitle: string, after: string) => `
<meta property="og:title" content="I&#039;M YOUR MAN - MOVIE LAND">
<h1>
  LOADING
  <span class="loading-dot-one"> .</span>
</h1>
<table><tbody>
  <tr><th scope="row"><span>상품명</span></th><td><span>I'M YOUR MAN</span></td></tr>
  <tr class=" xans-record-">
    <th scope="row"><span class="" style="font-size:12px;color:#4c290e;">영문상품명</span></th>
    <td><span class="" style="font-size:12px;color:#4c290e;">${koreanTitle}</span></td>
  </tr>
</tbody></table>
<div>${after}</div>`

describe('extractMovielandMovieTitle', () => {
  it('영문상품명 칸의 한글 제목을 읽는다 — 뒤 문구와 무관하게', () => {
    expect(extractMovielandMovieTitle(page('아임 유어 맨', '월 렌탈 금액'))).toBe('아임 유어 맨')
    expect(extractMovielandMovieTitle(page('애프터 양', '판매가 15,000원'))).toBe('애프터 양')
  })

  it('한글 제목이 없으면 og:title에서 사이트명 꼬리를 뗀다', () => {
    const html = `<meta property="og:title" content="AFTER YANG - MOVIE LAND"><h1>LOADING . . .</h1>`
    expect(extractMovielandMovieTitle(html)).toBe('AFTER YANG')
  })
})
