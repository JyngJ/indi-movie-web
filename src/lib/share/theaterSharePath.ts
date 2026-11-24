/**
 * 극장 공유 링크의 경로. 메신저 미리보기는 이 경로 페이지의 OG를 그대로 보여 준다.
 *
 * 지도 극장 시트는 `/map?theater=`를 공유했는데, `/map`의 OG는 고정값이라 카카오톡
 * 미리보기가 "독립영화관 지도 | 영화볼지도"로만 떴다 — 어느 극장인지 안 보였다(2026-11-24).
 * 극장 상세(`/films/theater/[id]`)와 회차 공유(`…/s/[showtimeId]`)는 극장·회차별 OG가 있다.
 * 쿼리로 싣지 않고 경로로 싣는 이유는 `films/theater/[id]/s/[showtimeId]/page.tsx` 주석 참고.
 */
export function theaterSharePath(theaterId: string, showtimeId?: string | null): string {
  const base = `/films/theater/${encodeURIComponent(theaterId)}`
  return showtimeId ? `${base}/s/${encodeURIComponent(showtimeId)}` : base
}
