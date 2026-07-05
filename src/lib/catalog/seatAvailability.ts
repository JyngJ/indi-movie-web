// ─────────────────────────────────────────────
// 좌석 잔여율 판정 — 순수 도메인 규칙
// showtimes.seat_available / seat_total 스냅샷 기준
// ─────────────────────────────────────────────

/** 잔여 좌석 비율이 이 값 이하이면 '매진 임박(kind=low)' — store.ts 상영 kind 판정과 동일 기준 */
export const LOW_SEAT_RATIO_THRESHOLD = 0.15

/**
 * 크롤 스냅샷 기준 매진 임박 여부.
 * - seat_total 미수집(0 이하)은 판정 불가 → false
 * - 이미 매진(seat_available ≤ 0)은 '임박'이 아니라 '매진' → false
 */
export function isAlmostSoldOut(seatAvailable: number, seatTotal: number): boolean {
  return seatTotal > 0 && seatAvailable > 0 && seatAvailable / seatTotal <= LOW_SEAT_RATIO_THRESHOLD
}
