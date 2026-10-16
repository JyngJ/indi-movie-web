import { unstable_cache } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { toKstIsoDate } from '@/lib/date'
import { toSecureImageUrl } from '@/lib/media/imageUrl'
import { getScreeningIndex } from '@/lib/seo/getScreeningIndex'
import type { SimilarCandidate } from './similarNowShowing'

/**
 * 지금 상영 중인 영화의 비교용 정보(장르 포함). 상영 없는 영화 상세가 "비슷한 영화"를 고를 때 쓴다.
 * 상영 목록은 getScreeningIndex(6시간 캐시)를 그대로 쓰고, 장르만 한 번 더 읽어 같은 주기로 캐시한다.
 * 날짜를 캐시 키에 넣어 자정을 넘기면 새로 읽는다.
 */
const getPool = unstable_cache(
  async (_today: string, ids: string[]): Promise<SimilarCandidate[]> => {
    if (ids.length === 0) return []
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from('movies')
      .select('id,title,year,director,nation,genre,poster_url')
      .in('id', ids)
    if (error) throw new Error(`비슷한 영화 후보 조회 실패: ${error.message}`)
    return (data ?? []).map((row) => ({
      id: String(row.id),
      title: String(row.title),
      year: row.year != null ? Number(row.year) : null,
      director: (row.director as string[] | null) ?? [],
      nation: row.nation != null ? String(row.nation) : null,
      genre: (row.genre as string[] | null) ?? [],
      posterUrl: row.poster_url ? toSecureImageUrl(String(row.poster_url)) : null,
    }))
  },
  ['catalog', 'similarity-pool'],
  { revalidate: 21600, tags: ['screening-index'] },
)

export async function getSimilarityPool(): Promise<SimilarCandidate[]> {
  const index = await getScreeningIndex()
  return getPool(toKstIsoDate(new Date()), index.movies.map((m) => m.id).sort())
}
