import { unstable_cache } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { toKstIsoDate } from '@/lib/date'

/**
 * 감독 페이지의 검색엔진·LLM용 본문 데이터 (SSR 전용).
 *
 * `/films/director/[name]`은 sitemap에 1,000개 넘게 실려 있으면서도 서버 HTML엔
 * "데이터 불러오는 중…" 37자만 남았다 — 목록·상영정보를 전부 클라이언트에서 받기 때문.
 * 검색엔진과 답변형 AI(ChatGPT·Perplexity 등)는 그 빈 HTML을 읽고 인용할 게 없다고 판단한다.
 * "OO 감독 영화 지금 어디서 봐요?"가 정확히 이 페이지가 답해야 할 질문이라 손실이 크다.
 *
 * Clean Architecture: 순수 조회만 담당하고 UI를 모른다. (getScreeningIndex와 같은 역할)
 */

export interface DirectorFilm {
  id: string
  title: string
  year: number | null
  /** 이 감독 외 공동연출자 표기용 */
  director: string[]
}

export interface DirectorScreening {
  movieId: string
  movieTitle: string
  theaterId: string
  theaterName: string
  theaterCity: string
  /** YYYY-MM-DD */
  date: string
}

export interface DirectorScreenings {
  /** KST 기준 조회일 */
  date: string
  /** 이 감독의 전체 작품 (연도 내림차순) */
  films: DirectorFilm[]
  /** 오늘부터 조회 범위 안에 상영이 잡힌 것만 */
  screenings: DirectorScreening[]
}

/** 상영 예정 조회 범위 — 극장 시트 날짜바와 같은 2주 */
const WINDOW_DAYS = 14

/**
 * 6시간. 감독 페이지는 1,000개가 넘어 재생성마다 Supabase를 치면 egress가 튄다.
 * 크롤러가 읽을 텍스트라 몇 시간 지연은 무해하다. (area 페이지와 같은 판단)
 */
const TTL = 21600

const getDirectorScreeningsFor = unstable_cache(
  async (directorName: string, today: string): Promise<DirectorScreenings> => {
    const supabase = createSupabaseServerClient()

    const { data: movieRows } = await supabase
      .from('movies')
      .select('id,title,year,director')
      // director는 text[] — 배열 포함 검색
      .contains('director', [directorName])
      .order('year', { ascending: false })
      .limit(200)

    const films: DirectorFilm[] = (movieRows ?? []).map((m) => ({
      id: String(m.id),
      title: String(m.title),
      year: m.year === null || m.year === undefined ? null : Number(m.year),
      director: (m.director as string[] | null) ?? [],
    }))

    if (films.length === 0) {
      return { date: today, films: [], screenings: [] }
    }

    const end = new Date(`${today}T00:00:00+09:00`)
    end.setDate(end.getDate() + WINDOW_DAYS - 1)
    const endDate = toKstIsoDate(end)

    const { data: showtimeRows } = await supabase
      .from('showtimes')
      .select('movie_id,show_date,theaters(id,name,city)')
      .in('movie_id', films.map((f) => f.id))
      .eq('is_active', true)
      .gte('show_date', today)
      .lte('show_date', endDate)
      .order('show_date')
      .limit(500)

    const titleById = new Map(films.map((f) => [f.id, f.title]))
    /* 같은 영화·극장·날짜의 여러 회차는 한 줄로 접는다 — 본문은 "어디서 볼 수 있나"만 답하면 된다 */
    const seen = new Set<string>()
    const screenings: DirectorScreening[] = []

    for (const row of showtimeRows ?? []) {
      const theater = row.theaters as unknown as { id?: string; name?: string; city?: string } | null
      if (!theater?.id || !theater.name) continue

      const movieId = String(row.movie_id)
      const date = String(row.show_date)
      const key = `${movieId}|${theater.id}|${date}`
      if (seen.has(key)) continue
      seen.add(key)

      screenings.push({
        movieId,
        movieTitle: titleById.get(movieId) ?? '',
        theaterId: String(theater.id),
        theaterName: String(theater.name),
        theaterCity: String(theater.city ?? ''),
        date,
      })
    }

    return { date: today, films, screenings }
  },
  ['seo', 'director-screenings'],
  { revalidate: TTL, tags: ['director-screenings'] },
)

/** 감독의 작품 목록 + 앞으로 2주 상영 예정 */
export function getDirectorScreenings(directorName: string): Promise<DirectorScreenings> {
  return getDirectorScreeningsFor(directorName, toKstIsoDate(new Date()))
}
