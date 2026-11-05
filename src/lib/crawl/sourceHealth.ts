// ================================
// 조용히 멈춘 수집처 찾기 (순수 함수)
// ================================

/**
 * 2026-11 동리시네마: 수집처 두 개가 매일 "완료"로 끝났지만 6월 24일 이후 회차가 0건이었다.
 * 하나는 디스코드 /schedule로 시간표 이미지를 올려야 하는 수동 OCR이었고, 업로드가 끊긴 걸 아무도 몰랐다.
 * 그동안 극장 페이지는 비어 있었고 검색 유입은 주 63 → 18로 줄었다.
 *
 * 실패(error)는 이미 알림이 가지만 "성공했는데 0건"은 어디에도 안 잡혔다. 그걸 하루 한 번 모아 알린다.
 * 사람이 보는 결과는 극장 페이지라, 그 극장에 예정된 상영이 남아 있으면 알리지 않는다
 * (다른 수집처가 채우고 있거나 아직 회차가 남아 있으면 급하지 않다).
 */

export interface SourceRunSnapshot {
  startedAt: string
  createdCount: number
  status: string
}

export interface SourceHealthInput {
  sourceId: string
  sourceName: string
  parser: string
  /** 극장 페이지 id — 없으면 판정하지 않는다 */
  theaterId: string | null
  /** 최근 순. 좌석 갱신 실행은 빼고 넘긴다 */
  runs: SourceRunSnapshot[]
  /** 오늘 이후 회차 중 검수 대기(needs_review)로 남은 수 */
  pendingReviewUpcoming?: number
}

export type StaleKind = 'zero-streak' | 'manual-stale' | 'pending-review'

export interface StaleSourceFinding {
  sourceId: string
  sourceName: string
  kind: StaleKind
  /** 마지막으로 회차를 가져온 날로부터 지난 날 수 — 기록이 없으면 null */
  daysSinceLastHit: number | null
  /** pending-review일 때 검수 대기 회차 수 */
  pendingCount?: number
}

/** 자동 수집처: 최근 이만큼 연달아 0건(실패 포함)이면 알린다 — 하루 한 번 돌므로 3일 */
export const ZERO_STREAK_RUNS = 3
/** 수동(디스코드 /schedule) 수집처: 마지막 업로드가 이만큼 지나면 알린다 */
export const MANUAL_STALE_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

export function isManualParser(parser: string) {
  return parser === 'ocr'
}

export function findStaleSources(
  sources: readonly SourceHealthInput[],
  upcomingByTheater: ReadonlyMap<string, number>,
  now: Date,
): StaleSourceFinding[] {
  const findings: StaleSourceFinding[] = []
  for (const s of sources) {
    if (!s.theaterId) continue
    if ((upcomingByTheater.get(s.theaterId) ?? 0) > 0) continue

    const lastHit = s.runs.find((r) => r.status === 'completed' && r.createdCount > 0)
    const daysSinceLastHit = lastHit ? Math.floor((now.getTime() - new Date(lastHit.startedAt).getTime()) / DAY_MS) : null

    // 2026-11 tinyticket 5곳·영화의전당: 수집·매칭은 매일 됐는데 신뢰도가 자동 승인 문턱 아래라
    // 회차가 전부 검수 대기에 쌓였다. 새 회차가 계속 들어와 0건 연속에도 안 걸려 반년 가까이 몰랐다.
    if ((s.pendingReviewUpcoming ?? 0) > 0) {
      findings.push({ sourceId: s.sourceId, sourceName: s.sourceName, kind: 'pending-review', daysSinceLastHit, pendingCount: s.pendingReviewUpcoming })
      continue
    }

    if (isManualParser(s.parser)) {
      if (daysSinceLastHit === null || daysSinceLastHit >= MANUAL_STALE_DAYS) {
        findings.push({ sourceId: s.sourceId, sourceName: s.sourceName, kind: 'manual-stale', daysSinceLastHit })
      }
      continue
    }

    const recent = s.runs.slice(0, ZERO_STREAK_RUNS)
    if (recent.length === ZERO_STREAK_RUNS && recent.every((r) => r.createdCount === 0)) {
      findings.push({ sourceId: s.sourceId, sourceName: s.sourceName, kind: 'zero-streak', daysSinceLastHit })
    }
  }
  return findings.sort((a, b) => (b.daysSinceLastHit ?? Infinity) - (a.daysSinceLastHit ?? Infinity))
}

/** 디스코드 한 줄 */
export function formatStaleFinding(f: StaleSourceFinding): string {
  if (f.kind === 'pending-review') {
    return `• **${f.sourceName}** — 수집한 회차 ${f.pendingCount}건이 검수 대기라 극장 페이지에 안 보여요 · 검수에서 승인하거나 수집처 신뢰도를 확인해 주세요`
  }
  const since = f.daysSinceLastHit === null ? '최근 2주 수집 기록 없음' : `마지막 수집 ${f.daysSinceLastHit}일 전`
  return f.kind === 'manual-stale'
    ? `• **${f.sourceName}** — 수동 업로드 끊김(${since}) · 디스코드 /schedule로 시간표를 올리거나 자동 수집처를 찾아 주세요`
    : `• **${f.sourceName}** — ${ZERO_STREAK_RUNS}회 연속 0건(${since}) · 사이트 구조가 바뀌었거나 주소가 옮겨졌을 수 있어요`
}
