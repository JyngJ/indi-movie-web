/**
 * 추천 모델 오프라인 평가 — 기준일 이전 기록으로 학습하고, 기준일 이후 처음 본 영화를 맞히는지 잰다.
 * 후보는 평가 기간에 상영 일정이 있던 영화로 제한한다(실제 화면 조건).
 *   npm run reco:evaluate -- --days 120 --test-days 14
 */
import * as fs from 'fs'
import { trainEase, easeNeighbors, filterBySupport } from '../../src/lib/recommendation/ease'
import { recommend, type HistoryItem } from '../../src/lib/recommendation/recommend'
import { ndcgAt, recallAt } from '../../src/lib/recommendation/metrics'
import { fetchDailySignals, fetchMovieFeatures, fetchScreeningMovieIds, type DailySignal } from '../../src/lib/recommendation/sources'
import { INTERACTION_WEIGHT, type Interaction, type NeighborTable } from '../../src/lib/recommendation/types'

const arg = (name: string, fallback: number) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? Number(process.argv[i + 1]) : fallback }
const days = arg('days', 120), testDays = arg('test-days', 14), K = arg('k', 10)
const cache = process.argv.includes('--cache') ? process.argv[process.argv.indexOf('--cache') + 1] : null

const kstDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(d)
function aggregate(rows: DailySignal[]): Interaction[] {
  const m = new Map<string, Interaction>()
  for (const r of rows) {
    const key = `${r.user}|${r.movieId}`
    const w = INTERACTION_WEIGHT[r.kind] * r.count
    const at = `${r.day}T12:00:00+09:00`
    const cur = m.get(key)
    if (cur) { cur.weight += w; if (at > cur.at) cur.at = at } else m.set(key, { user: r.user, movieId: r.movieId, weight: w, at })
  }
  return [...m.values()]
}
function cooccurrenceCosine(rows: Interaction[], k: number): NeighborTable {
  const byUser = new Map<string, string[]>(), deg = new Map<string, number>()
  for (const r of rows) { (byUser.get(r.user) ?? byUser.set(r.user, []).get(r.user)!).push(r.movieId); deg.set(r.movieId, (deg.get(r.movieId) ?? 0) + 1) }
  const co = new Map<string, Map<string, number>>()
  for (const items of byUser.values()) for (const a of items) for (const b of items) if (a !== b) {
    const row = co.get(a) ?? co.set(a, new Map()).get(a)!
    row.set(b, (row.get(b) ?? 0) + 1)
  }
  const t: NeighborTable = new Map()
  for (const [a, row] of co) t.set(a, [...row].map(([b, c]) => ({ movieId: b, score: c / Math.sqrt(deg.get(a)! * deg.get(b)!) })).sort((x, y) => y.score - x.score).slice(0, k))
  return t
}

type Sums = Map<string, { recall: number; ndcg: number; perUser: number[] }>

async function evaluateSplit(signals: DailySignal[], now: Date, splitDaysAgo: number, features: Awaited<ReturnType<typeof fetchMovieFeatures>>, sums: Sums) {
  const split = kstDay(new Date(now.getTime() - splitDaysAgo * 86400000))
  const testEnd = kstDay(new Date(now.getTime() - (splitDaysAgo - testDays) * 86400000))
  const train = aggregate(signals.filter(s => s.day < split))
  const testRows = signals.filter(s => s.day >= split && s.day < testEnd)
  // 지난 상영 일정은 지워져 남지 않는다. 일정이 없는 옛 구간은 그 기간에 3명 이상 본 영화를 상영작으로 본다.
  let candidates = (await fetchScreeningMovieIds(split, testEnd)).filter(id => features.has(id))
  if (!candidates.length) {
    const viewers = new Map<string, Set<string>>()
    for (const r of testRows) (viewers.get(r.movieId) ?? viewers.set(r.movieId, new Set()).get(r.movieId)!).add(r.user)
    candidates = [...viewers].filter(([id, u]) => u.size >= 3 && features.has(id)).map(([id]) => id)
  }
  const candidateSet = new Set(candidates)

  const history = new Map<string, HistoryItem[]>()
  for (const r of train) (history.get(r.user) ?? history.set(r.user, []).get(r.user)!).push({ movieId: r.movieId, weight: r.weight, at: r.at })
  const relevant = new Map<string, Set<string>>()
  for (const r of testRows) {
    if (!history.has(r.user) || !candidateSet.has(r.movieId)) continue
    if (history.get(r.user)!.some(h => h.movieId === r.movieId)) continue
    ;(relevant.get(r.user) ?? relevant.set(r.user, new Set()).get(r.user)!).add(r.movieId)
  }
  // 인기순: 기준일 직전 14일 동안 본 사람 수
  const recentFrom = kstDay(new Date(new Date(`${split}T00:00:00+09:00`).getTime() - 14 * 86400000))
  const pop = new Map<string, Set<string>>()
  for (const s of signals) if (s.day < split && s.day >= recentFrom) (pop.get(s.movieId) ?? pop.set(s.movieId, new Set()).get(s.movieId)!).add(s.user)
  const popRank = candidates.slice().sort((a, b) => (pop.get(b)?.size ?? 0) - (pop.get(a)?.size ?? 0) || a.localeCompare(b))
  const maxPop = Math.max(1, ...candidates.map(id => pop.get(id)?.size ?? 0))
  const prior = new Map(candidates.map(id => [id, (pop.get(id)?.size ?? 0) / maxPop]))

  const splitDate = new Date(`${split}T00:00:00+09:00`)
  const users = [...relevant.keys()]
  console.log(`기준일 ${split}~${testEnd} · 학습 ${train.length}쌍 · 평가 ${users.length}명 · 후보 ${candidates.length}편`)

  const fill = (ranked: string[], seen: Set<string>) => {
    const out = ranked.filter(id => !seen.has(id))
    const s = new Set(out)
    for (const id of popRank) { if (out.length >= K) break; if (!s.has(id) && !seen.has(id)) out.push(id) }
    return out
  }
  const models: Record<string, (u: string) => string[]> = {
    '인기순': u => fill([], new Set(history.get(u)!.map(h => h.movieId))),
  }
  const withNeighbors = (name: string, table: NeighborTable, contentWeight: number, priorWeight = 0) => {
    models[name] = u => {
      const h = history.get(u)!
      return fill(recommend({ history: h, candidates, neighbors: table, features, now: splitDate, contentWeight, prior, priorWeight, limit: K }).map(r => r.movieId), new Set(h.map(x => x.movieId)))
    }
  }
  withNeighbors('콘텐츠만', new Map(), 1)
  withNeighbors('함께 본 횟수(cosine)', cooccurrenceCosine(train, 50), 0)
  withNeighbors('함께 본 횟수 + 콘텐츠 + 인기', cooccurrenceCosine(train, 50), 0.05, 0.1)
  {
    const base = easeNeighbors(trainEase(train, { lambda: 200, minUsersPerItem: 2 }), 50)
    for (const co of [2, 3]) withNeighbors(`λ=200 · 함께 본 ${co}명 이상 + 콘텐츠 + 인기 0.05`, filterBySupport(base, train, co), 0.05, 0.05)
  }
  for (const lambda of [50, 200, 500]) {
    const table = easeNeighbors(trainEase(train, { lambda, minUsersPerItem: 2 }), 50)
    withNeighbors(`EASE λ=${lambda}`, table, 0)
    withNeighbors(`EASE λ=${lambda} + 콘텐츠`, table, 0.05)
    for (const pw of [0.05, 0.1, 0.2]) withNeighbors(`EASE λ=${lambda} + 콘텐츠 + 인기 ${pw}`, table, 0.05, pw)
  }
  for (const [name, fn] of Object.entries(models)) {
    const cur = sums.get(name) ?? { recall: 0, ndcg: 0, perUser: [] }
    for (const u of users) { const ranked = fn(u); const r = recallAt(ranked, relevant.get(u)!, K); cur.recall += r; cur.ndcg += ndcgAt(ranked, relevant.get(u)!, K); cur.perUser.push(r) }
    sums.set(name, cur)
  }
  return users.length
}

async function main() {
  const now = new Date()
  const signals: DailySignal[] = cache && fs.existsSync(cache) ? JSON.parse(fs.readFileSync(cache, 'utf8')) : await fetchDailySignals(days)
  if (cache && !fs.existsSync(cache)) fs.writeFileSync(cache, JSON.stringify(signals))
  const features = await fetchMovieFeatures([...new Set(signals.map(s => s.movieId))])
  // 겹치지 않는 평가 구간 여러 개 — 기준일을 testDays씩 뒤로 민다.
  const sums: Sums = new Map()
  let total = 0
  for (let ago = testDays; ago <= testDays * arg('splits', 4); ago += testDays) total += await evaluateSplit(signals, now, ago, features, sums)
  console.log(`\n평가 ${total}명 합산 · 모델 | recall@${K} | ndcg@${K}`)
  for (const [name, s] of sums) console.log(`${name} | ${(s.recall / total).toFixed(4)} | ${(s.ndcg / total).toFixed(4)}`)
  // 인기순 대비 recall 차이의 95% 구간 (같은 사람끼리 짝지은 부트스트랩)
  const base = sums.get('인기순')!.perUser
  let seed = 7
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
  console.log('\n인기순 대비 recall 차이 (95% 구간)')
  for (const [name, s] of sums) {
    if (name === '인기순') continue
    const diffs = s.perUser.map((v, i) => v - base[i])
    const boots: number[] = []
    for (let b = 0; b < 2000; b++) { let t = 0; for (let i = 0; i < diffs.length; i++) t += diffs[Math.floor(rand() * diffs.length)]; boots.push(t / diffs.length) }
    boots.sort((a, b) => a - b)
    const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length
    console.log(`${name} | ${mean >= 0 ? '+' : ''}${mean.toFixed(3)} [${boots[50].toFixed(3)}, ${boots[1949].toFixed(3)}]`)
  }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
