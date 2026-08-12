/**
 * BreadcrumbList 스키마 — 검색결과에 URL 대신 경로("영화볼지도 › 서울 › 서울아트시네마")가
 * 표시되고, 답변형 AI가 이 페이지가 사이트 어디에 속하는지 파악한다.
 * 지도 UI는 클라이언트 렌더라 크롤러가 사이트 구조를 링크만으로 추론하기 어려워 특히 필요하다.
 */
export interface Crumb {
  name: string
  /** 사이트 루트 기준 경로. 마지막 항목(현재 페이지)은 생략 가능 */
  path?: string
}

export function toBreadcrumbSchema(crumbs: Crumb[], baseUrl: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.path ? { item: `${baseUrl}${c.path}` } : {}),
    })),
  }
}
