/**
 * 추천 이웃 표 만들기 — PostHog 행동 기록으로 EASE를 학습해 영화마다 비슷한 영화를 저장한다.
 * 기본은 계산·요약만 한다. --write가 있어야 Supabase에 쓴다.
 *   npm run reco:build            # 미리 보기
 *   npm run reco:build -- --write # 저장
 */
import { RECOMMENDATION_MODEL as M } from '../../src/lib/recommendation/config'
import { easeNeighbors, filterBySupport, trainEase } from '../../src/lib/recommendation/ease'
import { replaceNeighbors } from '../../src/lib/recommendation/neighborRepository'
import { fetchDailySignals } from '../../src/lib/recommendation/sources'
import { INTERACTION_WEIGHT, type Interaction } from '../../src/lib/recommendation/types'

async function main() {
  const startedAt = new Date()
  const signals = await fetchDailySignals(M.trainingDays)
  const pairs = new Map<string, Interaction>()
  for (const s of signals) {
    const key = `${s.user}|${s.movieId}`
    const cur = pairs.get(key) ?? pairs.set(key, { user: s.user, movieId: s.movieId, weight: 0, at: s.day }).get(key)!
    cur.weight += INTERACTION_WEIGHT[s.kind] * s.count
  }
  const interactions = [...pairs.values()]
  const model = trainEase(interactions, { lambda: M.lambda, minUsersPerItem: M.minUsersPerItem })
  const table = filterBySupport(easeNeighbors(model, M.neighborsPerMovie), interactions, M.minCoUsers)
  const neighborCount = [...table.values()].reduce((n, l) => n + l.length, 0)
  console.log(`[reco] 신호 ${signals.length}행 · 사람×영화 ${interactions.length}쌍 · 학습 영화 ${model.items.length}편 · 이웃 있는 영화 ${table.size}편 · 이웃 ${neighborCount}개 · ${Date.now() - startedAt.getTime()}ms`)
  if (!process.argv.includes('--write')) { console.log('[reco] 미리 보기 — 저장하려면 --write'); return }
  const written = await replaceNeighbors(table, M.version, startedAt.toISOString())
  console.log(`[reco] ${M.version} ${written}행 저장`)
}
main().catch(error => { console.error('[reco] 이웃 표를 만들지 못했어요', error instanceof Error ? error.message : error); process.exitCode = 1 })
