import { contentSimilarity } from './content'
import type { MovieFeatures, NeighborTable } from './types'

export interface HistoryItem { movieId: string; weight: number; at: string }
export interface RecommendInput {
  history: HistoryItem[]
  /** 추천해도 되는 영화(지금 상영 중) */
  candidates: string[]
  neighbors: NeighborTable
  features?: Map<string, MovieFeatures>
  now: Date
  /** 콘텐츠 점수 섞는 비율. 행동 이웃이 없는 후보는 콘텐츠 점수만 받는다 */
  contentWeight?: number
  /** 최근 신호 반감기(일) */
  halfLifeDays?: number
  /** 후보별 사전 점수(0~1, 예: 최근 인기). 개인 점수에 priorWeight만큼 더한다 */
  prior?: Map<string, number>
  priorWeight?: number
  limit?: number
}
export interface Recommendation { movieId: string; score: number; because: string | null }

/**
 * 본 영화마다 이웃 점수를 무게·최근성으로 곱해 더한다. 이미 본 영화는 빼고 상영 중인 영화만 남긴다.
 * because는 점수에 가장 크게 기여한 본 영화 — 화면에서 "○○을 본 사람들이" 문구를 만들 때 쓴다.
 */
export function recommend({ history, candidates, neighbors, features, now, contentWeight = 0.3, halfLifeDays = 30, prior, priorWeight = 0, limit = 10 }: RecommendInput): Recommendation[] {
  const seen = new Set(history.map(h => h.movieId))
  const allowed = new Set(candidates.filter(id => !seen.has(id)))
  const score = new Map<string, number>()
  const top = new Map<string, { from: string; v: number }>()
  const add = (to: string, from: string, v: number) => {
    if (!allowed.has(to) || v <= 0) return
    score.set(to, (score.get(to) ?? 0) + v)
    const t = top.get(to)
    if (!t || v > t.v) top.set(to, { from, v })
  }
  for (const h of history) {
    const ageDays = Math.max(0, (now.getTime() - new Date(h.at).getTime()) / 86400000)
    const w = Math.log1p(h.weight) * 0.5 ** (ageDays / halfLifeDays)
    for (const n of neighbors.get(h.movieId) ?? []) add(n.movieId, h.movieId, w * n.score)
    const source = features?.get(h.movieId)
    if (source && contentWeight > 0) {
      for (const id of allowed) {
        const f = features!.get(id)
        if (f) add(id, h.movieId, w * contentWeight * contentSimilarity(source, f))
      }
    }
  }
  if (prior && priorWeight > 0) {
    for (const id of allowed) {
      const p = prior.get(id) ?? 0
      if (p > 0) score.set(id, (score.get(id) ?? 0) + priorWeight * p)
    }
  }
  return [...score].map(([movieId, s]) => ({ movieId, score: s, because: top.get(movieId)?.from ?? null }))
    .sort((a, b) => b.score - a.score || a.movieId.localeCompare(b.movieId))
    .slice(0, limit)
}
