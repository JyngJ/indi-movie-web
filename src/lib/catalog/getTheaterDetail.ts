import { unstable_cache } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { safeUrl } from '@/lib/seo/safeUrl'
import { toKstIsoDate } from '@/lib/date'
import type { Theater } from '@/types/api'

/**
 * 극장 상세 조회 — 단일 진입점. (영화 쪽 `getMovieDetail`과 같은 이유로 통합)
 *
 * `/theater/[id]`와 `/films/theater/[id]`가 같은 쿼리·매핑을 각자 복붙해 갖고 있었고
 * 둘 다 generateMetadata·페이지 컴포넌트에서 한 번씩, 방문당 2번씩 Supabase를 쳤다.
 */
const THEATER_SELECT =
  'id,name,lat,lng,address,city,phone,website,instagram_url,screen_count,seat_count,parking,restaurant,accessibility,rating,created_at,updated_at'

const THEATER_TTL = 3600
/**
 * 메타 description 문구용이라 1시간 지연은 무해하다. 더 짧게 잡으면 안 되는 이유:
 * Next는 페이지의 ISR 주기를 그 안에서 쓰인 캐시들의 최솟값으로 낮춘다 —
 * 300으로 두면 `/theater/[id]` 160여 페이지가 1시간이 아니라 5분마다 재생성된다.
 */
const TODAY_TITLES_TTL = 3600

export const getTheaterDetail = unstable_cache(
  async (id: string): Promise<Theater | null> => {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase
      .from('theaters')
      .select(THEATER_SELECT)
      .eq('id', id)
      .single()

    if (!data) return null

    return {
      id: data.id,
      name: data.name,
      lat: Number(data.lat),
      lng: Number(data.lng),
      address: data.address,
      city: data.city,
      phone: data.phone ?? undefined,
      website: safeUrl(data.website),
      instagramUrl: safeUrl(data.instagram_url),
      screenCount: data.screen_count,
      seatCount: data.seat_count ?? undefined,
      amenities: {
        parking: data.parking,
        restaurant: data.restaurant,
        accessibility: data.accessibility,
      },
      rating: data.rating ?? undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  },
  ['catalog', 'theater-detail'],
  { revalidate: THEATER_TTL, tags: ['theater-detail'] },
)

/**
 * 날짜를 인자로 받아 캐시 키에 날짜가 들어가게 한다 — 안 그러면 자정을 넘겨도
 * TTL이 남아 있는 동안 전날 상영작이 그대로 나온다.
 */
const getTodayMovieTitlesFor = unstable_cache(
  async (theaterId: string, date: string): Promise<string[]> => {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase
      .from('showtimes')
      .select('movie_id, movies(title)')
      .eq('theater_id', theaterId)
      .eq('is_active', true)
      .eq('show_date', date)
      .order('show_time', { ascending: true })
      .limit(20)

    const titles: string[] = []
    for (const row of data ?? []) {
      const movie = row.movies as unknown as { title?: string } | null
      if (movie?.title && !titles.includes(movie.title)) titles.push(movie.title)
      if (titles.length >= 3) break
    }
    return titles
  },
  ['catalog', 'theater-today-titles'],
  { revalidate: TODAY_TITLES_TTL, tags: ['theater-today-titles'] },
)

/** 오늘(KST) 상영 중인 영화 제목 최대 3개 — 메타 description용 */
export function getTheaterTodayMovieTitles(theaterId: string): Promise<string[]> {
  return getTodayMovieTitlesFor(theaterId, toKstIsoDate(new Date()))
}
