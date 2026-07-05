/**
 * 영화 탭 큐레이션 — Phase 0 측정 스크립트 (1회성)
 * 사용법: npx tsx --env-file=.env.local src/scripts/measure-films-tab-curation.ts
 *
 * curation_list 각 항목 × 지역(REGIONS)별로
 * (리스트 멤버 ∩ 라이브 상영작) 교집합 편수를 표로 출력한다.
 * docs/FILMS_TAB_PLAN.md §5 Phase 0 참고.
 */

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isCurationListMember } from '@/lib/curation/filmsTabLists'
import type { CurationListRow } from '@/lib/curation/types'
import { REGIONS, getRegionFromCity } from '@/lib/regions'
import { formatLocalDate } from '@/lib/date'
import type { Movie } from '@/types/api'

async function main() {
  const supabase = createSupabaseAdminClient()

  const { data: listRows, error: listError } = await supabase
    .from('curation_list')
    .select('list_id, name_ko, type, query, member_ids, priority_tier, season_trigger, min_n')
  if (listError) throw listError

  const lists: CurationListRow[] = (listRows ?? []).map((r) => ({
    listId: r.list_id,
    nameKo: r.name_ko,
    type: r.type,
    query: r.query,
    memberIds: r.member_ids,
    priorityTier: r.priority_tier,
    seasonTrigger: r.season_trigger,
    minN: r.min_n,
  }))

  const { data: movieRows, error: movieError } = await supabase
    .from('movies')
    .select('id, title, year, genre, director')
  if (movieError) throw movieError

  const movies: Movie[] = (movieRows ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    year: m.year,
    genre: m.genre ?? [],
    director: m.director ?? [],
  }))

  const today = formatLocalDate(new Date())
  const { data: showtimeRows, error: showtimeError } = await supabase
    .from('showtimes')
    .select('movie_id, theaters(city)')
    .eq('is_active', true)
    .gte('show_date', today)
    .limit(20000)
  if (showtimeError) throw showtimeError

  // 영화ID → 상영 중인 지역 집합
  const regionsByMovieId = new Map<string, Set<string>>()
  for (const row of showtimeRows ?? []) {
    const movieId = String(row.movie_id)
    const city = (row.theaters as { city?: string } | null)?.city
    if (!city) continue
    const region = getRegionFromCity(city)
    if (!regionsByMovieId.has(movieId)) regionsByMovieId.set(movieId, new Set())
    regionsByMovieId.get(movieId)!.add(region)
  }
  const allActiveMovieIds = new Set(regionsByMovieId.keys())

  const regionIds = ['전국', ...REGIONS.map((r) => r.id)]

  console.log(`측정일: ${today}, 전체 영화: ${movies.length}편, 라이브 상영작: ${allActiveMovieIds.size}편\n`)

  const header = ['list_id', ...regionIds]
  console.log(header.join('\t'))

  for (const list of lists) {
    const members = movies.filter((m) => isCurationListMember(m, list))

    const row = regionIds.map((regionId) => {
      const count = members.filter((m) => {
        if (regionId === '전국') return allActiveMovieIds.has(m.id)
        return regionsByMovieId.get(m.id)?.has(regionId) ?? false
      }).length
      return String(count)
    })

    console.log([list.listId, ...row].join('\t'))
  }
}

main()
