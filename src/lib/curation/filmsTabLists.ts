import type { Movie } from '@/types/api'

// ─────────────────────────────────────────────
// 영화 탭 — 큐레이션 리스트 섹션 (구현 1: 하드코딩 목록, 임계값 없음)
// docs/FILMS_TAB_PLAN.md §6, §10 "구현 1" 참고
// ─────────────────────────────────────────────

export interface CurationListDef {
  listId: string
  nameKo: string
  /** Movie가 이 리스트의 멤버인지 판정 */
  matches: (movie: Movie) => boolean
}

function hasAnyGenre(movie: Movie, genres: string[]) {
  return genres.some((g) => movie.genre.includes(g))
}

function inYearRange(movie: Movie, start: number, end: number) {
  return movie.year >= start && movie.year <= end
}

export const FILMS_TAB_CURATION_LISTS: CurationListDef[] = [
  {
    listId: 'summer_horror',
    nameKo: '여름엔 역시 공포',
    matches: (movie) => hasAnyGenre(movie, ['공포', '공포(호러)']),
  },
  {
    listId: 'valentine_romance',
    nameKo: '발렌타인엔 멜로',
    matches: (movie) => hasAnyGenre(movie, ['멜로/로맨스', '멜로드라마']),
  },
  {
    listId: 'decade_90s',
    nameKo: '90년대 영화',
    matches: (movie) => inYearRange(movie, 1990, 1999),
  },
  {
    listId: 'decade_00s',
    nameKo: '2000년대 영화',
    matches: (movie) => inYearRange(movie, 2000, 2009),
  },
]

export interface CurationSectionData {
  listId: string
  nameKo: string
  movies: Movie[]
}

/** 구현 1: 멤버가 1편 이상이면 무조건 노출 (교집합 N 임계값 없음) */
export function getFilmsTabCurationSections(movies: Movie[]): CurationSectionData[] {
  return FILMS_TAB_CURATION_LISTS
    .map((list) => ({
      listId: list.listId,
      nameKo: list.nameKo,
      movies: movies.filter(list.matches),
    }))
    .filter((section) => section.movies.length > 0)
}
