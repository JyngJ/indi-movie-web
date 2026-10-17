/**
 * SSR이 심은 첫 화면 데이터를 그대로 믿을지 정한다.
 *
 * 상세 페이지는 6시간 ISR이라(2026-10-18, ISR Writes 한도 대응), 캐시된 페이지 안의 데이터는 그만큼 묵을 수 있다.
 * 페이지 주기와 같은 6시간 안이면 다시 받지 않는다 — 1시간으로 두면 페이지를 늘린 만큼 브라우저가
 * 공개 API를 더 불러 CDN 요청(Hobby 한도 근접)과 함수 실행이 늘어난다.
 * 상영 변경은 크롤 후 태그 무효화로 페이지가 새로 그려지고, 잔여석은 좌석 크롤(하루 3번) 주기라
 * 6시간 지연이 크롤 간격과 같은 수준이다. 그보다 오래됐으면 화면에는 먼저 그리고 마운트 직후 다시 받는다.
 */
export const SSR_SNAPSHOT_MAX_AGE_MS = 6 * 60 * 60 * 1000

/**
 * react-query `initialDataUpdatedAt`에 넣을 값.
 * 신선하면 지금 시각(→ staleTime 동안 다시 받지 않음), 아니면 0(→ 즉시 다시 받음).
 */
export function snapshotUpdatedAt(fetchedAt: number, now: number): number {
  return now - fetchedAt <= SSR_SNAPSHOT_MAX_AGE_MS ? now : 0
}
