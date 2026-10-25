// ─────────────────────────────────────────────
// 좌석 잔여율 판정 — 순수 도메인 규칙
// showtimes.seat_available / seat_total 스냅샷 기준
// ─────────────────────────────────────────────

/** 잔여 좌석 비율이 이 값 이하이면 '매진 임박(kind=low)' — store.ts 상영 kind 판정과 동일 기준 */
export const LOW_SEAT_RATIO_THRESHOLD = 0.15

/** 총 좌석을 모르면(0 이하) 잔여석도 모른다 — 0/0은 매진이 아니라 미수집 */
export function hasSeatInfo(seatTotal: number): boolean {
  return seatTotal > 0
}

/**
 * 크롤 스냅샷 기준 매진 여부.
 * 좌석을 안 주는 소스(KOFA·스크린샷 OCR·게시판 이미지 OCR)는 0/0으로 저장되는데,
 * 예전엔 잔여 0만 보고 매진으로 그려 예매할 수 있는 회차를 막았다(2026-10-25 실측 38회차).
 */
export function isSoldOut(seatAvailable: number, seatTotal: number): boolean {
  return hasSeatInfo(seatTotal) && seatAvailable <= 0
}

/**
 * 크롤 스냅샷 기준 매진 임박 여부.
 * - seat_total 미수집(0 이하)은 판정 불가 → false
 * - 이미 매진(seat_available ≤ 0)은 '임박'이 아니라 '매진' → false
 */
export function isAlmostSoldOut(seatAvailable: number, seatTotal: number): boolean {
  return seatTotal > 0 && seatAvailable > 0 && seatAvailable / seatTotal <= LOW_SEAT_RATIO_THRESHOLD
}
