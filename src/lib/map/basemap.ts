/**
 * CARTO 래스터 베이스맵 타일 주소.
 *
 * 2026-08부터 CARTO가 키 없는 요청을 차단하는 대신 타일 이미지에
 * "API KEY REQUIRED" 워터마크를 구워서 내보낸다(HTTP 200이라 실패로 안 잡힌다).
 * 키는 무료이고 월 500만 요청까지 커버한다 — https://carto.com/basemaps/apikey/
 *
 * CARTO는 래스터를 벡터로 대체하는 중이고 래스터 데이터 갱신 중단을 검토한다고
 * 밝혔다. 타일 주소를 여기 한 곳에 모아둔 건 그때 공급자를 갈아끼우기 위해서다.
 */

const CARTO_HOST = 'basemaps.cartocdn.com'

const CARTO_STYLE = {
  light: 'rastertiles/voyager',
  dark: 'dark_all',
} as const

export type BasemapTheme = keyof typeof CARTO_STYLE

function keyQuery(): string {
  const key = process.env.NEXT_PUBLIC_CARTO_API_KEY
  return key ? `?key=${encodeURIComponent(key)}` : ''
}

/**
 * Leaflet TileLayer용 템플릿. `{z}` `{x}` `{y}` `{r}` 치환은 Leaflet이 한다.
 * 키 쿼리는 치환 토큰 뒤에 붙어야 해서 마지막에 이어 붙인다.
 */
export function cartoTileTemplate(theme: BasemapTheme): string {
  return `https://${CARTO_HOST}/${CARTO_STYLE[theme]}/{z}/{x}/{y}{r}.png${keyQuery()}`
}

/** 좌표를 미리 아는 정적 타일(온보딩 일러스트 배경)용. */
export function cartoTileUrl(theme: BasemapTheme, z: number, x: number, y: number): string {
  return `https://${CARTO_HOST}/${CARTO_STYLE[theme]}/${z}/${x}/${y}.png${keyQuery()}`
}

export const CARTO_ATTRIBUTION = '&copy; OpenStreetMap contributors &copy; CARTO'
