/**
 * 공개 API의 CDN 캐시 수명.
 *
 * 상영 시간표는 하루 3번(01·07·13시), 잔여석은 3시간마다 바뀐다. 그런데 회차 API들이
 * 2분 캐시(s-maxage=120)였다. 사이트 트래픽이 시간당 수십 회 수준이라 2분 안에 같은 URL이
 * 다시 불릴 일이 드물어, 캐시가 거의 적중하지 않고 방문마다 함수가 새로 돌았다 —
 * 2026-09 Vercel Fluid Active CPU가 하루 9~10분씩(월 한도 4시간 초과) 사람 방문 수를
 * 따라 움직인 이유로 본다.
 *
 * 30분이면 잔여석 갱신 주기(3시간)보다 충분히 짧고, 만료 뒤에도 stale-while-revalidate로
 * 캐시를 먼저 내주고 뒤에서 갱신하므로 사용자가 함수를 기다리지 않는다.
 */
export const SHOWTIME_API_CACHE = 'public, s-maxage=1800, stale-while-revalidate=10800'
