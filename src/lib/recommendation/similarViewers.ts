import { RECOMMENDATION_MODEL as M } from './config'
import { recommend, type HistoryItem } from './recommend'
import { INTERACTION_WEIGHT, type MovieFeatures, type NeighborTable } from './types'

export interface SimilarViewersInput {
  /** 최근 본 영화 (최신순). viewedAt이 없으면 지금 본 것으로 친다 */
  recent: Array<{ id: string; viewedAt?: number }>
  favoriteMovieIds: string[]
  neighbors: NeighborTable
  movies: Array<{ id: string; director: string[]; genre: string[]; nation?: string; year: number }>
  activeMovieIds: ReadonlySet<string>
  /** 최근 인기 순위 (높은 순). 개인 점수에 조금 섞는다 */
  popular: Array<{ movieId: string }>
  now: Date
  limit?: number
}
export interface SimilarViewersPick { movieIds: string[]; becauseMovieId: string | null }

export const SIMILAR_VIEWERS_MIN_MOVIES = 3

/**
 * "취향이 비슷한 관객이 본 영화" — 최근 본 영화·관심 영화의 행동 이웃(EASE) + 콘텐츠 + 인기.
 * 행동 이웃이 하나도 없으면 비운다 — 콘텐츠만으로 채우면 "이런 작품은 어때요"와 같은 섹션이 된다.
 */
export function pickSimilarViewersMovies(input: SimilarViewersInput): SimilarViewersPick {
  const { recent, favoriteMovieIds, neighbors, movies, activeMovieIds, popular, now, limit = 10 } = input
  const history = new Map<string, HistoryItem>()
  for (const r of recent) history.set(r.id, { movieId: r.id, weight: INTERACTION_WEIGHT.view, at: new Date(r.viewedAt ?? now.getTime()).toISOString() })
  for (const id of favoriteMovieIds) {
    const cur = history.get(id)
    history.set(id, { movieId: id, weight: (cur?.weight ?? 0) + INTERACTION_WEIGHT.favorite, at: cur?.at ?? now.toISOString() })
  }
  const items = [...history.values()]
  if (!items.some(h => (neighbors.get(h.movieId)?.length ?? 0) > 0)) return { movieIds: [], becauseMovieId: null }

  const features = new Map<string, MovieFeatures>(movies.map(m => [m.id, { id: m.id, directors: m.director, genres: m.genre, nation: m.nation ?? null, year: m.year || null }]))
  const candidates = movies.filter(m => activeMovieIds.has(m.id)).map(m => m.id)
  const prior = new Map(popular.map((p, i) => [p.movieId, 1 - i / Math.max(1, popular.length)]))
  const picks = recommend({ history: items, candidates, neighbors, features, now, contentWeight: M.contentWeight, prior, priorWeight: M.priorWeight, limit })
  // 행동 이웃에서 온 추천이 하나라도 있어야 이 섹션의 의미가 있다.
  const behavioral = new Set(items.flatMap(h => neighbors.get(h.movieId)?.map(n => n.movieId) ?? []))
  if (!picks.some(p => behavioral.has(p.movieId)) || picks.length < SIMILAR_VIEWERS_MIN_MOVIES) return { movieIds: [], becauseMovieId: null }
  const counts = new Map<string, number>()
  for (const p of picks) if (p.because) counts.set(p.because, (counts.get(p.because) ?? 0) + 1)
  const becauseMovieId = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return { movieIds: picks.map(p => p.movieId), becauseMovieId }
}
