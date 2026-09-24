import type { FestivalScreening } from '@/types/festival'

// ─────────────────────────────────────────────
// 영화제 상영 시간표 — 순수 함수만 둔다(React·Supabase 의존 없음).
// 회차 행 목록을 날짜 탭 / 상영관 필터 / 시간순 표로 접기 위한 계산.
// ─────────────────────────────────────────────

const DOW = ['일', '월', '화', '수', '목', '금', '토']

/**
 * 영화제 회기의 모든 날짜 — 회차가 아직 0개여도 탭은 서야 한다.
 * @param startDate ISO date "YYYY-MM-DD"
 * @param endDate ISO date "YYYY-MM-DD"
 */
export function buildFestivalDays(startDate: string, endDate: string): string[] {
  const out: string[] = []
  const end = Date.parse(`${endDate}T00:00:00Z`)
  let cursor = Date.parse(`${startDate}T00:00:00Z`)
  if (Number.isNaN(cursor) || Number.isNaN(end)) return out
  // 회기가 아무리 길어도 한 달을 넘지 않는다 — 잘못된 날짜 조합이 무한 루프로 가지 않게 막는다
  while (cursor <= end && out.length < 62) {
    out.push(new Date(cursor).toISOString().slice(0, 10))
    cursor += 86_400_000
  }
  return out
}

/**
 * 날짜 탭 라벨 — "10월 6일 (화)"
 * @param iso ISO date "YYYY-MM-DD"
 */
export function festivalDayLabel(iso: string): string {
  const [, month, day] = iso.split('-')
  const dow = DOW[new Date(`${iso}T12:00:00`).getDay()]
  return `${Number(month)}월 ${Number(day)}일 (${dow})`
}

/** 날짜 탭의 짧은 꼴 — 탭이 10개 넘게 늘어서므로 "10.6 화"로 줄인다 */
export function festivalDayShortLabel(iso: string): string {
  const [, month, day] = iso.split('-')
  const dow = DOW[new Date(`${iso}T12:00:00`).getDay()]
  return `${Number(month)}.${Number(day)} ${dow}`
}

/** "HH:MM:SS" / "HH:MM" 어느 쪽이 와도 "HH:MM"으로 — Postgres TIME은 초까지 실어 보낸다 */
export function normalizeTime(time: string): string {
  return time.slice(0, 5)
}

/**
 * 종료 시각 "HH:MM" — runtime을 모르면 null.
 * 자정을 넘기는 심야 상영(미드나잇 패션)은 다음 날 시각으로 그대로 넘어간다.
 */
export function screeningEndTime(startTime: string, runtimeMin: number | null): string | null {
  if (!runtimeMin || runtimeMin <= 0) return null
  const [h, m] = normalizeTime(startTime).split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  const total = (h * 60 + m + runtimeMin) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** 상영 시간대 표기 — "19:30 ~ 21:05". runtime이 없으면 시작 시각만. 표의 시간 열에 쓴다. */
export function formatScreeningTime(startTime: string, runtimeMin: number | null): string {
  const start = normalizeTime(startTime)
  const end = screeningEndTime(startTime, runtimeMin)
  return end ? `${start} ~ ${end}` : start
}

/**
 * 시작 시각을 이미 크게 보여주는 자리(모바일 카드)의 보조 줄 — "95분 · 21:05 종료".
 * 시작 시각을 한 번 더 쓰지 않는다.
 */
export function formatScreeningTail(startTime: string, runtimeMin: number | null): string | null {
  const end = screeningEndTime(startTime, runtimeMin)
  if (!end) return null
  return `${runtimeMin}분 · ${end} 종료`
}

/** 표 안에서 극장·관을 한 줄로 — "영화의전당 중극장" */
export function venueDisplayName(screening: Pick<FestivalScreening, 'venueLabel' | 'screenLabel'>): string {
  return screening.screenLabel ? `${screening.venueLabel} ${screening.screenLabel}` : screening.venueLabel
}

/** 상영관 필터 칩 목록 — 회차에 실제로 등장하는 극장만, 처음 등장한 순서를 유지한다 */
export function listScreeningVenues(screenings: FestivalScreening[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of screenings) {
    if (seen.has(s.venueLabel)) continue
    seen.add(s.venueLabel)
    out.push(s.venueLabel)
  }
  return out
}

/**
 * 표에 그릴 회차 추리기 — 날짜는 필수, 상영관은 선택.
 * 정렬은 시작 시각 → 극장 → 관 순. 같은 시각이 여러 극장에 흩어져도 표가 흔들리지 않는다.
 */
export function selectDayScreenings(
  screenings: FestivalScreening[],
  date: string,
  venueLabel?: string | null,
): FestivalScreening[] {
  return screenings
    .filter((s) => s.screeningDate === date && (!venueLabel || s.venueLabel === venueLabel))
    .sort((a, b) =>
      normalizeTime(a.startTime).localeCompare(normalizeTime(b.startTime))
      || a.venueLabel.localeCompare(b.venueLabel)
      || (a.screenLabel ?? '').localeCompare(b.screenLabel ?? ''),
    )
}

/** 날짜별 회차 수 — 탭에 "회차 없음"을 표시할지 판단한다 */
export function countScreeningsByDate(screenings: FestivalScreening[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const s of screenings) out[s.screeningDate] = (out[s.screeningDate] ?? 0) + 1
  return out
}

/**
 * 처음 열 때 보여줄 날짜 — 회기 중이면 오늘, 아니면 첫날.
 * 종료된 영화제도 첫날로 연다(마지막 날을 열면 "다 끝났다"만 보인다).
 */
export function defaultFestivalDay(days: string[], today: string): string | null {
  if (days.length === 0) return null
  return days.includes(today) ? today : days[0]
}
