import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { toKstIsoDate } from '@/lib/date'
import { getRegionFromCity, REGIONS } from '@/lib/regions'

/**
 * IndexNow — 바뀐 URL을 검색엔진에 직접 통보하는 프로토콜(Bing·Yandex·Naver 등이 지원).
 *
 * 사이트맵은 "언젠가 와서 보라"는 수동 신호라 재크롤링까지 수 주가 걸린다. 상영 시간표는
 * 하루 3번 바뀌는데 그 속도를 따라가지 못한다. IndexNow는 크롤이 끝난 직후 "이 URL들이
 * 바뀌었다"고 밀어넣는다. ChatGPT 검색이 Bing 인덱스를 쓰므로 답변형 AI 노출에도 직결된다.
 *
 * 키는 비밀이 아니다 — 소유 증명용이라 `https://<host>/<key>.txt`에 같은 값이 공개돼 있어야
 * 한다(public/<key>.txt). 그래서 저장소에 그대로 둔다.
 *
 * Clean Architecture: 조회(인프라)와 통보(외부 어댑터)만 담당하고 UI를 모른다.
 */

export const INDEXNOW_KEY = '4ca4b2866689dc3704fd574a223661f2'

const ENDPOINT = 'https://api.indexnow.org/indexnow'

/** 퓨니코드 — 한글 도메인 원문을 그대로 보내면 일부 엔드포인트가 거부한다(sitemap과 같은 이유) */
const DEFAULT_HOST = 'www.xn--hq1bv8o5phw2d7wt.com'

function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL
  if (!raw) return `https://${DEFAULT_HOST}`
  try {
    return new URL(raw).origin
  } catch {
    return `https://${DEFAULT_HOST}`
  }
}

/**
 * 이번 수집으로 내용이 달라졌을 가능성이 있는 URL 목록.
 *
 * 감독 페이지 1,000여 개를 매번 통째로 밀면 실제로 안 바뀐 URL이 대부분이라 신호가 탁해진다.
 * "지금 상영 중인 것"과 직접 엮인 페이지만 고른다.
 */
export async function buildChangedUrls(): Promise<string[]> {
  const origin = siteOrigin()
  const supabase = createSupabaseAdminClient()
  const today = toKstIsoDate(new Date())
  const end = new Date(`${today}T00:00:00+09:00`)
  end.setDate(end.getDate() + 13)
  const endDate = toKstIsoDate(end)

  const { data: rows } = await supabase
    .from('showtimes')
    .select('theater_id,movie_id,theaters(city),movies(director)')
    .eq('is_active', true)
    .gte('show_date', today)
    .lte('show_date', endDate)
    .limit(5000)

  const theaterIds = new Set<string>()
  const movieIds = new Set<string>()
  const directors = new Set<string>()
  const regions = new Set<string>()

  for (const row of rows ?? []) {
    if (row.theater_id) theaterIds.add(String(row.theater_id))
    if (row.movie_id) movieIds.add(String(row.movie_id))

    const theater = row.theaters as unknown as { city?: string } | null
    if (theater?.city) regions.add(getRegionFromCity(String(theater.city)))

    const movie = row.movies as unknown as { director?: string[] | null } | null
    for (const d of movie?.director ?? []) if (d) directors.add(d)
  }

  const knownRegions = new Set(REGIONS.map((r) => r.id))

  return [
    `${origin}/`,
    `${origin}/map`,
    ...[...regions].filter((r) => knownRegions.has(r)).map((r) => `${origin}/films/area/${encodeURIComponent(r)}`),
    ...[...theaterIds].map((id) => `${origin}/films/theater/${id}`),
    ...[...movieIds].map((id) => `${origin}/movie/${id}`),
    ...[...directors].map((d) => `${origin}/films/director/${encodeURIComponent(d)}`),
  ]
}

export interface IndexNowResult {
  submitted: number
  status: number
  ok: boolean
}

/** IndexNow 엔드포인트에 통보. 한 번에 10,000개까지 허용된다. */
export async function submitToIndexNow(urls: string[]): Promise<IndexNowResult> {
  if (urls.length === 0) return { submitted: 0, status: 0, ok: true }

  const origin = siteOrigin()
  const host = new URL(origin).host
  const urlList = urls.slice(0, 10_000)

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host,
      key: INDEXNOW_KEY,
      keyLocation: `${origin}/${INDEXNOW_KEY}.txt`,
      urlList,
    }),
  })

  // 200 = 접수, 202 = 접수됐지만 키 검증 대기. 둘 다 정상이다.
  return { submitted: urlList.length, status: res.status, ok: res.status === 200 || res.status === 202 }
}
