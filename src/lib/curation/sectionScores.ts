/**
 * 상영작 탭 섹션 점수 — 위치 영향을 걷어낸 클릭 비율.
 *
 * 왜 CTR을 그대로 안 쓰나 — 위에 있는 섹션일수록 많이 눌린다(2026-11-05, 30일: 0번 자리 25%,
 * 10번 자리 7% 안팎). 그대로 정렬하면 지금 위에 있는 섹션이 계속 위에 남는다.
 * 그래서 자리마다 기대 클릭률을 모든 섹션으로 구하고, 섹션의 실제 클릭을 그 기대값의 합으로 나눈다.
 * 1이면 그 자리 평균, 2면 두 배 잘 눌린 섹션이다. 노출이 적은 섹션은 1 쪽으로 당긴다.
 */
export interface SectionPositionStat {
  listId: string
  position: number
  /** 이 자리에서 섹션을 본 세션 수 */
  impressions: number
  /** 그중 섹션 안 영화를 누른 세션 수 */
  clicks: number
}
export interface SectionScore { listId: string; score: number; impressions: number; clicks: number; expectedClicks: number }

/** 기대 클릭 몇 개 분량만큼 1(평균)을 섞을지 */
export const SECTION_SCORE_PRIOR_CLICKS = 3
const MAX_POSITION = 20

export function computeSectionScores(stats: SectionPositionStat[], priorClicks = SECTION_SCORE_PRIOR_CLICKS): SectionScore[] {
  const clamp = (p: number) => Math.max(0, Math.min(MAX_POSITION, Math.round(p)))
  const byPos = new Map<number, { i: number; c: number }>()
  for (const s of stats) {
    const cur = byPos.get(clamp(s.position)) ?? { i: 0, c: 0 }
    cur.i += s.impressions; cur.c += s.clicks
    byPos.set(clamp(s.position), cur)
  }
  // 노출이 적은 자리는 가까운 자리 값을 빌린다 — 단조 감소를 강제하지 않고 이웃 평균으로 다듬는다.
  const rate = (p: number) => {
    let i = 0, c = 0
    for (let d = 0; i < 200 && d <= MAX_POSITION; d++) {
      for (const q of d === 0 ? [p] : [p - d, p + d]) { const v = byPos.get(q); if (v) { i += v.i; c += v.c } }
    }
    return i ? c / i : 0
  }
  const expected = new Map<number, number>()
  for (const p of byPos.keys()) expected.set(p, rate(p))

  const bySection = new Map<string, SectionScore>()
  for (const s of stats) {
    const cur = bySection.get(s.listId) ?? { listId: s.listId, score: 1, impressions: 0, clicks: 0, expectedClicks: 0 }
    cur.impressions += s.impressions
    cur.clicks += s.clicks
    cur.expectedClicks += s.impressions * (expected.get(clamp(s.position)) ?? 0)
    bySection.set(s.listId, cur)
  }
  for (const s of bySection.values()) s.score = (s.clicks + priorClicks) / (s.expectedClicks + priorClicks)
  return [...bySection.values()].sort((a, b) => b.score - a.score || a.listId.localeCompare(b.listId))
}
