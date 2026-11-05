/**
 * 상영작 탭 섹션 점수 계산 — 지난 30일 자리별 노출·클릭으로 위치 영향을 걷어낸 점수를 만든다.
 * 기본은 계산·출력만. --write가 있어야 Supabase(curation_section_score)에 쓴다.
 *   npm run curate:section-scores
 *   npm run curate:section-scores -- --write
 */
import { computeSectionScores } from '../../src/lib/curation/sectionScores'
import { fetchSectionPositionStats, replaceSectionScores } from '../../src/lib/curation/sectionScoreSources'

const DAYS = 30

async function main() {
  const computedAt = new Date().toISOString()
  const stats = await fetchSectionPositionStats(DAYS)
  const scores = computeSectionScores(stats)
  console.log(`[section-scores] ${DAYS}일 · 섹션 ${scores.length}개`)
  for (const s of scores) console.log(`${s.score.toFixed(2)}\t${s.listId}\t노출 ${s.impressions} · 클릭 ${s.clicks} · 기대 ${s.expectedClicks.toFixed(1)}`)
  if (!process.argv.includes('--write')) { console.log('[section-scores] 미리 보기 — 저장하려면 --write'); return }
  await replaceSectionScores(scores, computedAt)
  console.log('[section-scores] 저장했어요')
}
main().catch(error => { console.error('[section-scores] 점수를 만들지 못했어요', error instanceof Error ? error.message : error); process.exitCode = 1 })
