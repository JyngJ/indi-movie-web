import type { CurationListRow } from '@/lib/curation/types'
import type { Movie } from '@/types/api'
import { Ghost, Heart, Video, Disc, Leaf, Crown, Award, Trophy, Star, Film, VenetianMask, Building2, Clapperboard, TreePine, Clock } from 'lucide-react'
import type { ReactNode } from 'react'

// ─────────────────────────────────────────────
// 영화 탭 — 큐레이션 리스트 섹션
// ─────────────────────────────────────────────

/** 오늘이 시즌 트리거 범위 안인지 판정 (연말 교차 구간 지원: 12-20 ~ 01-10) */
function isInSeason(trigger: { start: string; end: string } | null): boolean {
  if (!trigger) return true
  const now = new Date()
  const today = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const { start, end } = trigger
  // 연도 내 범위 (예: 07-01 ~ 08-31)
  if (start <= end) return today >= start && today <= end
  // 연도 교차 범위 (예: 12-20 ~ 01-10)
  return today >= start || today <= end
}

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
  emoji: ReactNode
  displayMode: SectionDisplayMode
  description?: string
}

const SECTION_CONFIG: Record<string, SectionConfig> = {
  summer_horror:          { emoji: <Ghost size={24} strokeWidth={2} color="var(--color-primary-base)" />, displayMode: 'genre',   description: '더운 여름, 소름으로 식히는 공포영화 모음' },
  valentine_romance:      { emoji: <Heart size={24} strokeWidth={2} color="var(--color-primary-base)" />, displayMode: 'genre',   description: '사랑이 조금 더 선명해지는 날을 위한 멜로' },
  decade_90s:             { emoji: <Video size={24} strokeWidth={2} color="var(--color-primary-base)" />, displayMode: 'year',    description: 'VHS 화질로 기억되는, 그 시절 스크린의 공기' },
  decade_00s:             { emoji: <Disc size={24} strokeWidth={2} color="var(--color-primary-base)" />, displayMode: 'year',    description: 'DVD로 밤새 돌려보던 2000년대의 걸작들' },
  festival_cannes_palme:  { emoji: <Leaf size={24} strokeWidth={2} color="var(--color-primary-base)" />, displayMode: 'default', description: '칸 영화제 최고의 영예, 황금종려상을 받은 작품들' },
  festival_venice_lion:   { emoji: <Crown size={24} strokeWidth={2} color="var(--color-primary-base)" />, displayMode: 'default', description: '세계에서 가장 오래된 영화제가 선택한 영화들' },
  festival_berlin_bear:   { emoji: <Award size={24} strokeWidth={2} color="var(--color-primary-base)" />, displayMode: 'default', description: '사회와 인간을 향한 시선, 베를린이 품은 작품들' },
  festival_academy_picture: { emoji: <Trophy size={24} strokeWidth={2} color="var(--color-primary-base)" />, displayMode: 'default', description: '그해 가장 많은 이름을 남긴 영화들' },
  critic_park_pyeong_sik: { emoji: <Star size={24} strokeWidth={2} color="var(--color-primary-base)" />, displayMode: 'default', description: '수천 편을 봐온 박평식 평론가가 높이 평가한 작품' },
  critic_lee_dong_jin:    { emoji: <Star size={24} strokeWidth={2} color="var(--color-primary-base)" />, displayMode: 'default', description: '이동진 평론가가 별 다섯 개를 아끼지 않은 영화들' },
  movement_taiwan_new_wave: { emoji: <Film size={24} strokeWidth={2} color="var(--color-primary-base)" />, displayMode: 'default', description: '허우샤오셴, 에드워드 양, 차이밍량이 만든 느린 아름다움' },
  movement_nouvelle_vague:  { emoji: <VenetianMask size={24} strokeWidth={2} color="var(--color-primary-base)" />, displayMode: 'default', description: '카메라를 들고 거리로 나간 젊은 감독들의 반란' },
  movement_hk_art_cinema:   { emoji: <Building2 size={24} strokeWidth={2} color="var(--color-primary-base)" />, displayMode: 'default', description: '왕가위와 동시대 감독들이 담은 홍콩의 밤과 멜랑콜리' },
  collection_masters_debut: { emoji: <Clapperboard size={24} strokeWidth={2} color="var(--color-primary-base)" />, displayMode: 'default', description: '지금의 거장이 처음 카메라를 든 순간' },
  seasonal_christmas:       { emoji: <TreePine size={24} strokeWidth={2} color="var(--color-primary-base)" />, displayMode: 'default', description: '크리스마스의 온도를 가진 영화들 — 따뜻하거나, 쓸쓸하거나' },
  seasonal_yearend:         { emoji: <Clock size={24} strokeWidth={2} color="var(--color-primary-base)" />, displayMode: 'default', description: '한 해가 저물 때 꺼내보고 싶은 위대한 영화들' },
}

export interface CurationSectionData {
  listId: string
  nameKo: string
  emoji: ReactNode
  description?: string
  displayMode: SectionDisplayMode
  movies: Movie[]
}

/** list_id → 렌더 우선순위 그룹 (낮을수록 먼저) */
export const SECTION_GROUP: Record<string, number> = {
  // 시기별
  summer_horror:            1,
  valentine_romance:        1,
  seasonal_christmas:       1,
  seasonal_yearend:         1,
  // 영화제/수상
  collection_masters_debut: 2,
  festival_cannes_palme:    2,
  festival_venice_lion:     2,
  festival_berlin_bear:     2,
  festival_academy_picture: 2,
  // 연도별
  decade_90s:               3,
  decade_00s:               3,
  // 평론가
  critic_park_pyeong_sik:   4,
  critic_lee_dong_jin:      4,
  // 무브먼트
  movement_taiwan_new_wave: 5,
  movement_nouvelle_vague:  5,
  movement_hk_art_cinema:   5,
}

export function getFilmsTabCurationSections(
  movies: Movie[],
  activeMovieIds: ReadonlySet<string>,
  lists: CurationListRow[],
): CurationSectionData[] {
  return lists
    .filter((list) => isInSeason(list.seasonTrigger))
    .map((list) => {
      const config = SECTION_CONFIG[list.listId] ?? { emoji: <Clapperboard size={24} strokeWidth={2} color="var(--color-primary-base)" />, displayMode: 'default' as SectionDisplayMode }
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
