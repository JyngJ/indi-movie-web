import type { CrawledShowtimeCandidate } from '@/types/admin'
import type { ParseContext } from './utils'
import { buildCandidate, crawlerHeaders, dedupeCandidates, DEFAULT_SEAT_TOTAL, withRetry } from './utils'

// Extended GV keyword regex — includes "컨버세이션" (시네마다방 고유 GV 프로그램명)
const GV_RE =
  /관객과의\s*대화|\bGV\b|guest\s*visit|시네토크|씨네토크|메가토크|라이브러리톡|시네마톡|무비토크|마스터클래스|스페셜클래스|특강|무대인사|(?:감독|배우|출연진)(님)?과의\s*(?:대화|만남|토크)|특별상영|스페셜\s*상영|영특한\s*대화|컨버세이션|토크콘서트|북토크/i

interface TinyTicketRow {
  showDate: string
  showTime: string
  endTime: string
  movieTitle: string
  venue: string
  seatAvailable: number
  seatTotal: number
}

// TinyTicket SSR HTML structure (observed 2026-06):
//   <div class="dateLabel">MM/DD 요일</div>
//   ...
//   <button>...radio_button_checked</span>TITLE schedule HH:MM-HH:MM (잔여N/M) VENUE</button>
//   ...
function parseTinyTicketHtml(html: string, year: number): TinyTicketRow[] {
  const rows: TinyTicketRow[] = []

  for (const part of html.split('<div class="dateLabel">').slice(1)) {
    const dateMatch = part.match(/^(\d{2})\/(\d{2})\s+(?:일|월|화|수|목|금|토)요일<\/div>/)
    if (!dateMatch) continue
    const showDate = `${year}-${dateMatch[1]}-${dateMatch[2]}`

    const btnRe = /radio_button_checked<\/span>([\s\S]*?)<\/button>/g
    let m: RegExpExecArray | null
    while ((m = btnRe.exec(part)) !== null) {
      const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const rowM = text.match(
        /^(.+?)\s+schedule\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s*(?:\(잔여(\d+)\/(\d+)\))?\s*(.*)$/,
      )
      if (!rowM) continue

      const [, rawTitle, startTime, endTime, remainStr, totalStr, venue] = rowM
      rows.push({
        showDate,
        showTime: startTime.padStart(5, '0'),
        endTime: endTime.padStart(5, '0'),
        movieTitle: rawTitle.trim(),
        venue: venue.trim(),
        seatAvailable: remainStr ? parseInt(remainStr, 10) : -1,
        seatTotal: totalStr ? parseInt(totalStr, 10) : -1,
      })
    }
  }

  return rows
}

function rowsToCandidate(
  context: ParseContext,
  row: TinyTicketRow,
): CrawledShowtimeCandidate {
  const isGv = GV_RE.test(row.venue) || GV_RE.test(row.movieTitle)
  // GV·강연은 영화가 아닌 행사가 섞여 있어 검수로 남긴다. 잔여석 표기가 없는 건 회차 정체와 무관하니 경고로 두지 않는다
  const warnings: string[] = isGv ? [`GV: ${row.venue}`] : []
  const hasSeats = row.seatAvailable >= 0 && row.seatTotal > 0

  return buildCandidate({
    context,
    movieTitle: row.movieTitle,
    showDate: row.showDate,
    showTime: row.showTime,
    endTime: row.endTime,
    screenName: '상영관',
    formatText: '',
    seatAvailable: hasSeats ? row.seatAvailable : DEFAULT_SEAT_TOTAL,
    seatTotal: hasSeats ? row.seatTotal : DEFAULT_SEAT_TOTAL,
    price: 0,
    bookingUrl: context.source.listingUrl,
    rawText: JSON.stringify(row),
    // 자동 승인 문턱이 0.9다. 0.85로 두었더니 2026-05 연결 이후 tinyticket 극장 5곳의 회차가
    // 영화·극장 매칭을 다 마치고도 한 건도 승인되지 않아 극장 페이지가 내내 비어 있었다(2026-11).
    confidence: warnings.length ? 0.82 : 0.93,
    warnings,
  })
}

async function fetchSsrHtml(url: string): Promise<string> {
  return withRetry(async () => {
    const res = await fetch(url, {
      // 2026-09-18 실측: 브라우저 UA에는 820B 빈 껍데기를, 신원을 밝힌 UA에는 시간표가 든 44KB를 준다
      headers: crawlerHeaders({ accept: 'text/html,*/*' }),
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) throw new Error(`TinyTicket fetch failed: HTTP ${res.status}`)
    return res.text()
  }, { label: 'TinyTicket 페이지 요청' })
}

async function crawlTinyticketCsr(url: string, year: number): Promise<TinyTicketRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { chromium } = await import(/* webpackIgnore: true */ 'playwright-chromium' as any)
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 })
    const html: string = await page.content()
    await browser.close()
    return parseTinyTicketHtml(html, year)
  } catch (err) {
    await browser.close().catch(() => {})
    throw err
  }
}

export async function crawlTinyticketEventManager(
  context: ParseContext,
): Promise<CrawledShowtimeCandidate[]> {
  const now = new Date()
  const year = now.getFullYear()
  const today = now.toISOString().slice(0, 10)

  const html = await fetchSsrHtml(context.source.listingUrl)

  // SSR theaters embed schedule data inline; CSR theaters (e.g. 인천미림) require Playwright
  const rows = html.includes('radio_button_checked')
    ? parseTinyTicketHtml(html, year)
    : await crawlTinyticketCsr(context.source.listingUrl, year)

  return dedupeCandidates(
    rows
      .filter(row => row.showDate >= today)
      .map(row => rowsToCandidate(context, row)),
  )
}
