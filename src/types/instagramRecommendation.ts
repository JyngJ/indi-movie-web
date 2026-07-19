import type { Movie } from './api'
import type { Festival } from './festival'

// ─────────────────────────────────────────────
// 인스타그램 추천 카드 (instagram_recommendations)
// docs/SUPABASE_INSTAGRAM_RECS.sql / docs/DB.md 참고
// 상태(상영중/진행중 등)와 우측 포스터·배너는 저장 안 함 — movie/festival 조인해 런타임 계산
// ─────────────────────────────────────────────

export type InstagramRecommendationTargetType = 'movie' | 'festival'

export interface InstagramRecommendation {
  id: string
  targetType: InstagramRecommendationTargetType
  /** targetType이 'movie'일 때만 값 — 연결 끊기면(크롤 데이터 삭제 등) null */
  movieId: string | null
  movie: Movie | null
  /** targetType이 'festival'일 때만 값 — 연결 끊기면 null */
  festivalId: string | null
  festival: Festival | null
  /** movie/festival 조인 실패 시 폴백 제목 */
  titleSnapshot: string
  /** 카드뉴스 첫 장 이미지 — 왼쪽 배경, 오른쪽으로 opacity fade */
  cardImageUrl: string
  instagramUrl: string | null
  /** ISO date "YYYY-MM-DD" — 정렬 보조 */
  publishedAt: string | null
  isActive: boolean
  sortOrder: number
}
