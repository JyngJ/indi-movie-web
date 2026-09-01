import type { TheaterPosterMovie } from '@/lib/map/posterLogic'

/**
 * 지도 큐레이션 "관심 작품 상영 중" 섹션의 구성 규칙.
 *
 * 두 가지를 정한다:
 *   1) 어떤 영화가 이 섹션에 들어오는가 — 관심 영화이거나 관심 감독의 작품이면서 지금 상영 중
 *   2) 각 항목의 하트가 무엇을 가리키는가 — 들어온 이유(영화/감독)로 고정
 *
 * **한 번 들어온 항목은 화면을 떠날 때까지 빠지지 않는다.** 관심을 해제하는 순간 목록에서
 * 사라지면 잘못 눌렀을 때 되돌릴 자리가 없어진다. 해제는 하트 모양으로만 보이고, 자리는
 * 남는다. 다시 들어오면 그때의 관심 목록으로 새로 그리므로 해제가 그대로 반영된다.
 *
 * sticky는 호출부(화면)가 들고 있다가 그대로 넘긴다 — 이 함수는 그 위에 새로 들어온 항목만
 * 얹어 돌려준다.
 */

export interface FavoriteTarget {
  type: 'movie' | 'director'
  id: string
  label: string
}

export interface FavoriteScreeningItem {
  movieId: string
  /** 이 항목이 섹션에 들어온 이유 — 하트의 대상 */
  target: FavoriteTarget
  /** 상영 중인 극장 이름, 중복 없이 등장 순서대로 */
  theaterNames: string[]
}

export interface FavoriteEntry {
  type: string
  id: string
}

export interface TheaterLike {
  id: string
  name: string
}

export function collectFavoriteScreenings({
  favorites,
  theaters,
  postersByTheater,
  sticky,
}: {
  favorites: FavoriteEntry[]
  theaters: TheaterLike[]
  postersByTheater: Map<string, TheaterPosterMovie[]>
  /** 이미 섹션에 들어와 있던 항목 — 관심이 해제됐어도 자리를 지킨다 */
  sticky: ReadonlyMap<string, FavoriteTarget>
}): { items: FavoriteScreeningItem[]; sticky: Map<string, FavoriteTarget> } {
  const favMovieIds = new Set(favorites.filter((f) => f.type === 'movie').map((f) => f.id))
  const favDirectors = new Set(favorites.filter((f) => f.type === 'director').map((f) => f.id))
  const nextSticky = new Map(sticky)

  if (favMovieIds.size === 0 && favDirectors.size === 0 && nextSticky.size === 0) {
    return { items: [], sticky: nextSticky }
  }

  const theaterNamesByMovie = new Map<string, string[]>()

  for (const theater of theaters) {
    for (const poster of postersByTheater.get(theater.id) ?? []) {
      if (favMovieIds.has(poster.id)) {
        /* 영화를 직접 관심으로 담았으면 감독보다 우선한다 — 해제도 영화 단위여야 한다 */
        nextSticky.set(poster.id, { type: 'movie', id: poster.id, label: poster.title })
      } else if (!nextSticky.has(poster.id)) {
        const director = (poster.director ?? []).find((d) => favDirectors.has(d))
        if (director) nextSticky.set(poster.id, { type: 'director', id: director, label: director })
      }
      if (!nextSticky.has(poster.id)) continue

      const names = theaterNamesByMovie.get(poster.id) ?? []
      if (!names.includes(theater.name)) names.push(theater.name)
      theaterNamesByMovie.set(poster.id, names)
    }
  }

  const items: FavoriteScreeningItem[] = []
  for (const [movieId, theaterNames] of theaterNamesByMovie) {
    const target = nextSticky.get(movieId)
    if (!target) continue
    items.push({ movieId, target, theaterNames })
  }
  return { items, sticky: nextSticky }
}

/** "1939시네마 외 44곳" — 한 곳이면 이름만 */
export function theaterSummary(names: string[]): string {
  return names.length > 1 ? `${names[0]} 외 ${names.length - 1}곳` : names[0]
}
