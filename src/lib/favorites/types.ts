/** 관심 도메인 — 프레임워크 무관 */

export type FavoriteItemType = 'movie' | 'theater'

export interface FavoriteKey {
  type: FavoriteItemType
  id: string
}

export interface Favorite extends FavoriteKey {
  createdAt: string
}

/** Set 조회용 키 문자열 */
export function favoriteKey(type: FavoriteItemType, id: string): string {
  return `${type}:${id}`
}

/** 목록 → 조회 Set (순수) */
export function toFavoriteSet(list: readonly FavoriteKey[]): Set<string> {
  return new Set(list.map((f) => favoriteKey(f.type, f.id)))
}
