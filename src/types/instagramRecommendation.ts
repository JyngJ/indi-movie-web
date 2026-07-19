import type { Movie } from './api'
import type { Festival } from './festival'

// ─────────────────────────────────────────────
// 인스타그램 추천 카드 (instagram_recommendations + instagram_recommendation_movies)
// docs/SUPABASE_INSTAGRAM_RECS.sql / docs/DB.md 참고
// 상태(상영중/진행중 등)와 우측 포스터·배너는 저장 안 함 — movie/festival 조인해 런타임 계산
// ─────────────────────────────────────────────

export type InstagramRecommendationTargetType = 'movie' | 'festival'

export interface InstagramRecommendationMovie {
  id: string
  /** 연결 끊기면(크롤 데이터 삭제 등) null */
  movieId: string | null
  movie: Movie | null
  /** movie 조인 실패 시 폴백 제목 */
  titleSnapshot: string
  sortOrder: number
}

export interface InstagramRecommendation {
  id: string
  targetType: InstagramRecommendationTargetType
  /** targetType이 'movie'일 때만 값 — 1편 이상. 카드뉴스 하나가 여러 편을 소개하는 경우 포함 */
  movies: InstagramRecommendationMovie[]
  /** targetType이 'festival'일 때만 값 — 연결 끊기면 null */
  festivalId: string | null
  festival: Festival | null
  /** movie/festival 조인 실패 시, 또는 카드 대표 타이틀(여러 편이면 상영전 이름 등) */
  titleSnapshot: string
  /** 카드뉴스 첫 장 이미지 — 왼쪽 배경, 오른쪽으로 opacity fade */
  cardImageUrl: string
  instagramUrl: string | null
  /** ISO date "YYYY-MM-DD" — 정렬 보조 */
  publishedAt: string | null
  /** ISO date "YYYY-MM-DD" — 노출 종료일(포함). null이면 무기한 */
  displayUntil: string | null
  isActive: boolean
  sortOrder: number
}
