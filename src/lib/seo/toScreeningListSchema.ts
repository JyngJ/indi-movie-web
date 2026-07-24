import type { ScreeningIndex } from './getScreeningIndex'

/**
 * 현재 상영작 목록을 schema.org ItemList JSON-LD로. 리스트형 페이지(/films, 지역)에서
 * 리치 결과 후보로 노출되도록 한다. 개별 영화의 상세 스키마(Movie/ScreeningEvent)는
 * /movie/[id]에서 이미 제공하므로 여기선 항목을 URL로만 참조한다.
 */
export function toScreeningListSchema(
  data: ScreeningIndex,
  baseUrl: string,
  name: string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: data.movies.length,
    itemListElement: data.movies.map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${baseUrl}/movie/${m.id}`,
      name: m.title,
    })),
  }
}

/**
 * 홈용 WebSite 스키마.
 *
 * SearchAction(사이트링크 검색창)은 넣지 않는다 — /search 라우트가 쿼리를 처리하지 않고
 * '/'로 리다이렉트만 하므로, 동작하지 않는 검색 엔드포인트를 선언하면 구글 가이드라인
 * 위반이다. 실제 검색 결과 URL이 생기면 그때 potentialAction을 추가한다.
 */
export function toWebSiteSchema(baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '영화볼지도',
    alternateName: '독립영화 상영시간표',
    url: `${baseUrl}/`,
  }
}
