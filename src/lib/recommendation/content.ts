import type { MovieFeatures } from './types'

/**
 * 영화 정보로 잰 유사도(0~1). 상영 기록이 쌓이지 않은 신작에 행동 기반 점수 대신 쓴다.
 * 감독이 같으면 가장 크게, 장르·국가·연대는 보조로 본다.
 */
const WEIGHT = { director: 0.6, genre: 0.25, nation: 0.1, era: 0.05 }

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const sa = new Set(a)
  const inter = b.filter(x => sa.has(x)).length
  return inter / (sa.size + new Set(b).size - inter)
}

export function contentSimilarity(a: MovieFeatures, b: MovieFeatures): number {
  if (a.id === b.id) return 0
  const director = a.directors.some(d => b.directors.includes(d)) ? 1 : 0
  const genre = jaccard(a.genres, b.genres)
  const nation = a.nation && a.nation === b.nation ? 1 : 0
  const era = a.year && b.year ? Math.max(0, 1 - Math.abs(a.year - b.year) / 20) : 0
  return WEIGHT.director * director + WEIGHT.genre * genre + WEIGHT.nation * nation + WEIGHT.era * era
}
