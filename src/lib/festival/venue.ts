// ─────────────────────────────────────────────
// 영화제 상영관 성격 판별 — 순수 함수.
//
// 영화볼지도는 독립·예술영화관만 크롤한다(crawl_sources에 멀티플렉스 체인이 없다).
// 그런데 부산국제영화제처럼 CGV·롯데시네마·메가박스를 상영관으로 쓰는 영화제가 있어서,
// 영화제 상영관 목록엔 "우리가 회차를 모으지 않는 극장"이 섞인다.
// 그 극장을 눌렀을 때 텅 빈 시간표를 보여주는 대신, 어디서 확인해야 하는지 알려주려고 판별한다.
// ─────────────────────────────────────────────

const MULTIPLEX_BRANDS = ['CGV', '롯데시네마', '메가박스']

/** 멀티플렉스 체인 지점인가 — 회차를 우리가 모으지 않는 극장 */
export function isMultiplexVenue(theaterName: string): boolean {
  const normalized = theaterName.replace(/\s+/g, '').toUpperCase()
  return MULTIPLEX_BRANDS.some((brand) => normalized.includes(brand.replace(/\s+/g, '').toUpperCase()))
}

/** 상영관 카드에 붙일 안내 — 왜 여기엔 회차가 없는지 */
export function multiplexNotice(theaterName: string): string {
  return `${theaterName} 회차는 모으지 않아요 — 해당 극장 상영 시간표에서 확인해 주세요`
}
