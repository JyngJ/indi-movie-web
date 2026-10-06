import type { CrawledShowtimeCandidate } from '@/types/admin'
import type { ParseContext } from './utils'
import { buildCandidate, crawlerHeaders, decodeHtmlEntity, dedupeCandidates } from './utils'

/* HD아트센터(hd-artscenter.co.kr) — 날짜별 목록 HTML에 제목·상영관·회차가 텍스트로 있다.
 * 예전엔 screenshotOcr로 읽어 "타짜:벨제붑의 노래"가 "타짜:짬제불의 노래"처럼 깨졌다(2026-10). */

const DAYS_AHEAD = 7

export interface HdArtsCenterShowtime {
  movieTitle: string
  movieCode?: string
  screenName: string
  showTime: string
  soldOut: boolean
  /** "잔여: 164석" — 예매 가능한 회차에만 찍힌다 */
  seatAvailable?: number
}

function stripTags(value: string) {
  return decodeHtmlEntity(value.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
}

/** list.do 한 날짜 페이지에서 회차를 뽑는다 */
export function parseHdArtsCenterList(html: string): HdArtsCenterShowtime[] {
  const listStart = html.indexOf('<ul class="movie_list">')
  if (listStart < 0) return []
  const showtimes: HdArtsCenterShowtime[] = []

  for (const movieBlock of html.slice(listStart).split(/<li>\s*<div class="thum">/).slice(1)) {
    const titleMatch = movieBlock.match(/<h3 class="tit">\s*<a[^>]*goDetail\('[^']*',\s*'([^']*)'[^>]*>([\s\S]*?)<\/a>/)
    if (!titleMatch) continue
    const movieCode = titleMatch[1] || undefined
    const movieTitle = stripTags(titleMatch[2])
    if (!movieTitle) continue

    const timewrap = movieBlock.split('<div class="timewrap">')[1] ?? ''
    for (const screenBlock of timewrap.split(/<li>\s*<strong>/).slice(1)) {
      // 시네마1·2관은 snm1·snm2, 공연장은 bplace·splace 클래스를 쓴다
      const screenMatch = screenBlock.match(/^\s*<span class="[^"]*">([^<]+)<\/span>/)
      const screenName = screenMatch ? stripTags(screenMatch[1]) : '상영관'
      for (const seatBlock of screenBlock.split(/<li class="seat\b/).slice(1)) {
        const timeMatch = seatBlock.match(/<button[^>]*>\s*(\d{1,2}:\d{2})\s*<\/button>/)
        if (!timeMatch) continue
        const seatMatch = seatBlock.match(/잔여:\s*<span[^>]*>(\d+)<\/span>/)
        showtimes.push({
          movieTitle,
          movieCode,
          screenName,
          showTime: timeMatch[1].padStart(5, '0'),
          soldOut: /<span>\s*매진\s*<\/span>/.test(seatBlock),
          seatAvailable: seatMatch ? Number(seatMatch[1]) : undefined,
        })
      }
    }
  }
  return showtimes
}

function kstDate(offsetDays: number) {
  const date = new Date(Date.now() + 9 * 3600_000 + offsetDays * 86_400_000)
  return date.toISOString().slice(0, 10)
}

export async function crawlHdArtsCenter(context: ParseContext): Promise<CrawledShowtimeCandidate[]> {
  const listingUrl = context.source.listingUrl
  const candidates: CrawledShowtimeCandidate[] = []

  // 날짜별 요청은 순차로 — 작은 극장 서버에 몰아 보내지 않는다
  for (let offset = 0; offset < DAYS_AHEAD; offset++) {
    const showDate = kstDate(offset)
    const url = new URL(listingUrl)
    url.searchParams.set('searchDate', showDate.replaceAll('-', ''))
    const res = await fetch(url, {
      headers: crawlerHeaders({ accept: 'text/html,*/*' }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`HD아트센터 fetch 실패: HTTP ${res.status}`)

    for (const st of parseHdArtsCenterList(await res.text())) {
      candidates.push(buildCandidate({
        context,
        movieTitle: st.movieTitle,
        showDate,
        showTime: st.showTime,
        screenName: st.screenName,
        formatText: st.movieTitle,
        seatAvailable: st.seatAvailable ?? 0,
        seatTotal: 0,
        price: 0,
        bookingUrl: url.toString(),
        rawText: JSON.stringify({ ...st, showDate }),
        confidence: st.soldOut ? 0.82 : 0.95,
        warnings: st.soldOut ? ['매진'] : [],
      }))
    }
  }

  return dedupeCandidates(candidates)
}
