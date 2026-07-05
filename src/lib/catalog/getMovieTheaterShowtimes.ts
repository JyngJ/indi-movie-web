import type { SupabaseClient } from '@supabase/supabase-js'
import { addDaysIso, toKstIsoDate } from '@/lib/date'
import type { Showtime } from '@/types/api'

export { toKstIsoDate }

export interface MovieTheaterDateGroup {
  date: string
  showtimes: Showtime[]
}

export interface MovieTheaterEntry {
  theaterId: string
  theaterName: string
  theaterAddress: string
  theaterLat: number | null
  theaterLng: number | null
  dateGroups: MovieTheaterDateGroup[]
}

/**
 * 영화 하나의 극장별·날짜별 상영시간표를 조회한다.
 * Supabase 클라이언트를 주입받아 서버(SSR)·클라이언트(React Query) 양쪽에서 재사용한다.
 */
export async function getMovieTheaterShowtimes(
  supabase: SupabaseClient,
  movieId: string,
  range?: { from?: string; until?: string },
): Promise<MovieTheaterEntry[]> {
  const today = toKstIsoDate(new Date())
  const from = range?.from ?? today
  const until = range?.until ?? addDaysIso(today, 13)

  const { data, error } = await supabase
    .from('showtimes')
    .select(`
      id,
      theater_id,
      show_date,
      show_time,
      end_time,
      seat_available,
      seat_total,
      booking_url,
      screen_name,
      theaters (
        id,
        name,
        address,
        lat,
        lng
      )
    `)
    .eq('movie_id', movieId)
    .eq('is_active', true)
    .gte('show_date', from)
    .lte('show_date', until)
    .order('show_date')
    .order('show_time')
    .limit(1000)

  if (error) throw error

  // 극장별로 모으고, 극장 내에서 날짜별로 그룹핑
  const theaterMap = new Map<string, { name: string; address: string; lat: number | null; lng: number | null; byDate: Map<string, Showtime[]> }>()
  for (const r of data ?? []) {
    const th = r.theaters as unknown as { id: string; name: string; address: string; lat: number | string | null; lng: number | string | null } | null
    if (!th) continue

    if (!theaterMap.has(th.id)) {
      const lat = th.lat == null ? null : Number(th.lat)
      const lng = th.lng == null ? null : Number(th.lng)
      theaterMap.set(th.id, {
        name: th.name,
        address: th.address,
        lat: lat != null && Number.isFinite(lat) ? lat : null,
        lng: lng != null && Number.isFinite(lng) ? lng : null,
        byDate: new Map(),
      })
    }
    const entry = theaterMap.get(th.id)!
    if (!entry.byDate.has(r.show_date)) entry.byDate.set(r.show_date, [])
    entry.byDate.get(r.show_date)!.push({
      id: r.id,
      movieId,
      movieTitle: '',
      theaterId: th.id,
      screenName: r.screen_name,
      showDate: r.show_date,
      showTime: r.show_time,
      endTime: r.end_time ?? undefined,
      formatType: 'standard' as const,
      language: 'korean' as const,
      seatAvailable: Number(r.seat_available ?? 0),
      seatTotal: Number(r.seat_total ?? 0),
      price: 0,
      bookingUrl: r.booking_url ?? undefined,
    })
  }

  return Array.from(theaterMap.entries()).map(([theaterId, { name, address, lat, lng, byDate }]) => ({
    theaterId,
    theaterName: name,
    theaterAddress: address,
    theaterLat: lat,
    theaterLng: lng,
    dateGroups: Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, showtimes]) => ({ date, showtimes })),
  }))
}
