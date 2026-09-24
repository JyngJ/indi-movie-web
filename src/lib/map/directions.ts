// ─────────────────────────────────────────────
// 길찾기 링크 — 순수 함수.
// 네이버 지도 앱 스킴을 먼저 열고, 앱이 없으면 웹 길찾기로 넘어간다(극장 시트·영화제 극장 지도 공용).
// ─────────────────────────────────────────────

export interface DirectionsTarget {
  name: string
  lat: number
  lng: number
}

/** app: 네이버 지도 앱(대중교통 길찾기) · web: 앱이 없을 때 여는 웹 길찾기 */
export function naverDirectionsUrls({ name, lat, lng }: DirectionsTarget): { app: string; web: string } {
  return {
    app: `nmap://route/public?dlat=${lat}&dlng=${lng}&dname=${encodeURIComponent(name)}&appname=kr.indi.movie`,
    web: `https://map.naver.com/v5/directions/-/-/-/transit?c=${lng},${lat},15,0,0,0,dh`,
  }
}
