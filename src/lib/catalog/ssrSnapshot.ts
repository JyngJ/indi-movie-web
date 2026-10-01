/**
 * SSR이 심은 첫 화면 데이터를 그대로 믿을지 정한다.
 *
 * 상세 페이지는 1시간 ISR이라, 캐시된 페이지 안의 데이터는 그만큼 묵을 수 있다.
 * 1시간 안이면 페이지 자체가 약속하는 신선도와 같으므로 다시 받지 않는다.
 * 그보다 오래됐으면 화면에는 먼저 그리고 마운트 직후 다시 받는다.
 * 공개 API의 CDN 캐시도 30분 + 묵은 응답 3시간이라, 1시간이 더 느슨한 기준은 아니다.
 */
export const SSR_SNAPSHOT_MAX_AGE_MS = 60 * 60 * 1000

/**
 * react-query `initialDataUpdatedAt`에 넣을 값.
 * 신선하면 지금 시각(→ staleTime 동안 다시 받지 않음), 아니면 0(→ 즉시 다시 받음).
 */
export function snapshotUpdatedAt(fetchedAt: number, now: number): number {
  return now - fetchedAt <= SSR_SNAPSHOT_MAX_AGE_MS ? now : 0
}
