/** 한 사람이 한 영화에 남긴 신호를 합친 값. user는 분석 도구의 익명 사람 식별자다. */
export interface Interaction {
  user: string
  movieId: string
  /** 신호 무게 합 (상세 조회 1 · 시간표 선택 2 · 예매 클릭 3 · 관심 등록 5) */
  weight: number
  /** 마지막 신호 시각 (ISO) */
  at: string
}

export type InteractionKind = 'view' | 'showtime' | 'booking' | 'favorite'
export const INTERACTION_WEIGHT: Record<InteractionKind, number> = { view: 1, showtime: 2, booking: 3, favorite: 5 }

/** 콘텐츠 유사도에 쓰는 영화 정보 */
export interface MovieFeatures {
  id: string
  directors: string[]
  genres: string[]
  nation: string | null
  year: number | null
}

export interface Neighbor { movieId: string; score: number }
/** 영화마다 비슷한 영화 목록 (점수 내림차순) */
export type NeighborTable = Map<string, Neighbor[]>
