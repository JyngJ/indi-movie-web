import type { Favorite, FavoriteItemType } from './types'

/** 관심 리포지토리 경계. 구현: supabaseFavoritesRepository.ts (브라우저, RLS로 본인 행만) */
export interface FavoritesRepository {
  /** 현재 사용자의 전체 관심 목록 */
  list(): Promise<Favorite[]>
  add(type: FavoriteItemType, id: string): Promise<void>
  remove(type: FavoriteItemType, id: string): Promise<void>
}
