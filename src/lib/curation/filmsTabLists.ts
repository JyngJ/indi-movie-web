import type { CurationListRow } from '@/lib/curation/types'
import type { Movie } from '@/types/api'

// ─────────────────────────────────────────────
// 영화 탭 — 큐레이션 리스트 섹션
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

export type SectionDisplayMode = 'year' | 'genre' | 'default'

interface SectionConfig {
  emoji: string
  displayMode: SectionDisplayMode
  description?: string
}

const SECTION_CONFIG: Record<string, SectionConfig> = {
  summer_horror:          { emoji: '👻', displayMode: 'genre',   description: '더운 여름, 소름으로 식히는 공포영화 모음' },
  valentine_romance:      { emoji: '💕', displayMode: 'genre',   description: '사랑이 조금 더 선명해지는 날을 위한 멜로' },
  decade_90s:             { emoji: '📼', displayMode: 'year',    description: 'VHS 화질로 기억되는, 그 시절 스크린의 공기' },
  decade_00s:             { emoji: '💿', displayMode: 'year',    description: 'DVD로 밤새 돌려보던 2000년대의 걸작들' },
  festival_cannes_palme:  { emoji: '🌿', displayMode: 'default', description: '칸 영화제 최고의 영예, 황금종려상을 받은 작품들' },
  festival_venice_lion:   { emoji: '🦁', displayMode: 'default', description: '세계에서 가장 오래된 영화제가 선택한 영화들' },
  festival_berlin_bear:   { emoji: '🐻', displayMode: 'default', description: '사회와 인간을 향한 시선, 베를린이 품은 작품들' },
  festival_academy_picture: { emoji: '🏆', displayMode: 'default', description: '그해 가장 많은 이름을 남긴 영화들' },
  critic_park_pyeong_sik: { emoji: '⭐', displayMode: 'default', description: '수천 편을 봐온 박평식 평론가가 높이 평가한 작품' },
  critic_lee_dong_jin:    { emoji: '⭐', displayMode: 'default', description: '이동진 평론가가 별 다섯 개를 아끼지 않은 영화들' },
  movement_taiwan_new_wave: { emoji: '🎞️', displayMode: 'default', description: '허우샤오셴, 에드워드 양, 차이밍량이 만든 느린 아름다움' },
  movement_nouvelle_vague:  { emoji: '🎭', displayMode: 'default', description: '카메라를 들고 거리로 나간 젊은 감독들의 반란' },
  movement_hk_art_cinema:   { emoji: '🌃', displayMode: 'default', description: '왕가위와 동시대 감독들이 담은 홍콩의 밤과 멜랑콜리' },
  collection_masters_debut: { emoji: '🎬', displayMode: 'default', description: '지금의 거장이 처음 카메라를 든 순간' },
}

export interface CurationSectionData {
  listId: string
  nameKo: string
  emoji: string
  description?: string
  displayMode: SectionDisplayMode
  movies: Movie[]
}

export function getFilmsTabCurationSections(
  movies: Movie[],
  activeMovieIds: ReadonlySet<string>,
  lists: CurationListRow[],
): CurationSectionData[] {
  return lists.map((list) => {
    const config = SECTION_CONFIG[list.listId] ?? { emoji: '🎬', displayMode: 'default' as SectionDisplayMode }
    return {
      listId: list.listId,
      nameKo: list.nameKo,
      emoji: config.emoji,
      description: config.description,
      displayMode: config.displayMode,
      movies: movies.filter((movie) => isCurationListMember(movie, list) && activeMovieIds.has(movie.id)),
    }
  })
}
