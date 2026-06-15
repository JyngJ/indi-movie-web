import type { CurationListRow } from '@/lib/curation/types'
import type { Movie } from '@/types/api'

// ─────────────────────────────────────────────
// 영화 탭 — 큐레이션 리스트 섹션 (구현 2: curation_list 테이블 + 라이브 상영작 교집합)
// docs/FILMS_TAB_PLAN.md §6, §10 "구현 2" 참고
// ─────────────────────────────────────────────

function hasAnyGenre(movie: Movie, genres: string[]) {
  return genres.some((g) => movie.genre.includes(g))
}

function inYearRange(movie: Movie, range: [number, number]) {
  return movie.year >= range[0] && movie.year <= range[1]
}

/** 영화가 해당 큐레이션 리스트의 멤버인지 판정 (dynamic: query 기반, static: member_ids 기반) */
export function isCurationListMember(movie: Movie, list: CurationListRow): boolean {
  if (list.type === 'static') {
    return list.memberIds?.includes(movie.id) ?? false
  }

  const query = list.query
  if (!query) return false
  if (query.genre && hasAnyGenre(movie, query.genre)) return true
  if (query.yearRange && inYearRange(movie, query.yearRange)) return true
  return false
}

export interface CurationSectionData {
  listId: string
  nameKo: string
  /** 리스트 멤버 ∩ 현재 라이브 상영작 (지역 필터는 이후 단계에서 추가) */
  movies: Movie[]
}

/**
 * 구현 2: 리스트 멤버와 현재 라이브 상영작(activeMovieIds)의 교집합을 구한다.
 * 교집합 N 임계값 없음 — 교집합이 0편이어도 섹션은 그대로 노출(쿼리 정확성 확인용).
 */
export function getFilmsTabCurationSections(
  movies: Movie[],
  activeMovieIds: ReadonlySet<string>,
  lists: CurationListRow[],
): CurationSectionData[] {
  return lists
    .map((list) => ({
      listId: list.listId,
      nameKo: list.nameKo,
      movies: movies.filter((movie) => isCurationListMember(movie, list) && activeMovieIds.has(movie.id)),
    }))
}
